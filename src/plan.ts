export interface PlanItem {
   /** Node IDs */
   nodes: number[];
   cost: number;
   heuristicCost?: number;
   /** Node IDs */
   mandatoryNodes: number[];
   endNode?: number;
}

/**
 * Route plan
 */
export class Plan {}
