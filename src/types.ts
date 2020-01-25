import { Tag } from '@toba/osm-models'

/**
 * Permitted access types and road or rail type weighting that together define
 * routing preferences.
 */
export interface RouteConfig {
   name: string
   /**
    * Weights keyed to road types — larger numbers indicate stronger
    * preference
    */
   weights: { [key: string]: number }
   /**
    * Usable access types ordered by specificity. The first item should be most
    * general and the last most specific so when iterated, later types can
    * override earlier ones.
    */
   canUse: Tag[]
}

export type RouteMode = { [key: string]: RouteConfig }

/**
 * Result of routing request.
 */
export const enum Status {
   /** Start and end nodes are not connected */
   NoRoute,
   /** Found series of nodes connecting start to end */
   Success,
   /**
    * Maximum tries exceeded searching for connection between start and end
    * nodes
    */
   GaveUp
}
