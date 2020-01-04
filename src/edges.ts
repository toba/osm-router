import { is, forEach } from '@toba/node-tools';
import { Node, Tag, Way, WayType, TravelMode, RouteConfig } from './types';
import { allowTravelMode } from './restriction';

/** Weight (or below) indicating way is not usable */
const cannotUse = 0;
/** Pattern of values for reverse one-way */
const reverse = /^(-1|reverse)$/;
/** Pattern of values for forward one-way */
const forward = /^(yes|true|one)$/;
/** Pattern of values assignable to one-way tag */
const hasValue = /^(yes|true|1|-1)$/;

/**
 * Weighted connections between nodes for a given mode of travel.
 */
export class Edges {
   /** Weights assigned to node-node connections based on `RouteConfig` */
   items: Map<number, Map<number, number>>;
   travelMode: string;
   config: RouteConfig;

   constructor(config: RouteConfig, travelMode: string) {
      this.items = new Map();
      this.travelMode = travelMode;
      this.config = config;
   }

   /**
    * Throw error if any of the given nodes aren't in the graph.
    */
   ensure(...nodes: number[]) {
      forEach(nodes, id => {
         if (!this.has(id)) {
            throw new Error(`Node ${id} does not exist in the graph`);
         }
      });
   }

   /**
    * Number of edges.
    */
   get length() {
      return this.items.size;
   }

   /**
    * Add weighted edges from way and return routable nodes.
    */
   fromWay(way: Way): Node[] {
      let oneway = '';
      /** Weight for an edge (node connection) — higher values are preferred */
      let weight: number = cannotUse;

      if (way.tags !== undefined) {
         const roadType = way.tags[Tag.RoadType];
         const railType = way.tags[Tag.RailType];
         const junction = way.tags[Tag.JunctionType];

         oneway = way.tags[Tag.OneWay] ?? '';

         if (
            is.empty(oneway) &&
            (junction == 'roundabout' ||
               junction == 'circular' ||
               roadType == WayType.Freeway)
         ) {
            // infer one-way for roundabouts and freeways
            oneway = 'yes';
         }

         if (
            this.travelMode == TravelMode.Walk ||
            (hasValue.test(oneway) &&
               way.tags[Tag.OneWay + ':' + this.travelMode] == 'no')
         ) {
            // disable one-way setting for foot traffic or explicit tag
            oneway = 'no';
         }

         if (roadType !== undefined) {
            weight = this.config.weights[roadType] ?? cannotUse;
         }

         if (railType !== undefined && weight == cannotUse) {
            // TODO: is this right? How can we arbitrarily switch to rail type?
            // see if there's another way
            weight = this.config.weights[railType] ?? cannotUse;
         }

         if (
            weight <= cannotUse ||
            !allowTravelMode(way.tags, this.config.canUse)
         ) {
            return [];
         }
      }

      for (let i = 1; i < way.nodes.length; i++) {
         const n1 = way.nodes[i - 1];
         const n2 = way.nodes[i];

         if (!reverse.test(oneway)) {
            // foward travel is allowed from n1 to n2
            this.add(n1, n2, weight);
         }
         if (!forward.test(oneway)) {
            // reverse travel is allowed from n2 to n1
            this.add(n2, n1, weight);
         }
      }
      return way.nodes;
   }

   /**
    * Whether `from` node exists and, optionally, if it is connected to a `to`
    * node ID.
    */
   has(from: number, to?: number) {
      const exists = this.items.has(from);
      return exists && to !== undefined
         ? this.items.get(from)!.has(to)
         : exists;
   }

   /**
    * Weight for the connection between `from` node and `to` node. Zero is
    * returned if the nodes aren't connected.
    */
   weight = (from: number, to: number): number =>
      this.items.get(from)?.get(to) ?? cannotUse;

   /**
    * Add connection weight between `from` and `to` node.
    */
   add(from: Node, to: Node, weight: number) {
      let edge: Map<number, number> | undefined = this.items.get(from.id);

      if (edge === undefined) {
         edge = new Map();
         this.items.set(from.id, edge);
      }
      edge.set(to.id, weight);
   }

   /**
    * Execute method for each `toNode` that `nodeID` connects to.
    */
   each(nodeID: number, fn: (weight: number, toNode: number) => void) {
      const nodes = this.items.get(nodeID);
      if (nodes === undefined) {
         return;
      }
      nodes.forEach(fn);
   }

   /**
    * Map node edges to an array using given function. This may be used, for
    * example, to map edges to route options.
    */
   map<T>(nodeID: number, fn: (weight: number, toNode: number) => T): T[] {
      const nodes = this.items.get(nodeID);
      if (nodes === undefined) {
         return [];
      }
      const out: T[] = [];
      nodes.forEach((weight, id) => out.push(fn(weight, id)));
      return out;
   }
}
