import { intersects, forEach } from '@toba/node-tools';
import { Relation, Tag, Transport, RouteConfig, TagMap } from './types';
import { Segment } from './segment';

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
   transport: string;
   config: RouteConfig;

   constructor(config: RouteConfig, transport: string) {
      this.transport = transport;
      this.config = config;
      this.mandatory = new Map();
      this.forbidden = new Map();
   }

   fromRelation(r: Relation) {
      const exceptions = r.tags[Tag.Exception]?.split(';') ?? [];

      if (intersects(exceptions, this.config.canUse)) {
         // ignore restrictions if usable access is specifically exempted
         return;
      }

      const specificRestriction = Tag.Restriction + ':' + this.transport;

      if (
         this.transport == Transport.Walk &&
         r.tags[Tag.Type] != specificRestriction &&
         !(specificRestriction in r.tags)
      ) {
         // ignore walking restrictions if not explicit
         return;
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
         return;
      }

      const segment = new Segment(r);

      if (segment.sort().valid) {
         if (forbidPrefix.test(restrictionType)) {
            // forbid restriction is identified by text list of node IDs
            const key: number[] = [
               ...segment.fromNodes(),
               ...segment.viaNodes(),
               segment.toNode()
            ];
            this.forbidden.set(key.join(','), true);
         } else if (requirePrefix.test(restrictionType)) {
            // mandatory restriction is identified by text list of node IDs
            // at start and end of segment
            const key: number[] = [...segment.fromNodes(), segment.toNode()];
            this.mandatory.set(key.join(','), segment.viaNodes());
         }
      } else {
         console.error(`Relation ${r.id} could not be processed`);
      }
   }

   eachForbidden(fn: (enabled: boolean, pattern: string) => void) {
      this.forbidden.forEach(fn);
   }

   eachMandatory(fn: (nodes: number[], pattern: string) => void) {
      this.mandatory.forEach(fn);
   }
}
