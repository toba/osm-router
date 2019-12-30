import { RouteConfig, Node } from './types';

export class Cost {
   /** Weights assigned to node-node connections based on `RouteConfig` */
   connections: Map<number, Map<number, number>>;
   config: RouteConfig;

   constructor(config: RouteConfig, nodes?: Map<number, Node>) {
      this.connections = new Map();
      if (nodes !== undefined) {
         
      }
   }
}
