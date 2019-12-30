import { removeItem, forEach } from '@toba/node-tools';
import { Graph } from './graph';
import { PlanItem } from './plan';
import { nextToLast } from './segment';

export const enum Status {
   NoRoute,
   Success,
   GaveUp
}

export class Route extends Graph {
   /**
    * Find route between two known nodes.
    * @param startNode Node ID
    * @param endNode Node ID
    */
   execute(startNode: number, endNode: number): [Status, number[]] {
      const plans: PlanItem[] = [];
      const firstEnd = endNode;
      const closed = new Set([startNode]);

      let closeNode = true;

      const addToPlans = (
         fromNode: number,
         toNode: number,
         plan: PlanItem,
         preference = 1
      ) => {
         if (preference == 0) {
            // ignore non-traversible route
            return;
         }
         if (!(this.nodes.has(toNode) && this.nodes.has(fromNode))) {
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

         this.ensureTiles(toLatLon[0], toLatLon[1]);

         /**
          * Higher preference means lower cost.
          */
         const edgeCost = this.distance(fromLatLon, toLatLon) / preference;
         const totalCost = plan.cost + edgeCost;
         const heuristicCost =
            totalCost +
            this.distance(toLatLon, this.nodes.get(firstEnd)!.point());
         const allNodes = [toNode].concat(plan.nodes);
         const nodeList = allNodes.join(',');

         /* eslint-disable consistent-return */
         this.restrictions.eachForbidden((active, pattern) => {
            if (active && nodeList.includes(pattern)) {
               closeNode = false;
            }
         });

         // check if there is already a way to the end node
         const endQueueItem = plans.find(q => q.endNode === toNode);

         if (endQueueItem !== undefined) {
            if (endQueueItem.cost < totalCost) {
               // If we do, and known totalCost to end is lower we can ignore the queueSoFar path
               return;
            }
            // If the queued way to end has higher total cost, remove it (and add the queueSoFar scenario, as it's cheaper)
            removeItem(plans, endQueueItem);
         }

         let forceNextNodes: number[] = [];

         if (plan.mandatoryNodes.length > 0) {
            forceNextNodes = plan.mandatoryNodes;
         } else {
            this.restrictions.eachMandatory((nodes, pattern) => {
               if (nodeList.endsWith(pattern)) {
                  closeNode = false;
                  // TODO: need to copy not assign
                  forceNextNodes = nodes;
               }
            });
         }

         const nextPlan: PlanItem = {
            cost: totalCost,
            heuristicCost,
            nodes: allNodes,
            endNode: toNode,
            mandatoryNodes: forceNextNodes
         };

         // Try to insert, keeping the queue ordered by decreasing heuristic cost
         let count = 0;
         let inserted = false;

         forEach(plans, q => {
            // TODO: better filter?
            if ((q.heuristicCost ?? 0) > (nextPlan.heuristicCost ?? 0)) {
               plans.splice(count, 0, nextPlan);
               inserted = true;
               return false;
            }
            count++;
         });

         if (!inserted) {
            plans.push(nextPlan);
         }
      };

      this.preferences.ensure(startNode, endNode);

      if (startNode == endNode) {
         return [Status.NoRoute, []];
      }

      // start new plan for each node connected to the startNode
      this.preferences.eachConnection(startNode, (preference, linkedNode) => {
         addToPlans(
            startNode,
            linkedNode,
            {
               cost: 0,
               nodes: [startNode],
               mandatoryNodes: []
            },
            preference
         );
      });

      // limit search duration
      let count = 0;

      while (count < 1000000) {
         count++;
         closeNode = true;
         let nextPlan: PlanItem;

         if (plans.length > 0) {
            nextPlan = plans.pop()!;
         } else {
            return [Status.NoRoute, []];
         }

         // TODO: validate assertion
         const consideredNode = nextPlan.endNode!;

         if (closed.has(consideredNode)) {
            // eslint-disable-next-line
            continue;
         }

         if (consideredNode === endNode) {
            return [Status.Success, nextPlan.nodes];
         }

         if (nextPlan.mandatoryNodes.length > 0) {
            closeNode = false;
            const nextNode = nextPlan.mandatoryNodes.shift()!;

            if (
               this.preferences.has(nextNode) &&
               this.preferences.has(consideredNode, nextNode)
            ) {
               addToPlans(
                  consideredNode,
                  nextNode,
                  nextPlan,
                  this.preferences.value(consideredNode, nextNode)
               );
            }
         } else if (this.preferences.has(consideredNode)) {
            this.preferences.eachConnection(
               consideredNode,
               (weight, nextNode) => {
                  if (!closed.has(nextNode)) {
                     addToPlans(consideredNode, nextNode, nextPlan, weight);
                  }
               }
            );
         }

         if (closeNode) {
            closed.add(consideredNode);
         }
      }
      return [Status.GaveUp, []];
   }
}
