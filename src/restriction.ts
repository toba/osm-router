import { intersects, forEach } from '@toba/node-tools';
import { Relation, Tag, TravelMode, RouteConfig, TagMap } from './types';
import { Sequence } from './sequence';

const forbidPrefix = /^no_/;
const requirePrefix = /^only_/;
/**
 * If the first word is "no_", then no routing is possible from the "from" to
 * the "to" member. If it is "only_", then the only routing originating from the
 * "from" member leads to the "to" member.
 */
const rulePrefix = /^(no|only)_/;
const noAccess = /^(no|private)$/;

/**
 * Whether mode of transportation is allowed along the given OSM way as
 * indicated by its tags.
 */
export function allowTravelMode(wayTags: TagMap, accessTypes: Tag[]): boolean {
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
 * @param nodeIDs Sequence of IDs that trigger a rule
 */
function addRule<T>(
   hash: Map<string, T>,
   value: T,
   nodeIDs: number[],
   toNode: number
) {
   nodeIDs.push(toNode);
   hash.set(nodeIDs.join(','), value);
}

/**
 * Required or forbidden node sequences for mode of transportation.
 *
 * @see https://wiki.openstreetmap.org/wiki/Relation:restriction
 */
export class Restrictions {
   /** Sequence of required node IDs keyed to node list patterns */
   required: Map<string, number[]>;
   /** Forbidden flag keyed to node list patterns */
   forbidden: Map<string, boolean>;
   travelMode: string;
   config: RouteConfig;

   constructor(config: RouteConfig, travelMode: string) {
      this.travelMode = travelMode;
      this.config = config;
      this.required = new Map();
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
            addRule(
               this.forbidden,
               true,
               [...sequence.fromNodes(), ...sequence.viaNodes()],
               sequence.toNode()
            );
         } else if (requirePrefix.test(restrictionType)) {
            addRule(
               this.required,
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
    *
    * Use `RegEx` to compare sequences when possible because it's faster.
    * @see https://www.measurethat.net/Benchmarks/Show/4797/1/js-regex-vs-startswith-vs-indexof
    */
   private getRestrictionType(r: Relation): string | null {
      const exceptions = r.tags[Tag.Exception]?.split(';') ?? [];

      if (intersects(exceptions, this.config.canUse)) {
         // ignore restrictions if usable access is specifically exempted
         return null;
      }

      const travelModeRestriction = Tag.Restriction + ':' + this.travelMode;

      if (
         this.travelMode == TravelMode.Walk &&
         r.tags[Tag.Type] != travelModeRestriction &&
         !(travelModeRestriction in r.tags)
      ) {
         // ignore walking restrictions if not explicit
         return null;
      }

      /**
       * General restriction or restriction on specific mode of transportation
       */
      const restrictionType =
         r.tags[travelModeRestriction] ?? r.tags[Tag.Restriction];

      if (restrictionType === undefined || !rulePrefix.test(restrictionType)) {
         // missing or inapplicable restriction type
         return null;
      }

      return restrictionType;
   }

   /**
    * Execute method for each forbidden pattern.
    */
   eachForbidden(fn: (enabled: boolean, pattern: string) => void) {
      this.forbidden.forEach(fn);
   }

   /**
    * Execute method for each mandatory pattern.
    */
   eachMandatory(fn: (nodes: number[], pattern: string) => void) {
      this.required.forEach(fn);
   }

   /**
    * Whether node sequence is forbidden based on OSM `no_*` relations.
    */
   forbids(nodes: number[]): boolean {
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
    * Nodes that are mandatory after a given node sequence based on OSM `only_*`
    * relations.
    */
   getRequired(nodes: number[]): number[] {
      const list = nodes.join(',');
      let required: number[] | undefined;
      let found = false;

      this.required.forEach((requiredNodes, pattern) => {
         if (!found && list.endsWith(pattern)) {
            required = requiredNodes;
            found = true;
         }
      });

      return required !== undefined ? required : [];
   }
}
