import { is } from '@toba/node-tools';
import { Node, Tag, Way, WayType, Transport, RouteConfig } from './types';
import { allowTransport } from './restriction';

const reverse = /^(-1|reverse)$/;
const forward = /^(yes|true|one)$/;
const hasValue = /^(yes|true|1|-1)$/;

/**
 * Preferred connections between nodes for type of transport.
 */
export class Preferences {
   /** Preference assigned to node-node connections based on `RouteConfig` */
   connections: Map<number, Map<number, number>>;
   /** Mode of transportation */
   transport: string;
   config: RouteConfig;

   constructor(config: RouteConfig, transport: string) {
      this.connections = new Map();
      this.transport = transport;
      this.config = config;
   }

   /**
    * Create preferential node connections from way.
    * @returns Routable nodes
    */
   fromWay(way: Way): Node[] {
      let oneway = '';
      let preference = 0;

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
            // infer one-way for roundabouts and freeways if not already defined
            oneway = 'yes';
         }

         if (
            this.transport == Transport.Walk ||
            (hasValue.test(oneway) &&
               way.tags[Tag.OneWay + ':' + this.transport] == 'no')
         ) {
            // disable one-way setting for foot traffic or explicit tag
            oneway = 'no';
         }

         if (roadType !== undefined) {
            preference = this.config.preference[roadType] ?? 0;
         }

         if (railType !== undefined && preference == 0) {
            preference = this.config.preference[railType] ?? 0;
         }

         if (preference <= 0 || !allowTransport(way.tags, this.config.canUse)) {
            return [];
         }
      }

      for (let i = 1; i < way.nodes.length; i++) {
         const n1 = way.nodes[i - 1];
         const n2 = way.nodes[i];

         if (!reverse.test(oneway)) {
            // foward travel is allowed from n1 to n2
            this.add(n1, n2, preference);
         }
         if (!forward.test(oneway)) {
            // reverse travel is allowed from n2 to n1
            this.add(n2, n1, preference);
         }
      }
      return way.nodes;
   }

   /**
    * Add weighted connection between `from` and `to` node.
    */
   add(from: Node, to: Node, cost: number) {
      if (!this.connections.has(from.id)) {
         this.connections.set(from.id, new Map());
      }
      this.connections.get(from.id)!.set(to.id, cost);
   }

   /**
    * All connections for `from` node.
    */
   for = (from: Node) => this.connections.get(from.id);
}
