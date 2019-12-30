import { measure } from '@toba/map';
import { is, forEach } from '@toba/node-tools';
import { RouteConfig, Transport, Node, Tile } from './types';
import { whichTile } from './tile';
import { routeModes } from './config';
import { Weights } from './weight';
import { Restrictions } from './restriction';

export class Graph {
   weights: Weights;
   restrictions: Restrictions;
   nodes: Map<number, Node>;
   /** Cached tiles */
   tiles: Map<string, boolean>;
   /** Mode of transportation */
   transport: string;
   config: RouteConfig;

   constructor(
      transport: RouteConfig | Transport,
      tile?: Tile,
      expireData = 30
   ) {
      this.tiles = new Map();

      if (is.object<RouteConfig>(transport)) {
         this.transport = transport.name!;
         this.config = transport;
      } else {
         this.transport = transport;
         // TODO: clone instead of assign
         this.config = routeModes[transport];
      }

      this.weights = new Weights(this.config, this.transport);
      this.restrictions = new Restrictions(this.config, this.transport);

      if (tile !== undefined) {
         this.addTile(tile);
      }
   }

   nodeLatLon = (nodeID: number) => this.nodes.get(nodeID)?.point();

   /**
    * Ensure tiles are available for routing.
    */
   ensureTiles(lat: number, lon: number) {
      const [x, y] = whichTile(lat, lon);
      const tileID = `${x},${y}`;

      if (this.tiles.has(tileID)) {
         return;
      }
      throw new Error(`Not implemented for tile ${tileID}`);

      // this.tiles.set(tileID, true);

      // const [left, bottom, right, top] = tileBoundary(x, y);
      // const url = `https://api.openstreetmap.org/api/0.6/map?bbox=${left},${bottom},${right},${top}`;
   }

   addTile(tile: Tile) {
      this.nodes = tile.nodes;
      tile.ways.forEach(way => this.weights.fromWay(way));
      forEach(tile.relations, this.restrictions.fromRelation);
   }

   /**
    * @param p1 Latitude/Longitude tuple
    * @param p2 Latitude/Longitude tuple
    */
   distance = (p1: [number, number], p2: [number, number]) =>
      measure.distanceLatLon(p1, p2);

   /**
    * Find nearest node to start the route.
    */
   nearestNode(lat: number, lon: number): number | null {
      this.ensureTiles(lat, lon);
      let nodeDistance = Number.MAX_VALUE;
      let nearestNodeID: number | null = null;

      this.nodes.forEach((node, nodeID) => {
         const distance = this.distance(node.point(), [lat, lon]);
         if (distance < nodeDistance) {
            nodeDistance = distance;
            nearestNodeID = nodeID;
         }
      });

      return nearestNodeID;
   }
}
