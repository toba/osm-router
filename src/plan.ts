export interface PlanItem {
   /** Node IDs */
   nodes: number[];
   cost: number;
   heuristicCost?: number;
   /** IDs of nodes that must be traversed in this plan */
   mandatoryNodes: number[];
   endNode?: number;
}

/**
 * Route plan
 */
export class Plan {}
