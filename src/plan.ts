import { measure } from '@toba/map'
import { removeItem } from '@toba/tools'
import { Node, Point, AreaData } from '@toba/osm-models'
import { Status } from './types'
import { Edges } from './edges'
import { Restrictions } from './restriction'
import { nextToLast } from './sequence'
import { tiles } from './tile'
import { RouteResult } from './router'

export interface Route {
   /** Sequence of node IDs leading to `endNode` */
   nodes: number[]
   /** Cost of connecting start and end nodes based on road type weighting */
   cost: number
   heuristicCost: number
   /**
    * IDs of nodes that *must* be traversed in this plan, derived from `only_*`
    * OSM relations
    */
   required: number[]
   /**
    * Rinal route node. This will not be the target end node until the route is
    * complete.
    */
   endNode: number
}

/**
 * Create a new route with `0` or empty values.
 */
const emptyRoute = (startNode: number): Route => ({
   cost: 0,
   heuristicCost: 0,
   nodes: [startNode],
   required: [],
   endNode: 0
})

/**
 * Copy an existing route and extend it to include a new end node. This updates
 * node values but *not* costs.
 */
const extendRoute = (r: Route, endNode: number): Route => {
   const nodes = r.nodes.slice()
   nodes.push(endNode)

   return {
      cost: r.cost,
      heuristicCost: r.heuristicCost,
      nodes,
      required: r.required.slice(),
      endNode
   }
}

/**
 * Route planner.
 * @see https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm
 * @see https://arxiv.org/ftp/arxiv/papers/1212/1212.6055.pdf
 */
export class Plan {
   edges: Edges
   #rules: Restrictions
   /** All known OSM nodes keyed to their ID */
   #nodes: Map<number, Node>
   /**
    * Routes between start and end sorted by cost so `.pop()` always returns
    * the lowest cost plan
    */
   #routes: Route[]
   /** Node IDs with links that have all been evaluated */
   #known: Set<number>
   /** OSM node that valid routes must reach */
   #endNode: number
   /** Latitude/longitude of target route node */
   endPoint: Point
   /** Method to call when new tile data are loaded */
   #onLoad?: (t: AreaData) => void

   constructor(
      nodes: Map<number, Node>,
      edges: Edges,
      rules: Restrictions,
      onLoad?: (t: AreaData) => void
   ) {
      this.edges = edges
      this.#rules = rules
      this.#nodes = nodes
      this.#onLoad = onLoad
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
      this.edges.ensure(startNode)

      if (startNode == endNode) return false

      this.#known = new Set([startNode])
      this.#routes = []
      this.#endNode = endNode
      this.endPoint = this.#nodes.get(endNode)!.point()

      return Promise.all(
         this.edges.map(startNode, (weight, linkedNode) =>
            this.add(startNode, linkedNode, emptyRoute(startNode), weight)
         )
      )
         .then(() => true)
         .catch(() => false)
   }

   /** Number of route plans */
   get length() {
      return this.#routes.length
   }

   /**
    * Ensure OSM node and way data are loaded for a coordinate.
    */
   private async ensureData(p: Point) {
      if (!(await tiles.ensure(p[0], p[1], this.#onLoad))) {
         throw new Error(`Unable to load data for point ${p}`)
      }
   }

   /**
    * Whether nodes with IDs have been cached.
    */
   private hasNodes = (...nodes: number[]): boolean =>
      nodes.findIndex(n => !this.#nodes.has(n)) == -1

   /**
    * Find lowest cost option to reach end node within maximum iterations.
    * @param max Maximum number of route iterations to try before giving up
    */
   async find(max: number): Promise<RouteResult> {
      let count = 0

      while (count < max) {
         // exhausted options without finding way to end
         if (this.length == 0) return { status: Status.NoRoute }

         count++

         /** Potential route to evaluate */
         const route = this.#routes.pop()!
         /** Final node ID of current route */
         const toNode = route.endNode
         /** Whether all `toNode` connections have been evaluated */
         let evaluated = true

         // node was already explored
         if (this.#known.has(toNode)) continue

         if (toNode == this.#endNode) {
            return { status: Status.Success, nodes: route.nodes.slice() }
         }

         if (route.required.length > 0) {
            // traverse mandatory nodes
            evaluated = false
            /** Next required node */
            const requiredNode = route.required.shift()!

            if (this.edges.has(toNode, requiredNode)) {
               await this.add(
                  toNode,
                  requiredNode,
                  route,
                  this.edges.weight(toNode, requiredNode)
               )
            }
         } else if (this.edges.has(toNode)) {
            const allAdded = await Promise.all(
               this.edges.map(toNode, async (weight, nextNode) =>
                  this.#known.has(nextNode)
                     ? true
                     : this.add(toNode, nextNode, route, weight)
               )
            )
            // toNode considered fully evaluated unless one of its
            // connections (edges) couldn't be explored
            if (allAdded.includes(false)) evaluated = false
         }

         if (evaluated) this.#known.add(toNode)
      }

      return { status: Status.GaveUp }
   }

   /**
    * Add route options one segment at-a-time.
    * @param toNode End-of-segment node (not end of route)
    * @returns Whether `toNode` was fully evaluated. This will be `false` if
    * required or forbidden (i.e. one-ways) node sequences took precedence.
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
         return true
      }

      const route = extendRoute(soFar, toNode)

      if (this.#rules.forbids(route.nodes)) return false

      const toPoint = this.#nodes.get(toNode)!.point()
      const fromPoint = this.#nodes.get(fromNode)!.point()

      route.cost += measure.distanceLatLon(fromPoint, toPoint) / weight
      route.heuristicCost =
         route.cost + measure.distanceLatLon(toPoint, this.endPoint)

      /** Existing route that already connects with `toNode` */
      const existingRoute = this.#routes.find(p => p.endNode == toNode)

      if (existingRoute !== undefined) {
         // if a cheaper route already exists then do not create this route
         if (existingRoute.cost < route.cost) return true

         // if existing route is more expensive then remove it and continue
         // creating new route
         this.remove(existingRoute)
      }

      await this.ensureData(toPoint)

      /** Whether all `toNode` connections have been evaluated */
      let evaluated = true

      if (route.required.length == 0) {
         const required = this.#rules.getRequired(route.nodes)

         if (required.length > 0) {
            route.required = required
            evaluated = false
         }
      }

      this.#routes.push(route)
      this.sort()

      return evaluated
   }

   /**
    * Sort route plans in order of cost.
    */
   private sort = () =>
      this.#routes.sort(
         (r1: Route, r2: Route) => r2.heuristicCost - r1.heuristicCost
      )

   /**
    * Remove routing option.
    */
   private remove = (item: Route) => removeItem(this.#routes, item)
}
