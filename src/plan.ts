import { measure } from '@toba/map';
import { removeItem, forEach } from '@toba/tools';
import { Node, Point, Status } from './types';
import { Graph } from './graph';
import { Restrictions } from './restriction';
import { nextToLast } from './sequence';

export interface PlanItem {
   /** Node IDs */
   nodes: number[];
   /** Cost of connecting start and end nodes */
   cost: number;
   heuristicCost?: number;
   /** IDs of nodes that must be traversed in this plan */
   required: number[];
   endNode?: number;
}

/**
 * Route plan
 */
export class Plan {
   graph: Graph;
   rules: Restrictions;
   nodes: Map<number, Node>;
   items: PlanItem[];
   closed: Set<number>;
   closeNode = true;
   endPoint: Point;

   constructor(nodes: Map<number, Node>, graph: Graph, rules: Restrictions) {
      this.graph = graph;
      this.rules = rules;
      this.nodes = nodes;
   }

   prepare(startNode: number, endNode: number): boolean {
      this.items = [];
      this.closed = new Set([startNode]);
      this.graph.ensure(startNode, endNode);

      if (startNode == endNode) {
         return false;
      }
      this.closeNode = true;
      this.endPoint = this.nodes.get(endNode)!.point();
      this.graph.each(startNode, (weight, linkedNode) => {
         this.add(
            startNode,
            linkedNode,
            {
               cost: 0,
               nodes: [startNode],
               required: []
            },
            weight
         );
      });

      return true;
   }

   get length() {
      return this.items.length;
   }

   /**
    * Find lowest cost node sequence to reach end node within maximum
    * iterations.
    */
   find(endNode: number, max: number): [Status, number[]?] {
      let count = 0;

      while (count < max) {
         count++;
         this.closeNode = true;
         let nextPlan: PlanItem;

         if (this.items.length > 0) {
            nextPlan = this.items.pop()!;
         } else {
            return [Status.NoRoute];
         }

         // TODO: validate assertion
         const consideredNode = nextPlan.endNode!;

         if (this.closed.has(consideredNode)) {
            // eslint-disable-next-line
            continue;
         }

         if (consideredNode === endNode) {
            return [Status.Success, nextPlan.nodes];
         }

         if (nextPlan.required.length > 0) {
            this.closeNode = false;
            const nextNode = nextPlan.required.shift()!;

            if (
               this.graph.has(nextNode) &&
               this.graph.has(consideredNode, nextNode)
            ) {
               this.add(
                  consideredNode,
                  nextNode,
                  nextPlan,
                  this.graph.weight(consideredNode, nextNode)
               );
            }
         } else if (this.graph.has(consideredNode)) {
            this.graph.each(consideredNode, (weight, nextNode) => {
               if (!this.closed.has(nextNode)) {
                  this.add(consideredNode, nextNode, nextPlan, weight);
               }
            });
         }

         if (this.closeNode) {
            this.closed.add(consideredNode);
         }
      }

      return [Status.GaveUp];
   }

   /**
    * Whether nodes with IDs have been cached.
    */
   hasNodes = (...nodes: number[]): boolean =>
      nodes.findIndex(n => !this.nodes.has(n)) == -1;

   add(fromNode: number, toNode: number, plan: PlanItem, weight = 1) {
      if (weight == 0) {
         // ignore non-traversible route
         return;
      }
      if (!this.hasNodes(toNode, fromNode)) {
         // nodes must be known
         return;
      }

      const toLatLon = this.nodes.get(toNode)!.point();
      const fromLatLon = this.nodes.get(fromNode)!.point();
      /** Sequence of node IDs */
      const sequence = plan.nodes;

      if (nextToLast(sequence) == toNode) {
         // do not turn around at a node (i.e. a->b->a)
         return;
      }

      // ensure tiles

      /**
       * Cost of connecting two nodes — higher preference means lower cost
       */
      const edgeCost = measure.distanceLatLon(fromLatLon, toLatLon) / weight;
      const totalCost = plan.cost + edgeCost;
      const heuristicCost =
         totalCost + measure.distanceLatLon(toLatLon, this.endPoint);
      const allNodes = [toNode].concat(plan.nodes);

      if (this.rules.isForbidden(allNodes)) {
         this.closeNode = true;
      }

      // check if there is already a way to the end node
      const endPlanItem = this.items.find(p => p.endNode === toNode);

      if (endPlanItem !== undefined) {
         if (endPlanItem.cost < totalCost) {
            // If we do, and known totalCost to end is lower we can ignore the queueSoFar path
            return;
         }
         // If the queued way to end has higher total cost, remove it (and add the queueSoFar scenario, as it's cheaper)
         this.remove(endPlanItem);
      }

      let required: number[] = [];

      if (plan.required.length > 0) {
         required = plan.required;
      } else {
         required = this.rules.getMandatory(allNodes);

         if (required.length > 0) {
            this.closeNode = false;
         }
      }

      const nextPlan: PlanItem = {
         cost: totalCost,
         heuristicCost,
         nodes: allNodes,
         endNode: toNode,
         required
      };

      // Try to insert, keeping the queue ordered by decreasing heuristic cost
      let count = 0;
      let inserted = false;

      forEach(this.items, q => {
         // TODO: better filter?
         if ((q.heuristicCost ?? 0) > (nextPlan.heuristicCost ?? 0)) {
            this.insert(count, nextPlan);
            inserted = true;
         }
         count++;
      });

      if (!inserted) {
         this.items.push(nextPlan);
      }
   }

   /**
    * Remove item from the plan list.
    */
   remove = (item: PlanItem) => removeItem(this.items, item);

   /**
    * Insert item into plan list at `index` position.
    */
   insert = (index: number, item: PlanItem) =>
      this.items.splice(index, 0, item);
}
