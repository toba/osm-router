import { intersects, forEach } from '@toba/node-tools';
import { Relation, Tag, Transport, RouteConfig, TagMap } from './types';
import { Sequence } from './sequence';

// https://www.measurethat.net/Benchmarks/Show/4797/1/js-regex-vs-startswith-vs-indexof
const noPrefix = /^no_/;
const onlyPrefix = /^only_/;
const accessPrefix = /^(no|only)_/;
const noAccess = /^(no|private)$/;

/**
 * Whether mode of transportation is allowed along the given OSM `Way` as
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
      if (r.tags === undefined) {
         // XPath parsing should mean tags are always present in relations
         return;
      }
      const accessException = r.tags[Tag.Exception];

      if (
         accessException !== undefined &&
         intersects(accessException.split(';'), this.config.canUse)
      ) {
         // ignore restrictions if access type is an explicit exception
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

      const restrictionType =
         r.tags[specificRestriction] ?? r.tags[Tag.Restriction];

      if (
         restrictionType === undefined ||
         !accessPrefix.test(restrictionType)
      ) {
         // missing or inapplicable restriction type
         return;
      }

      const sequence = new Sequence(r);

      if (sequence.sort().valid) {
         if (noPrefix.test(restrictionType)) {
            const key: number[] = [
               ...sequence.fromNodes(),
               ...sequence.viaNodes(),
               sequence.toNode()
            ];
            this.forbidden.set(key.join(','), true);
         } else if (onlyPrefix.test(restrictionType)) {
            const key: number[] = [...sequence.fromNodes(), sequence.toNode()];
            this.mandatory.set(key.join(','), sequence.viaNodes());
         }
      }
   }
}
