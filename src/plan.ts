import { measure } from '@toba/map';
import { removeItem, forEach } from '@toba/tools';
import { Node, Point, Status, Tile } from './types';
import { Graph } from './graph';
import { Restrictions } from './restriction';
import { nextToLast } from './sequence';
import { tiles } from './tile';
import { RouteResult } from './route';

/** An optional route plan. */
export interface Option {
   /** Sequence of node IDs meant to connect with `endNode` */
   nodes: number[];
   /** Cost of connecting start and end nodes based on road type weighting */
   cost: number;
   heuristicCost: number;
   /**
    * IDs of nodes that *must* be traversed in this plan, derived from `only_*`
    * OSM relations
    */
   required: number[];
   endNode: number;
}

/**
 * Route planner.
 */
export class Plan {
   graph: Graph;
   rules: Restrictions;
   nodes: Map<number, Node>;
   /** Optional route plans sorted by cost */
   options: Option[];
   /** Node IDs that have been processed and shouldn't be considered again */
   closed: Set<number>;

   closeNode = true;
   endNode: number;
   /** Latitude/longitude of target route node */
   endPoint: Point;
   /** Method to call when new tile data are loaded */
   onLoad?: (t: Tile) => void;

   constructor(
      nodes: Map<number, Node>,
      graph: Graph,
      rules: Restrictions,
      onLoad?: (t: Tile) => void
   ) {
      this.graph = graph;
      this.rules = rules;
      this.nodes = nodes;
      this.onLoad = onLoad;
   }

   /**
    * Validate start and end points then create initial route options for
    * every node connected to the start point.
    *
    * OSM data for linked nodes will be downloaded if not already cached.
    *
    * Start and end nodes should always exist after having been identified with
    * `route.nearestNode()` since that method adds to the graph as needed.
    *
    * @returns Whether start and end points are valid
    */
   async prepare(startNode: number, endNode: number): Promise<boolean> {
      this.graph.ensure(startNode);

      if (startNode == endNode) {
         return false;
      }
      this.options = [];
      this.closed = new Set([startNode]);
      this.closeNode = true;
      this.endNode = endNode;
      this.endPoint = this.nodes.get(endNode)!.point();

      return Promise.all(
         this.graph.map(startNode, (weight, linkedNode) =>
            this.add(
               startNode,
               linkedNode,
               {
                  cost: 0,
                  heuristicCost: 0,
                  nodes: [startNode],
                  required: [],
                  endNode: 0
               },
               weight
            )
         )
      ).then(() => true);
   }

   get length() {
      return this.options.length;
   }

   /**
    * Find lowest cost option to reach end node within maximum iterations.
    */
   async find(max: number): Promise<RouteResult> {
      let count = 0;

      while (count < max) {
         if (this.length == 0) {
            // exhausted options without finding way to end
            return { status: Status.NoRoute };
         }
         count++;
         this.closeNode = true;

         const option = this.options.pop()!;
         const optionEnd = option.endNode;

         if (this.closed.has(optionEnd)) {
            // node was already considered
            continue;
         }

         if (optionEnd == this.endNode) {
            return { status: Status.Success, nodes: option.nodes };
         }

         if (option.required.length > 0) {
            // traverse mandatory turns
            this.closeNode = false;
            /** Next required node */
            const tryNode = option.required.shift()!;

            if (this.graph.has(tryNode) && this.graph.has(optionEnd, tryNode)) {
               // TODO: any way without loop await?
               // eslint-disable-next-line
               await this.add(
                  optionEnd,
                  tryNode,
                  option,
                  this.graph.weight(optionEnd, tryNode)
               );
            }
         } else if (this.graph.has(optionEnd)) {
            // eslint-disable-next-line
            await Promise.all(
               this.graph.map(optionEnd, async (weight, nextNode) => {
                  if (!this.closed.has(nextNode)) {
                     // eslint-disable-next-line
                     return this.add(optionEnd, nextNode, option, weight);
                  }
               })
            );
         }

         if (this.closeNode) {
            this.closed.add(optionEnd);
         }
      }

      return { status: Status.GaveUp };
   }

   /**
    * Whether nodes with IDs have been cached.
    */
   hasNodes = (...nodes: number[]): boolean =>
      nodes.findIndex(n => !this.nodes.has(n)) == -1;

   /**
    * Add routing option.
    */
   async add(fromNode: number, toNode: number, option: Option, weight = 1) {
      if (
         weight == 0 ||
         !this.hasNodes(toNode, fromNode) ||
         nextToLast(option.nodes) == toNode
      ) {
         // ignore non-traversible route (weight 0), missing nodes and
         // reversal at node (i.e. a->b->a)
         return;
      }

      option.nodes.push(toNode);

      if (this.rules.forbids(option.nodes)) {
         this.closeNode = false;
         return;
      }

      const toPoint = this.nodes.get(toNode)!.point();
      const fromPoint = this.nodes.get(fromNode)!.point();

      option.cost += measure.distanceLatLon(fromPoint, toPoint) / weight;
      option.heuristicCost =
         option.cost + measure.distanceLatLon(toPoint, this.endPoint);

      // check if an option to reach the end point already exists
      const optionToEnd = this.options.find(p => p.endNode == toNode);

      if (optionToEnd !== undefined) {
         if (optionToEnd.cost < option.cost) {
            // if an option to reach the end exists and is a lower cost then the
            // option being considered then discard considered option
            return;
         }
         // if the existing option to reach the end has a higher cost then
         // remove it and continue with the cheaper option
         this.remove(optionToEnd);
      }

      // ensure data exist for next node
      await tiles.ensure(toPoint[0], toPoint[1], this.onLoad);

      /** Nodes required after `fromNode` */
      let required: number[] = [];

      if (option.required.length > 0) {
         required = option.required;
      } else {
         required = this.rules.getRequired(option.nodes);

         if (required.length > 0) {
            this.closeNode = false;
         }
      }

      let inserted = false;

      forEach(this.options, (o, i) => {
         // insert option sorted by heuristic cost
         if (!inserted && o.heuristicCost > option.heuristicCost) {
            this.insert(i, option);
            inserted = true;
         }
      });

      if (!inserted) {
         this.options.push(option);
      }
   }

   /**
    * Remove routing option.
    */
   remove = (item: Option) => removeItem(this.options, item);

   /**
    * Insert routing option at `index` position.
    */
   insert = (index: number, item: Option) =>
      this.options.splice(index, 0, item);
}
