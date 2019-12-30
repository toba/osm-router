import { removeItem, forEach } from '@toba/node-tools';
import { Graph } from './graph';
import { PlanItem } from './plan';

export const enum Status {
   NoRoute,
   Success,
   GaveUp
}

class Route extends Graph {
   /**
    *
    * @param startNode Node ID
    * @param endNode Node ID
    */
   execute(startNode: number, endNode: number): [Status, number[]] {
      const plans: PlanItem[] = [];
      const firstEnd = endNode;
      const closed = new Set([startNode]);

      let closeNode = true;

      const addToPlans = (
         start: number,
         end: number,
         plan: PlanItem,
         weight = 1
      ) => {
         if (weight == 0) {
            // ignore non-traversible route
            return;
         }
         if (!(this.locations.has(end) && this.locations.has(start))) {
            // nodes must have positions
            return;
         }

         const endLatLon = this.locations.get(end)!;
         const startLatLon = this.locations.get(start)!;
         const sequence = plan.nodes;

         if (sequence.length >= 2 && sequence[sequence.length - 2] == end) {
            // do not turn around at a node (i.e. a-b-a)
            return;
         }

         this.ensureTiles(endLatLon[0], endLatLon[1]);

         const edgeCost = this.distance(startLatLon, endLatLon) / weight;
         const totalCost = plan.cost + edgeCost;
         const heuristicCost =
            totalCost + this.distance(endLatLon, this.locations.get(firstEnd)!);
         const allNodes = [end].concat(plan.nodes);
         const nodeList = allNodes.join(',');

         /* eslint-disable consistent-return */
         this.forbiddenMoves.forEach((active, pattern) => {
            if (active && nodeList.includes(pattern)) {
               closeNode = false;
            }
         });

         // check if there is already a way to the end node
         const endQueueItem = plans.find(q => q.endNode === end);

         if (endQueueItem !== undefined) {
            if (endQueueItem.cost < totalCost) {
               // If we do, and known totalCost to end is lower we can ignore the queueSoFar path
               return;
            }
            // If the queued way to end has higher total cost, remove it (and add the queueSoFar scenario, as it's cheaper)
            removeItem(plans, endQueueItem);
         }

         let forceNextNodes: number[] = [];

         if (
            plan.mandatoryNodes !== undefined &&
            plan.mandatoryNodes.length > 0
         ) {
            forceNextNodes = plan.mandatoryNodes;
         } else {
            this.mandatoryMoves.forEach((nodes, pattern) => {
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
            endNode: end,
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

      if (!this.preferences.has(startNode)) {
         throw new Error(`Node ${startNode} does not exist in the graph`);
      }

      if (startNode == endNode) {
         return [Status.NoRoute, []];
      }

      this.preferences.get(startNode)!.forEach((weight, linkedNode) => {
         addToPlans(
            startNode,
            linkedNode,
            {
               cost: 0,
               nodes: [startNode],
               mandatoryNodes: []
            },
            weight
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
               this.preferences.has(consideredNode) &&
               this.preferences.get(consideredNode)!.has(nextNode)
            ) {
               addToPlans(
                  consideredNode,
                  nextNode,
                  nextPlan,
                  this.preferences.get(consideredNode)!.get(nextNode)
               );
            }
         } else if (this.preferences.has(consideredNode)) {
            this.preferences.get(consideredNode)!.forEach((weight, nextNode) => {
               if (!closed.has(nextNode)) {
                  addToPlans(consideredNode, nextNode, nextPlan, weight);
               }
            });
         }

         if (closeNode) {
            closed.add(consideredNode);
         }
      }
      return [Status.GaveUp, []];
   }
}
