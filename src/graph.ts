import { measure } from '@toba/map';
import {
   forEach,
   forEachKeyValue,
   intersects,
   reverse
} from '@toba/node-tools';
import {
   RouteSpec,
   Transport,
   routeModes,
   Tags,
   Way,
   Node,
   Tile,
   Relation,
   accessDenied,
   WayType,
   Tag,
   Role
} from './types';
import { is } from '.';

const defaultZoom = 15;
// https://www.measurethat.net/Benchmarks/Show/4797/1/js-regex-vs-startswith-vs-indexof
const noAccess = /^no_/;
const onlyAccess = /^only_/;
const accessRestriction = /^(no|only)_/;

/**
 * Calculate OSM tile coordinate for location and zoom.
 * @param lat Latitude
 * @param lon Longitude
 */
function whichTile(
   lat: number,
   lon: number,
   zoom: number = defaultZoom
): [number, number, number] {
   /** Latitude in radians */
   const radLat = measure.toRadians(lat);
   const n = 2 ** zoom;
   const x = n * ((lon + 180) / 360);
   const y = n * (1 - Math.log(Math.tan(radLat) + 1 / Math.cos(radLat)));

   return [x, y, zoom];
}

/**
 * Calculate left, bottom, right and top for tile.
 * @param x Tile X coordinate
 * @param y Tile Y coordinate
 */
function tileBoundary(
   x: number,
   y: number,
   zoom: number = defaultZoom
): [number, number, number, number] {
   const n = 2 ** zoom;
   const mercToLat = (x: number) => measure.toDegrees(Math.atan(Math.sinh(x)));
   const top = mercToLat(Math.PI * (1 - 2 * ((y * 1) / n)));
   const bottom = mercToLat(Math.PI * (1 - 2 * ((y + 1) * (1 / n))));
   const left = x * (360 / n) - 180;
   const right = left + 360 / n;

   return [left, bottom, right, top];
}

export class Graph {
   /** Weights assigned to node-node travel */
   routing: { [fromNodeID: number]: { [toNodeID: number]: number } };
   /** Node `[latitude, longitude]` keyed to ID */
   locations: { [key: number]: [number, number] };
   /** Required Node ID moves keyed to triggering node list */
   mandatoryMoves: { [nodeIdList: string]: number[] };
   /** Moves disallowed by turn restrictions */
   forbiddenMoves: { [nodeIdList: string]: boolean };
   /** Cached tiles */
   tiles: { [id: string]: boolean };
   /** Mode of transportation */
   transport: string;
   spec: RouteSpec;

   constructor(
      transport: RouteSpec | Transport,
      localFile = false,
      expireData = 30
   ) {
      this.routing = {};

      if (is.object<RouteSpec>(transport)) {
         this.transport = transport.name!;
         this.spec = transport;
      } else {
         this.transport = transport;
         // TODO: clone instead of assign
         this.spec = routeModes[transport];
      }
   }

   /**
    * Whether mode of transportation is allowed along the given OSM `Way` as
    * indicated by its tags.
    */
   private isAccessible(tags: Tags): boolean {
      let allowed = true;

      forEach(this.spec.access, key => {
         if (key in tags) {
            allowed = !(tags[key] in accessDenied);
         }
      });

      return allowed;
   }

   nodeLatLon = (nodeID: number) => this.locations[nodeID];

   /**
    * Ensure tiles are available for routing.
    */
   ensureTiles(lat: number, lon: number) {
      const [x, y] = whichTile(lat, lon);
      const tileID = `${x},${y}`;

      if (tileID in this.tiles) {
         return;
      }
      this.tiles[tileID] = true;

      const [left, bottom, right, top] = tileBoundary(x, y);
      const url = `https://api.openstreetmap.org/api/0.6/map?bbox=${left},${bottom},${right},${top}`;
   }

   addTile(tile: Tile) {
      forEachKeyValue(tile.ways, (_, way) => this.addWay(way));
      forEach(tile.relations, this.findRestrictions);
   }

   /**
    * @param p1 Latitude/Longitude tuple
    * @param p2 Latitude/Longitude tuple
    */
   distance = (p1: [number, number], p2: [number, number]) =>
      measure.distanceLatLon(p1, p2);

   /* eslint-disable prefer-destructuring, dot-notation */
   addWay(way: Way) {
      let oneway = '';
      let weight = 0;

      const prepareCache = (n: Node) => {
         if (!(n.id in this.locations)) {
            this.locations[n.id] = [n.lat, n.lon];
         }
         if (!(n.id in this.routing)) {
            this.routing[n.id] = new Object(null) as { [id: number]: number };
         }
      };

      if (way.tags !== undefined) {
         const roadType = way.tags[Tag.RoadType] ?? '';
         const railType = way.tags[Tag.RailType] ?? '';
         const junction = way.tags[Tag.JunctionType] ?? '';

         oneway = way.tags[Tag.OneWay] ?? '';

         if (
            is.empty(oneway) &&
            (['roundabout', 'circular'].includes(junction) ||
               roadType == WayType.Freeway)
         ) {
            // infer one-way for roundabouts and freeways if not already defined
            oneway = 'yes';
         }

         if (
            this.transport == Transport.Walk ||
            (['yes', 'true', '1', '-1'].includes(oneway) &&
               way.tags[Tag.OneWay + ':' + this.transport] == 'no')
         ) {
            // disable oneway setting for foot traffic or explicit tag
            oneway = 'no';
         }

         // calculate what vehicles can use this route
         weight =
            this.spec.weights[roadType] ?? this.spec.weights[railType] ?? 0;
      }

      for (let i = 1; i < way.nodes.length; i++) {
         const n1 = way.nodes[(i = 1)];
         const n2 = way.nodes[i];

         prepareCache(n1);
         prepareCache(n2);

         if (!['-1', 'reverse'].includes(oneway)) {
            this.routing[n1.id][n2.id] = weight;
         }
         if (!['yes', 'true', 'one'].includes(oneway)) {
            this.routing[n2.id][n1.id] = weight;
         }
      }
   }

   findRestrictions(r: Relation) {
      if (r.tags === undefined) {
         return;
      }
      const specificRestriction = Tag.Restriction + ':' + this.transport;

      if (
         [Tag.Restriction, specificRestriction].includes(r.tags[Tag.Type] ?? '')
      ) {
         // ignore relations that aren't restrictions
         return;
      }

      if (
         intersects((r.tags[Tag.Exception] ?? '').split(';'), this.spec.access)
      ) {
         // ignore restrictions if access type is an explicit exception
         return;
      }

      if (
         this.transport == Transport.Walk &&
         r.tags[Tag.Type] != specificRestriction &&
         !(specificRestriction in r.tags)
      ) {
         // ignore walking restrictions if not explicit
         return;
      }

      const restrictionType =
         r.tags[specificRestriction] ?? r.tags[Tag.Restriction];

      if (
         restrictionType === null ||
         !accessRestriction.test(restrictionType)
      ) {
         // missing or inapplicable restriction type
         return;
      }

      const from = r.members.find(m => m.role == Role.From);
      const to = r.members.find(m => m.role == Role.To);

      if (from !== undefined && to !== undefined) {
         const nodeGroups: Node[][] = [from.nodes];

         r.members
            .filter(m => m.role == Role.Via)
            .forEach(m => {
               nodeGroups.push(m.nodes);
            });

         nodeGroups.push(to.nodes);

         this.addRestriction(r.id, restrictionType, nodeGroups);
      }
   }

   /**
    * Sort node lists so common nodes are adjacent.
    * @example
    * [
    *    [a, b], [b, c], [c], [c, d, e], [e, f]
    * ]
    */
   addRestriction(relationID: number, type: string, nodes: Node[][]) {
      const sharedNode = (nodes1: Node[], nodes2: Node[]) =>
         nodes1.find(n => nodes2.includes(n));

      for (let i = 0, j = 1; i < nodes.length - 1; i++, j++) {
         /** Node that both groups have in common */
         const common = sharedNode(nodes[i], nodes[j]);

         if (common === undefined) {
            console.error(
               `No common node connecting relation ${relationID} members`
            );
            return;
         }

         /** Last index of first group */
         const last = nodes[i].length - 1;

         if (nodes[j][0] !== common) {
            // reverse if first node of second group isn't the common node
            nodes[j] = reverse(nodes[j]);
         }

         if (i == 0 && nodes[i][last] !== common) {
            // only the "from" way can be reversed while ordering the nodes,
            // otherwise, the x way could be reversed twice (as member[x] and member[x+1])
            nodes[i] = reverse(nodes[i]);
         }

         if (nodes[i][last] !== nodes[j][0]) {
            console.error(
               `Relation ${relationID} member common nodes are not adjacent`
            );
            return;
         }
      }

      const fromNodeIDs = (): number[] => [
         // TODO: this will error on array length 1
         nodes[0][nodes[0].length - 2].id,
         nodes[1][0].id
      ];

      /**
       * Node IDs between "from" and "to" and excluding common IDs connecting
       * member groups.
       */
      const viaNodeIDs = (): number[] => {
         const via: number[] = [];

         for (let i = 1; i < nodes.length - 1; i++) {
            // skip first group since it was the "from" group
            for (let j = 1; j < nodes[i].length; j++) {
               // skip first node since that should be duplicate connector
               via.push(nodes[i][j].id);
            }
         }
         return via;
      };

      /**
       * First unique Node ID in "to" group.
       */
      const toNodeID = (): number => nodes[nodes.length - 1][1].id;

      if (noAccess.test(type)) {
         const key: number[] = [...fromNodeIDs(), ...viaNodeIDs(), toNodeID()];
         this.forbiddenMoves[key.join(',')] = true;
      } else if (onlyAccess.test(type)) {
         const key: number[] = [...fromNodeIDs(), toNodeID()];
         this.mandatoryMoves[key.join(',')] = viaNodeIDs();
      }
   }

   /**
    * Find nearest node that be the start of a route.
    */
   findNearestNodeID(lat: number, lon: number): string | null {
      this.ensureTiles(lat, lon);
      let nodeDistance = Number.MAX_VALUE;
      let nearestNodeID: string | null = null;

      forEachKeyValue(this.locations, (nodeID, point) => {
         const distance = measure.distance(point[0], point[1], lat, lon);
         if (distance < nodeDistance) {
            nodeDistance = distance;
            nearestNodeID = nodeID;
         }
      });

      return nearestNodeID;
   }
}
