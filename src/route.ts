import { measure } from '@toba/map';
import { is, forEach, removeItem } from '@toba/node-tools';
import { RouteConfig, TravelMode, Node, Tile, Point } from './types';
import { whichTile } from './tile';
import { preferences } from './config';
import { Graph } from './graph';
import { Restrictions } from './restriction';
import { PlanItem, Plan } from './plan';
import { nextToLast } from './sequence';

export const enum Status {
   NoRoute,
   Success,
   GaveUp
}

/**
 * @see https://jakobmiksch.eu/post/openstreetmap_routing/
 */
export class Route {
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

   nodeLatLon = (nodeID: number) => this.nodes.get(nodeID)?.point();

   /**
    * Whether nodes with IDs have been cached.
    */
   hasNodes = (...nodes: number[]): boolean =>
      nodes.findIndex(n => !this.nodes.has(n)) == -1;

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
   execute(startNode: number, endNode: number): [Status, number[]] {
      const plan = new Plan(this.nodes, this.graph, this.rules);

      if (!plan.prepare(startNode, endNode)) {
         return [Status.NoRoute, []];
      }

      plan.search(endNode, 100000);

      // const plans: PlanItem[] = [];
      // const closed = new Set([startNode]);

      // this.graph.ensure(startNode, endNode);

      // if (startNode == endNode) {
      //    return [Status.NoRoute, []];
      // }
      // const endPoint = this.nodes.get(endNode)!.point();

      // let closeNode = true;

      // const addToPlans = (
      //    fromNode: number,
      //    toNode: number,
      //    plan: PlanItem,
      //    weight = 1
      // ) => {
      //    if (weight == 0) {
      //       // ignore non-traversible route
      //       return;
      //    }

      //    if (!this.hasNodes(toNode, fromNode)) {
      //       // nodes must be known
      //       return;
      //    }

      //    const toLatLon = this.nodes.get(toNode)!.point();
      //    const fromLatLon = this.nodes.get(fromNode)!.point();
      //    /** Sequence of node IDs */
      //    const sequence = plan.nodes;

      //    if (nextToLast(sequence) == toNode) {
      //       // do not turn around at a node (i.e. a->b->a)
      //       return;
      //    }

      //    this.ensureTiles(toLatLon[0], toLatLon[1]);

      //    /**
      //     * Cost of connecting two nodes — higher preference means lower cost
      //     */
      //    const edgeCost = this.distance(fromLatLon, toLatLon) / weight;
      //    const totalCost = plan.cost + edgeCost;
      //    const heuristicCost = totalCost + this.distance(toLatLon, endPoint);
      //    const allNodes = [toNode].concat(plan.nodes);

      //    if (this.rules.isForbidden(allNodes)) {
      //       closeNode = true;
      //    }

      //    // check if there is already a way to the end node
      //    const endPlanItem = plans.find(q => q.endNode === toNode);

      //    if (endPlanItem !== undefined) {
      //       if (endPlanItem.cost < totalCost) {
      //          // If we do, and known totalCost to end is lower we can ignore the queueSoFar path
      //          return;
      //       }
      //       // If the queued way to end has higher total cost, remove it (and add the queueSoFar scenario, as it's cheaper)
      //       removeItem(plans, endPlanItem);
      //    }

      //    let forceNextNodes: number[] = [];

      //    if (plan.mandatoryNodes.length > 0) {
      //       forceNextNodes = plan.mandatoryNodes;
      //    } else {
      //       forceNextNodes = this.rules.getMandatory(allNodes);
      //       if (forceNextNodes.length > 0) {
      //          closeNode = false;
      //       }
      //    }

      //    const nextPlan: PlanItem = {
      //       cost: totalCost,
      //       heuristicCost,
      //       nodes: allNodes,
      //       endNode: toNode,
      //       mandatoryNodes: forceNextNodes
      //    };

      //    // Try to insert, keeping the queue ordered by decreasing heuristic cost
      //    let count = 0;
      //    let inserted = false;

      //    forEach(plans, q => {
      //       // TODO: better filter?
      //       if ((q.heuristicCost ?? 0) > (nextPlan.heuristicCost ?? 0)) {
      //          plans.splice(count, 0, nextPlan);
      //          inserted = true;
      //          return false;
      //       }
      //       count++;
      //    });

      //    if (!inserted) {
      //       plans.push(nextPlan);
      //    }
      // };

      // start new plan for each node connected to the startNode
      // this.graph.each(startNode, (weight, linkedNode) => {
      //    addToPlans(
      //       startNode,
      //       linkedNode,
      //       {
      //          cost: 0,
      //          nodes: [startNode],
      //          mandatoryNodes: []
      //       },
      //       weight
      //    );
      // });

      // limit search duration
      // let count = 0;

      // while (count < 1000000) {
      //    count++;
      //    closeNode = true;
      //    let nextPlan: PlanItem;

      //    if (plans.length > 0) {
      //       nextPlan = plans.pop()!;
      //    } else {
      //       return [Status.NoRoute, []];
      //    }

      //    // TODO: validate assertion
      //    const consideredNode = nextPlan.endNode!;

      //    if (closed.has(consideredNode)) {
      //       // eslint-disable-next-line
      //       continue;
      //    }

      //    if (consideredNode === endNode) {
      //       return [Status.Success, nextPlan.nodes];
      //    }

      //    if (nextPlan.mandatoryNodes.length > 0) {
      //       closeNode = false;
      //       const nextNode = nextPlan.mandatoryNodes.shift()!;

      //       if (
      //          this.graph.has(nextNode) &&
      //          this.graph.has(consideredNode, nextNode)
      //       ) {
      //          addToPlans(
      //             consideredNode,
      //             nextNode,
      //             nextPlan,
      //             this.graph.value(consideredNode, nextNode)
      //          );
      //       }
      //    } else if (this.graph.has(consideredNode)) {
      //       this.graph.each(consideredNode, (weight, nextNode) => {
      //          if (!closed.has(nextNode)) {
      //             addToPlans(consideredNode, nextNode, nextPlan, weight);
      //          }
      //       });
      //    }

      //    if (closeNode) {
      //       closed.add(consideredNode);
      //    }
      // }
      return [Status.GaveUp, []];
   }
}
