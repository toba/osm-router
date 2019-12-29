import { forEachKeyValue, removeItem } from '@toba/node-tools';
import { Graph } from './graph';
import { forEach } from '.';

type Point = [number, number];

interface QueueItem {
   nodeIDs: number[];
   cost: number;
   heuristicCost: number;
   mandatoryNodeIDs: number[];
   end: number;
}

class Route extends Graph {
   /**
    * @param start Node ID
    * @param end Node ID
    */
   execute(start: number, end: number): [string, number[]] {
      const queue: QueueItem[] = [];
      const firstEnd = end;

      let closeNode = true;

      const addToQueue = (
         start: number,
         end: number,
         queueSoFar: QueueItem,
         weight = 1
      ) => {
         if (weight == 0) {
            // ignore non-traversible route
            return;
         }
         if (!(end in this.locations && start in this.locations)) {
            // nodes must have positions
            return;
         }

         const endLatLon = this.locations[end];
         const startLatLon = this.locations[start];
         const sequence = queueSoFar.nodeIDs;

         if (sequence.length >= 2 && sequence[sequence.length - 2] == end) {
            // do not turn around at a node (i.e. a-b-a)
            return;
         }

         this.ensureTiles(endLatLon[0], endLatLon[1]);

         const edgeCost = this.distance(startLatLon, endLatLon) / weight;
         const totalCost = queueSoFar.cost + edgeCost;
         const heuristicCost =
            totalCost + this.distance(endLatLon, this.locations[firstEnd]);
         const allNodes = [end].concat(queueSoFar.nodeIDs);
         const nodeList = allNodes.join(',');

         /* eslint-disable consistent-return */
         forEachKeyValue(this.forbiddenMoves, (pattern, enabled) => {
            if (nodeList.includes(pattern)) {
               closeNode = false;
               return false;
            }
         });

         // check if there is already a way to the end node
         const endQueueItem = queue.find(q => q.end === end);

         if (endQueueItem !== undefined) {
            if (endQueueItem.cost < totalCost) {
               // If we do, and known totalCost to end is lower we can ignore the queueSoFar path
               return;
            }
            // If the queued way to end has higher total cost, remove it (and add the queueSoFar scenario, as it's cheaper)
            removeItem(queue, endQueueItem);
         }

         let forceNextNodes: number[] = [];

         if (queueSoFar.mandatoryNodeIDs.length > 0) {
            forceNextNodes = queueSoFar.mandatoryNodeIDs;
         } else {
            forEachKeyValue(this.mandatoryMoves, (pattern, nodes) => {
               if (nodeList.endsWith(pattern)) {
                  closeNode = false;
                  // TODO: need to copy not assign
                  forceNextNodes = nodes;
                  return false;
               }
            });
         }

         const queueItem: QueueItem = {
            cost: totalCost,
            heuristicCost,
            nodeIDs: allNodes,
            end,
            mandatoryNodeIDs: forceNextNodes
         };

         // Try to insert, keeping the queue ordered by decreasing heuristic cost
         let count = 0;
         let inserted = false;

         forEach(queue, q => {
            if (q.heuristicCost > queueItem.heuristicCost) {
               queue.splice(count, 0, queueItem);
               inserted = true;
               return false;
            }
            count++;
         });

         if (!inserted) {
            queue.push(queueItem);
         }
      };

      if (!(start in this.routing)) {
         throw new Error(`Node ${start} does not exist in the graph`);
      }

      if (start == end) {
         return ['no_route', []];
      }
   }
}
