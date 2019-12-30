import { measure } from '@toba/map';
import { is, forEach } from '@toba/node-tools';
import { RouteConfig, Transport, Node, Tile } from './types';
import { whichTile } from './tile';
import { preferences } from './config';
import { Preferences } from './preference';
import { Restrictions } from './restriction';

export class Graph {
   preferences: Preferences;
   restrictions: Restrictions;
   nodes: Map<number, Node>;
   /** Cached tiles */
   tiles: Map<string, boolean>;
   /** Mode of transportation */
   transport: string;
   config: RouteConfig;
   /** Whether to download tile data as needed */
   loadAsNeeded: false;

   constructor(
      transport: RouteConfig | Transport,
      tile?: Tile,
      expireData = 30
   ) {
      this.tiles = new Map();
      this.nodes = new Map();

      if (is.object<RouteConfig>(transport)) {
         this.transport = transport.name!;
         this.config = transport;
      } else {
         this.transport = transport;
         // TODO: clone instead of assign
         this.config = preferences[transport];
      }

      this.preferences = new Preferences(this.config, this.transport);
      this.restrictions = new Restrictions(this.config, this.transport);

      if (tile !== undefined) {
         this.loadAsNeeded = false;
         this.addTile(tile);
      }
   }

   nodeLatLon = (nodeID: number) => this.nodes.get(nodeID)?.point();

   /**
    * Ensure tiles are available for routing.
    */
   ensureTiles(lat: number, lon: number) {
      if (!this.loadAsNeeded) {
         return;
      }
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
      tile.ways.forEach(way => {
         // only cache nodes that are part of routable ways
         const routableNodes = this.preferences.fromWay(way);
         forEach(routableNodes, n => this.nodes.set(n.id, n));
      });
      forEach(tile.relations, r => this.restrictions.fromRelation(r));
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
      let foundDistance = Number.MAX_VALUE;
      let foundNode: number | null = null;

      this.nodes.forEach((node, nodeID) => {
         const distance = this.distance(node.point(), [lat, lon]);

         if (distance < foundDistance) {
            foundDistance = distance;
            foundNode = nodeID;
         }
      });

      return foundNode;
   }
}
