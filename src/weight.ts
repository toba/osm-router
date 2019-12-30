import { is, forEach } from '@toba/node-tools';
import {
   Node,
   Tag,
   Way,
   WayType,
   Access,
   Transport,
   RouteConfig
} from './types';

const noAccess = [Access.None, Access.Private];
const reverse = /^(-1|reverse)$/;
const forward = /^(yes|true|one)$/;
const hasValue = /^(yes|true|1|-1)$/;

/**
 * Weighted connections between nodes for type of transport.
 */
export class Weights {
   /** Weights assigned to node-node connections based on `RouteConfig` */
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
    * Create weighted node connections from way.
    */
   fromWay(way: Way) {
      let oneway = '';
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
            weight = this.config.weights[roadType] ?? 0;
         }

         if (railType !== undefined && weight == 0) {
            weight = this.config.weights[railType] ?? 0;
         }

         if (weight <= 0 || !this.allowed(way.tags)) {
            return;
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
   }

   /**
    * Whether mode of transportation is allowed along the given OSM `Way` as
    * indicated by its tags.
    */
   allowed(tags: { [key: string]: string | undefined }): boolean {
      let okay = true;

      forEach(this.config.access, key => {
         if (key in tags) {
            const value = tags[key];
            okay = value === undefined || !(value in noAccess);
         }
      });

      return okay;
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
