import { measure } from '@toba/map';
import { is, forEach, intersects, reverse } from '@toba/node-tools';
import {
   RouteConfig,
   Transport,
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
import { whichTile } from './tile';
import { routeModes } from './config';

// https://www.measurethat.net/Benchmarks/Show/4797/1/js-regex-vs-startswith-vs-indexof
const noAccess = /^no_/;
const onlyAccess = /^only_/;
const accessRestriction = /^(no|only)_/;

export class Graph {
   nodes: Map<number, Node>;
   /** Required Node ID moves keyed to triggering node list */
   mandatoryMoves: Map<string, number[]>;
   /** Moves disallowed by turn restrictions */
   forbiddenMoves: Map<string, boolean>;
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
      //this.nodes = new Map();
      //this.weights = new Map();
      //this.locations = new Map();
      this.mandatoryMoves = new Map();
      this.forbiddenMoves = new Map();
      this.tiles = new Map();

      if (is.object<RouteConfig>(transport)) {
         this.transport = transport.name!;
         this.config = transport;
      } else {
         this.transport = transport;
         // TODO: clone instead of assign
         this.config = routeModes[transport];
      }

      if (tile !== undefined) {
         this.addTile(tile);
      }
   }

   /**
    * Whether mode of transportation is allowed along the given OSM `Way` as
    * indicated by its tags.
    */
   private isAccessible(tags: Tags): boolean {
      let allowed = true;

      forEach(this.config.access, key => {
         if (key in tags) {
            allowed = !(tags[key] in accessDenied);
         }
      });

      return allowed;
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
      tile.ways.forEach(way => this.makeConnections(way));
      forEach(tile.relations, this.findRestrictions.bind(this));
   }

   /**
    * @param p1 Latitude/Longitude tuple
    * @param p2 Latitude/Longitude tuple
    */
   distance = (p1: [number, number], p2: [number, number]) =>
      measure.distanceLatLon(p1, p2);

   /* eslint-disable prefer-destructuring, dot-notation */
   makeConnections(way: Way) {
      let oneway = '';
      let weight = 0;

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
            this.config.weights[roadType] ?? this.config.weights[railType] ?? 0;
      }

      for (let i = 1; i < way.nodes.length; i++) {
         const n1 = way.nodes[i - 1];
         const n2 = way.nodes[i];

         if (!['-1', 'reverse'].includes(oneway)) {
            // TODO: connection can't be stored within node instance becaues
            // it needs to vary by transport type
            n1.connect(n2, weight);
         }
         if (!['yes', 'true', 'one'].includes(oneway)) {
            n2.connect(n1, weight);
         }
      }
   }

   findRestrictions(r: Relation) {
      if (r.tags === undefined) {
         return;
      }
      const specificRestriction = Tag.Restriction + ':' + this.transport;

      if (
         intersects(
            (r.tags[Tag.Exception] ?? '').split(';'),
            this.config.access
         )
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
    * Sort node groups so common nodes are adjacent.
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
         this.forbiddenMoves.set(key.join(','), true);
      } else if (onlyAccess.test(type)) {
         const key: number[] = [...fromNodeIDs(), toNodeID()];
         this.mandatoryMoves.set(key.join(','), viaNodeIDs());
      }
   }

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
