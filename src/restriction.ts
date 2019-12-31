import { intersects, forEach } from '@toba/node-tools';
import { Relation, Tag, TravelMode, RouteConfig, TagMap } from './types';
import { Sequence } from './sequence';

// https://www.measurethat.net/Benchmarks/Show/4797/1/js-regex-vs-startswith-vs-indexof
const forbidPrefix = /^no_/;
const requirePrefix = /^only_/;
const restrictPrefix = /^(no|only)_/;
const noAccess = /^(no|private)$/;

/**
 * Whether mode of transportation is allowed along the given OSM way as
 * indicated by its tags.
 */
export function allowTransport(wayTags: TagMap, accessTypes: Tag[]): boolean {
   let allow = true;

   forEach(accessTypes, tag => {
      if (tag in wayTags) {
         const value = wayTags[tag];
         allow = value === undefined || !noAccess.test(value);
      }
   });

   return allow;
}

/**
 * @param nodeIDs Sequence of IDs that trigger the restriction
 */
function addRestriction<T>(
   hash: Map<string, T>,
   value: T,
   nodeIDs: number[],
   toNode: number
) {
   nodeIDs.push(toNode);
   hash.set(nodeIDs.join(','), value);
}

/**
 * Mandatory or forbidden node sequences for type of transport.
 */
export class Restrictions {
   /**
    * Node sequence that is required if the key sequence is encountered. The key
    * is a text list of node IDs ("45,6,3") and the value is an array of node
    * IDs.
    */
   mandatory: Map<string, number[]>;
   forbidden: Map<string, boolean>;
   /** Mode of transportation */
   travelMode: string;
   config: RouteConfig;

   constructor(config: RouteConfig, travelMode: string) {
      this.travelMode = travelMode;
      this.config = config;
      this.mandatory = new Map();
      this.forbidden = new Map();
   }

   /**
    * Build restrictions from OSM relation members.
    */
   fromRelation(r: Relation) {
      const restrictionType = this.getRestrictionType(r);

      if (restrictionType === null) {
         return;
      }
      const sequence = new Sequence(r);

      if (sequence.sort().valid) {
         if (forbidPrefix.test(restrictionType)) {
            addRestriction(
               this.forbidden,
               true,
               [...sequence.fromNodes(), ...sequence.viaNodes()],
               sequence.toNode()
            );
         } else if (requirePrefix.test(restrictionType)) {
            addRestriction(
               this.mandatory,
               sequence.viaNodes(),
               sequence.fromNodes(),
               sequence.toNode()
            );
         }
      } else {
         console.error(`Relation ${r.id} could not be processed`);
      }
   }

   /**
    * Retrieve restriction type from relation or `null` if there are no
    * applicable restrictions.
    */
   private getRestrictionType(r: Relation): string | null {
      const exceptions = r.tags[Tag.Exception]?.split(';') ?? [];

      if (intersects(exceptions, this.config.canUse)) {
         // ignore restrictions if usable access is specifically exempted
         return null;
      }

      const specificRestriction = Tag.Restriction + ':' + this.travelMode;

      if (
         this.travelMode == TravelMode.Walk &&
         r.tags[Tag.Type] != specificRestriction &&
         !(specificRestriction in r.tags)
      ) {
         // ignore walking restrictions if not explicit
         return null;
      }

      /**
       * General restriction or restriction on specific mode of transportation
       */
      const restrictionType =
         r.tags[specificRestriction] ?? r.tags[Tag.Restriction];

      if (
         restrictionType === undefined ||
         !restrictPrefix.test(restrictionType)
      ) {
         // missing or inapplicable restriction type
         return null;
      }

      return restrictionType;
   }

   eachForbidden(fn: (enabled: boolean, pattern: string) => void) {
      this.forbidden.forEach(fn);
   }

   eachMandatory(fn: (nodes: number[], pattern: string) => void) {
      this.mandatory.forEach(fn);
   }

   /**
    * Whether node sequence is forbidden.
    */
   isForbidden(nodes: number[]): boolean {
      const list = nodes.join(',');
      let forbidden = false;

      this.forbidden.forEach((enabled, pattern) => {
         if (!forbidden && enabled && pattern.includes(list)) {
            forbidden = true;
         }
      });

      return forbidden;
   }

   /**
    * List of nodes that are mandatory after a given node sequence.
    */
   getMandatory(nodes: number[]): number[] {
      const list = nodes.join(',');
      let mandatory: number[] | undefined;
      let found = false;

      this.mandatory.forEach((requiredNodes, pattern) => {
         if (!found && list.endsWith(pattern)) {
            mandatory = requiredNodes;
            found = true;
         }
      });

      return mandatory !== undefined ? mandatory : [];
   }
}
