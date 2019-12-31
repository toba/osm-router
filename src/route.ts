import { measure } from '@toba/map';
import { is, forEach } from '@toba/node-tools';
import { RouteConfig, TravelMode, Node, Tile, Point, Status } from './types';
import { whichTile } from './tile';
import { preferences } from './config';
import { Graph } from './graph';
import { Restrictions } from './restriction';
import { Plan } from './plan';

/**
 * @see https://jakobmiksch.eu/post/openstreetmap_routing/
 */
export class Route {
   plan: Plan;
   graph: Graph;
   rules: Restrictions;
   nodes: Map<number, Node>;
   /** Cached tiles */
   tiles: Map<string, boolean>;
   travelMode: string;
   config: RouteConfig;
   /** Whether to download tile data as needed */
   loadAsNeeded: false;

   constructor(
      configOrMode: RouteConfig | TravelMode,
      tile?: Tile,
      expireData = 30
   ) {
      this.tiles = new Map();
      this.nodes = new Map();

      if (is.object<RouteConfig>(configOrMode)) {
         this.travelMode = configOrMode.name;
         this.config = configOrMode;
      } else {
         this.travelMode = configOrMode;
         // TODO: clone instead of assign
         this.config = preferences[this.travelMode];
      }

      this.graph = new Graph(this.config, this.travelMode);
      this.rules = new Restrictions(this.config, this.travelMode);

      if (tile !== undefined) {
         this.loadAsNeeded = false;
         this.addTile(tile);
      }
   }

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
         const routableNodes = this.graph.fromWay(way);
         forEach(routableNodes, n => this.nodes.set(n.id, n));
      });
      forEach(tile.relations, r => this.rules.fromRelation(r));
   }

   distance = (p1: Point, p2: Point) => measure.distanceLatLon(p1, p2);

   /**
    * Find nearest accessible node to begin the route.
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

   /**
    * Find route between two known nodes.
    * @param startNode Node ID
    * @param endNode Node ID
    */
   execute(startNode: number, endNode: number): [Status, number[]?] {
      if (this.plan === undefined) {
         this.plan = new Plan(this.nodes, this.graph, this.rules);
      }

      if (!this.plan.prepare(startNode, endNode)) {
         return [Status.NoRoute, []];
      }

      return this.plan.find(endNode, 100000);
   }
}
