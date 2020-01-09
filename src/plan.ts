import { measure } from '@toba/map';
import { removeItem, forEach } from '@toba/tools';
import { Node, Point, Status, Tile } from './types';
import { Edges } from './edges';
import { Restrictions } from './restriction';
import { nextToLast } from './sequence';
import { tiles } from './tile';
import { RouteResult } from './router';

export interface Route {
   /** Sequence of node IDs leading to `endNode` */
   nodes: number[];
   /** Cost of connecting start and end nodes based on road type weighting */
   cost: number;
   heuristicCost: number;
   /**
    * IDs of nodes that *must* be traversed in this plan, derived from `only_*`
    * OSM relations
    */
   required: number[];
   /**
    * Route end node. This will not be the target end node until the route is
    * complete.
    */
   endNode: number;
}

const emptyRoute = (startNode: number): Route => ({
   cost: 0,
   heuristicCost: 0,
   nodes: [startNode],
   required: [],
   endNode: 0
});

const extendRoute = (r: Route, endNode: number): Route => {
   const nodes = r.nodes.slice();
   nodes.push(endNode);

   return {
      cost: r.cost,
      heuristicCost: r.heuristicCost,
      nodes,
      required: r.required.slice(),
      endNode
   };
};

/**
 * Route planner.
 * @see https://arxiv.org/ftp/arxiv/papers/1212/1212.6055.pdf
 */
export class Plan {
   edges: Edges;
   private rules: Restrictions;
   private nodes: Map<number, Node>;
   /** Routes between start and end sorted by cost */
   private routes: Route[];
   /** Node IDs that have been used and shouldn't be considered again */
   private used: Set<number>;
   /** OSM node that valid routes must reach */
   private endNode: number;
   /** Latitude/longitude of target route node */
   endPoint: Point;
   /** Method to call when new tile data are loaded */
   private onLoad?: (t: Tile) => void;

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
    * Validate start and end points then create initial routes for every node
    * connected to the start point.
    *
    * OSM data for linked nodes will be downloaded if not already cached.
    *
    * Start and end nodes should always exist after having been identified with
    * `router.nearestNode()` since that method adds to the graph as needed.
    *
    * @returns Whether start and end points are valid
    */
   async prepare(startNode: number, endNode: number): Promise<boolean> {
      this.edges.ensure(startNode);

      if (startNode == endNode) {
         return false;
      }
      this.used = new Set([startNode]);
      this.routes = [];
      this.endNode = endNode;
      this.endPoint = this.nodes.get(endNode)!.point();

      return Promise.all(
         this.edges.map(startNode, (weight, linkedNode) =>
            this.add(startNode, linkedNode, emptyRoute(startNode), weight)
         )
      )
         .then(() => true)
         .catch(() => false);
   }

   /** Number of route plans */
   get length() {
      return this.routes.length;
   }

   /**
    * Find lowest cost option to reach end node within maximum iterations.
    * @param max Maximum number of route iterations to try before giving up
    */
   async find(max: number): Promise<RouteResult> {
      let count = 0;

      while (count < max) {
         if (this.length == 0) {
            // exhausted options without finding way to end
            return { status: Status.NoRoute };
         }
         count++;

         /** Current route being evaluated */
         const route = this.routes.pop()!;
         /** Final node ID for current route */
         const routeEnd = route.endNode;
         /** Whether to flag node so it isn't considered again for this route */
         let setUsed = true;

         if (this.used.has(routeEnd)) {
            // node was already considered
            continue;
         }

         if (routeEnd == this.endNode) {
            return { status: Status.Success, nodes: route.nodes.slice() };
         }

         if (route.required.length > 0) {
            // traverse mandatory turns
            setUsed = false;
            /** Next required node */
            const tryNode = route.required.shift()!;

            if (this.edges.has(tryNode) && this.edges.has(routeEnd, tryNode)) {
               // TODO: any way without loop await?
               await this.add(
                  routeEnd,
                  tryNode,
                  route,
                  this.edges.weight(routeEnd, tryNode)
               );
            }
         } else if (this.edges.has(routeEnd)) {
            await Promise.all(
               this.edges.map(routeEnd, async (weight, nextNode) => {
                  if (!this.used.has(nextNode)) {
                     return this.add(routeEnd, nextNode, route, weight);
                  }
               })
            );
         }

         if (setUsed) {
            this.used.add(routeEnd);
         }
      }

      return { status: Status.GaveUp };
   }

   /**
    * Whether nodes with IDs have been cached.
    */
   private hasNodes = (...nodes: number[]): boolean =>
      nodes.findIndex(n => !this.nodes.has(n)) == -1;

   /**
    * Add route options one segment at-a-time.
    * @param toNode End-of-segment node (not end of route)
    * @returns Whether to flag node as used
    */
   private async add(
      fromNode: number,
      toNode: number,
      soFar: Route,
      weight = 1
   ): Promise<boolean> {
      if (
         weight == 0 ||
         !this.hasNodes(toNode, fromNode) ||
         nextToLast(soFar.nodes) == toNode
      ) {
         // ignore non-traversible route (weight 0), missing nodes and
         // reversal at node (i.e. a->b->a)
         return true;
      }

      const route = extendRoute(soFar, toNode);

      if (this.rules.forbids(soFar.nodes)) {
         return false;
      }

      const toPoint = this.nodes.get(toNode)!.point();
      const fromPoint = this.nodes.get(fromNode)!.point();

      route.cost += measure.distanceLatLon(fromPoint, toPoint) / weight;
      route.heuristicCost =
         route.cost + measure.distanceLatLon(toPoint, this.endPoint);

      /** Existing route that already connects with `toNode` */
      const existingRoute = this.routes.find(p => p.endNode == toNode);

      if (existingRoute !== undefined) {
         if (existingRoute.cost < route.cost) {
            // if a cheaper route already exists then do not create this route
            return true;
         }
         // if existing route is more expensive then remove it and continue
         // creating new route
         this.remove(existingRoute);
      }

      // ensure data exist for next node
      if (!(await tiles.ensure(toPoint[0], toPoint[1], this.onLoad))) {
         throw new Error(`Unable to load data for point ${toPoint}`);
      }

      /** Nodes required after `fromNode` */
      let required: number[] = [];
      /** Whether to flag node so it isn't considered again for this route */
      let setUsed = true;

      if (route.required.length > 0) {
         required = route.required;
      } else {
         required = this.rules.getRequired(route.nodes);

         if (required.length > 0) {
            setUsed = false;
         }
      }

      /** Whether route has been added within sorted list */
      let inserted = false;

      forEach(this.routes, (o, i) => {
         // insert option sorted by heuristic cost
         if (!inserted && o.heuristicCost > route.heuristicCost) {
            this.insert(i, route);
            inserted = true;
         }
      });

      if (!inserted) {
         this.routes.push(route);
      }

      return setUsed;
   }

   /**
    * Remove routing option.
    */
   private remove = (item: Route) => removeItem(this.routes, item);

   /**
    * Insert routing option at `index` position.
    */
   private insert = (index: number, item: Route) =>
      this.routes.splice(index, 0, item);
}
