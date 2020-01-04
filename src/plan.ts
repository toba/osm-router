import { measure } from '@toba/map';
import { removeItem, forEach } from '@toba/tools';
import { Node, Point, Status, Tile } from './types';
import { Edges } from './edges';
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

const emptyOption = (startNode: number): Option => ({
   cost: 0,
   heuristicCost: 0,
   nodes: [startNode],
   required: [],
   endNode: 0
});

/**
 * Route planner.
 */
export class Plan {
   edges: Edges;
   rules: Restrictions;
   nodes: Map<number, Node>;
   /** Optional route plans sorted by cost */
   options: Option[];
   /** Node IDs that have been used and shouldn't be considered again */
   used: Set<number>;

   endNode: number;
   /** Latitude/longitude of target route node */
   endPoint: Point;
   /** Method to call when new tile data are loaded */
   onLoad?: (t: Tile) => void;

   constructor(
      nodes: Map<number, Node>,
      edges: Edges,
      rules: Restrictions,
      onLoad?: (t: Tile) => void
   ) {
      this.edges = edges;
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
      this.edges.ensure(startNode);

      if (startNode == endNode) {
         return false;
      }
      this.used = new Set([startNode]);
      this.options = [];
      this.endNode = endNode;
      this.endPoint = this.nodes.get(endNode)!.point();

      return Promise.all(
         this.edges.map(startNode, (weight, linkedNode) =>
            this.add(startNode, linkedNode, emptyOption(startNode), weight)
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

         const option = this.options.pop()!;
         /** End node ID */
         const optionEnd = option.endNode;
         /** Whether to flag node so it isn't considered again for this route */
         let setUsed = true;

         if (this.used.has(optionEnd)) {
            // node was already considered
            continue;
         }

         if (optionEnd == this.endNode) {
            return { status: Status.Success, nodes: option.nodes };
         }

         if (option.required.length > 0) {
            // traverse mandatory turns
            setUsed = false;
            /** Next required node */
            const tryNode = option.required.shift()!;

            if (this.edges.has(tryNode) && this.edges.has(optionEnd, tryNode)) {
               // TODO: any way without loop await?
               // eslint-disable-next-line
               await this.add(
                  optionEnd,
                  tryNode,
                  option,
                  this.edges.weight(optionEnd, tryNode)
               );
            }
         } else if (this.edges.has(optionEnd)) {
            // eslint-disable-next-line
            await Promise.all(
               this.edges.map(optionEnd, async (weight, nextNode) => {
                  if (!this.used.has(nextNode)) {
                     // eslint-disable-next-line
                     return this.add(optionEnd, nextNode, option, weight);
                  }
               })
            );
         }

         if (setUsed) {
            this.used.add(optionEnd);
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
    * Add to route options one segment at-a-time.
    * @param toNode End-of-segment node (not end of route)
    * @returns Whether to flag node as used
    */
   async add(
      fromNode: number,
      toNode: number,
      option: Option,
      weight = 1
   ): Promise<boolean> {
      if (
         weight == 0 ||
         !this.hasNodes(toNode, fromNode) ||
         nextToLast(option.nodes) == toNode
      ) {
         // ignore non-traversible route (weight 0), missing nodes and
         // reversal at node (i.e. a->b->a)
         return true;
      }

      option.nodes.push(toNode);

      if (this.rules.forbids(option.nodes)) {
         return false;
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
            return true;
         }
         // if the existing option to reach the end has a higher cost then
         // remove it and continue with the cheaper option
         this.remove(optionToEnd);
      }

      // ensure data exist for next node
      await tiles.ensure(toPoint[0], toPoint[1], this.onLoad);

      /** Nodes required after `fromNode` */
      let required: number[] = [];
      /** Whether to flag node so it isn't considered again for this route */
      let setUsed = true;

      if (option.required.length > 0) {
         required = option.required;
      } else {
         required = this.rules.getRequired(option.nodes);

         if (required.length > 0) {
            setUsed = false;
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

      return setUsed;
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
