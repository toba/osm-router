import { is, forEach } from '@toba/node-tools';
import { Node, Tag, Way, WayType, TravelMode, RouteConfig } from './types';
import { allowTransport } from './restriction';

/** Pattern of values for reverse one-way */
const reverse = /^(-1|reverse)$/;
/** Pattern of values for forward one-way */
const forward = /^(yes|true|one)$/;
/** Pattern of values for one-way key */
const hasValue = /^(yes|true|1|-1)$/;

/**
 * Preferred connections between nodes for mode of travel.
 */
export class Graph {
   /** Weights assigned to node-node connections based on `RouteConfig` */
   edges: Map<number, Map<number, number>>;
   travelMode: string;
   config: RouteConfig;

   constructor(config: RouteConfig, travelMode: string) {
      this.edges = new Map();
      this.travelMode = travelMode;
      this.config = config;
   }

   /**
    * Throw error if any of the given nodes aren't connected.
    */
   ensure(...nodes: number[]) {
      forEach(nodes, id => {
         if (!this.has(id)) {
            throw new Error(`Node ${id} does not exist in the graph`);
         }
      });
   }

   /**
    * Create weighted edges from way.
    * @returns Routable nodes
    */
   fromWay(way: Way): Node[] {
      let oneway = '';
      /**
       * Preference for an edge (node connection). Higher values are preferred.
       * A weight of 0 makes the way inaccessible.
       */
      let weight = 0;

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
            weight = this.config.weights[roadType] ?? 0;
         }

         if (railType !== undefined && weight == 0) {
            weight = this.config.weights[railType] ?? 0;
         }

         if (weight <= 0 || !allowTransport(way.tags, this.config.canUse)) {
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
      const exists = this.edges.has(from);
      return to === undefined ? exists : this.edges.get(from)!.has(to);
   }

   /**
    * Preference for the connection between `from` node and `to` node. Zero is
    * returned if the nodes aren't connected.
    */
   value = (from: number, to: number): number =>
      this.edges.get(from)?.get(to) ?? 0;

   /**
    * Add connection preference between `from` and `to` node.
    */
   add(from: Node, to: Node, preference: number) {
      if (!this.edges.has(from.id)) {
         this.edges.set(from.id, new Map());
      }
      this.edges.get(from.id)!.set(to.id, preference);
   }

   /**
    * Execute method for each `toNode` connected to `nodeID`.
    */
   each(nodeID: number, fn: (preference: number, toNode: number) => void) {
      const nodes = this.edges.get(nodeID);
      if (nodes === undefined) {
         return;
      }
      nodes.forEach(fn);
   }

   /**
    * All connections for `from` node.
    */
   for = (from: Node) => this.edges.get(from.id);
}
