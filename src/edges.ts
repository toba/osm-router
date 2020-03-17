import { is, forEach } from '@toba/node-tools'
import { Node, Tag, Way, WayType, TravelMode } from '@toba/osm-models'
import { RouteConfig } from './types'
import { allowTravelMode } from './restriction'

/** Weight (or below) indicating way is not usable */
const cannotUse = 0
/** Pattern indicating one-way enforced in direction opposite the node order */
const reverse = /^(-1|reverse)$/
/** Pattern of values indicating one-way in node order */
const forward = /^(yes|true|1)$/
/** Pattern of values indicating one-way restriction is in effect */
const isOneWay = /^(yes|true|1|-1|reverse)$/

/**
 * Weighted connections between nodes for a given mode of travel.
 */
export class Edges {
   /** Weights assigned to node-node connections based on `RouteConfig` */
   #items: Map<number, Map<number, number>>
   #travelMode: string
   #config: RouteConfig

   constructor(config: RouteConfig, travelMode: string) {
      this.#items = new Map()
      this.#travelMode = travelMode
      this.#config = config
   }

   /**
    * Throw error if any of the given nodes aren't in the graph.
    */
   ensure(...nodes: number[]) {
      forEach(nodes, id => {
         if (!this.has(id)) {
            throw new Error(`Node ${id} does not exist in the graph`)
         }
      })
   }

   /**
    * Number of edges.
    */
   get length() {
      return this.#items.size
   }

   /**
    * Add weighted edges from way and return routable nodes.
    *
    * @see https://wiki.openstreetmap.org/wiki/Key:oneway
    */
   fromWay(way: Way): Node[] {
      /** Value of one-way tag */
      let oneway = ''
      /** Weight for an edge (node connection) — higher values are preferred */
      let weight: number = cannotUse

      if (way.tags !== undefined) {
         const roadType = way.tags[Tag.RoadType]
         const railType = way.tags[Tag.RailType]
         const junction = way.tags[Tag.JunctionType]

         oneway = way.tags[Tag.OneWay] ?? ''

         if (
            is.empty(oneway) &&
            (junction == 'roundabout' ||
               junction == 'circular' ||
               roadType == WayType.Freeway)
         ) {
            // infer one-way for roundabouts and freeways
            oneway = 'yes'
         }

         if (
            this.#travelMode == TravelMode.Walk ||
            (isOneWay.test(oneway) &&
               way.tags[Tag.OneWay + ':' + this.#travelMode] == 'no')
         ) {
            // disable one-way setting for foot traffic or explicit tag
            oneway = 'no'
         }

         if (roadType !== undefined) {
            weight = this.#config.weights[roadType] ?? cannotUse
         }

         if (railType !== undefined && weight == cannotUse) {
            // TODO: is this right? How can we arbitrarily switch to rail type?
            // see if there's another way
            weight = this.#config.weights[railType] ?? cannotUse
         }

         if (
            weight <= cannotUse ||
            !allowTravelMode(way.tags, this.#config.canUse)
         ) {
            return []
         }
      }

      for (let i = 1; i < way.nodes.length; i++) {
         const n1 = way.nodes[i - 1]
         const n2 = way.nodes[i]

         // foward travel is allowed from n1 to n2
         if (!reverse.test(oneway)) this.add(n1, n2, weight)

         // reverse travel is allowed from n2 to n1
         if (!forward.test(oneway)) this.add(n2, n1, weight)
      }
      return way.nodes
   }

   /**
    * Weighted nodes (IDs) connected to the given node.
    */
   get = (node: number) => this.#items.get(node)

   /**
    * Whether `from` node exists and, optionally, if it is connected to a `to`
    * node ID.
    */
   has(from: number, to?: number) {
      const exists = this.#items.has(from)
      return exists && to !== undefined ? this.get(from)!.has(to) : exists
   }

   /**
    * Weight for the connection between `from` node and `to` node. Zero is
    * returned if the nodes aren't connected.
    */
   weight = (from: number, to: number): number =>
      this.get(from)?.get(to) ?? cannotUse

   /**
    * Add connection weight between `from` and `to` node.
    */
   add(from: Node, to: Node, weight: number) {
      let edge: Map<number, number> | undefined = this.get(from.id)

      if (edge === undefined) {
         edge = new Map()
         this.#items.set(from.id, edge)
      }
      edge.set(to.id, weight)
   }

   /**
    * Execute method for each `toNode` that `nodeID` connects to.
    */
   each(nodeID: number, fn: (weight: number, toNode: number) => void) {
      const nodes = this.get(nodeID)
      if (nodes === undefined) return
      nodes.forEach(fn)
   }

   /**
    * Map node edges to an array using given function. This may be used, for
    * example, to map edges to route options.
    */
   map<T>(nodeID: number, fn: (weight: number, toNode: number) => T): T[] {
      const nodes = this.get(nodeID)

      if (nodes === undefined) return []

      const out: T[] = []
      nodes.forEach((weight, id) => out.push(fn(weight, id)))
      return out
   }
}
