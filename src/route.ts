import { measure } from '@toba/map';
import { is, forEach } from '@toba/node-tools';
import { RouteConfig, TravelMode, Node, Tile, Point, Status } from './types';
import { tiles } from './tile';
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

   travelMode: string;
   config: RouteConfig;
   /** Whether to download tile data as needed */
   loadAsNeeded: false;

   constructor(
      configOrMode: RouteConfig | TravelMode,
      tile?: Tile,
      expireData = 30
   ) {
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
         // if tile data was given then disable automatic fetching
         tiles.fetchIfMissing = false;
         this.addTile(tile);
      }
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
      tiles.ensure(lat, lon, this.loadAsNeeded);
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
   async execute(
      startNode: number,
      endNode: number
   ): Promise<[Status, number[]?]> {
      if (this.plan === undefined) {
         this.plan = new Plan(this.nodes, this.graph, this.rules);
      }
      const valid = await this.plan.prepare(startNode, endNode);

      if (!valid) {
         return [Status.NoRoute, []];
      }

      return this.plan.find(100000);
   }
}
