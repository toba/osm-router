import { forEach } from '@toba/node-tools';
import { xml } from '@toba/map';
import { Node, Way, Relation, OsmItem } from './types';

const eachElement = (
   items: HTMLCollectionOf<Element>,
   fn: (el: Element) => void
) => {
   for (let i = 0; i < items.length; i++) {
      fn(items.item(i)!);
   }
};

function addTags(el: Element, osm: OsmItem): void {
   const tagElements = el.getElementsByTagName('tag');

   if (tagElements.length > 0) {
      osm.tags = {};
   } else {
      return;
   }

   eachElement(tagElements, tagEl => {
      const key = tagEl.getAttribute('k');
      if (key !== null) {
         osm.tags![key] = tagEl.getAttribute('v');
      }
   });
}

function addOsmNode(el: Element, nodes: Map<number, Node>): void {
   const n: Node = { id: 0 };

   forEach(el.getAttributeNames(), key => {
      const a: string | null = el.getAttribute(key);

      if (a === null) {
         return;
      }

      switch (key) {
         case 'id':
         case 'ref':
            n[key] = parseInt(a, 10);
            break;
         case 'lat':
         case 'lon':
            n[key] = parseFloat(a);
            break;
         case 'open':
         case 'visible':
            n[key] = a == 'true';
            break;
         default:
            break;
      }
   });
   if (n.id !== 0) {
      console.error('node missing ID');
   } else {
      addTags(el, n);
      nodes.set(n.id, n);
   }
}

function addOsmWay(
   el: Element,
   ways: Map<number, Way>,
   nodes: Map<number, Node>
): void {
   const w: Way = { id: 0, nodes: [] };
   const id = el.getAttribute('id');

   if (id === null) {
      console.error('Way is missing ID');
      return;
   }
   const nodeRefs = el.getElementsByTagName('nd');

   if (nodeRefs.length == 0) {
      console.error('Way contains no nodes');
      return;
   }

   eachElement(nodeRefs, nd => {
      const nodeID = nd.getAttribute('ref');

      if (nodeID !== null) {
         const node = nodes.get(parseInt(nodeID, 10));
         if (node !== undefined) {
            w.nodes.push(node);
            return;
         }
         console.error(`Unable to find node ${nodeID} for way ${id}`);
      }
   });

   if (w.nodes.length == 0) {
      console.error(`No nodes found for way ${id}`);
      return;
   }

   w.id = parseInt(id, 10);
   addTags(el, w);

   ways.set(w.id, w);
}

function addOsmRelation(
   el: Element,
   relations: Map<number, Relation>,
   ways: Map<number, Way>,
   nodes: Map<number, Node>
): void {
   const r: Relation = { id: 0, members: [] };
   const id = el.getAttribute('id');

   if (id === null) {
      console.error('Relation is missing ID');
      return;
   }
   const memberElements = el.getElementsByTagName('member');

   if (memberElements.length == 0) {
      console.error('Relation has no members');
      return;
   }

   eachElement(memberElements, member => {
      const ref = member.getAttribute('ref');

      if (ref === null) {
         console.error(`Relation ${id} has an empty member reference`);
         return;
      }

      const type = member.getAttribute('type');
      const refID = parseInt(ref, 10);

      switch (type) {
         case 'way':
            const w = ways.get(refID);
            break;
         case 'node':
            const n = nodes.get(refID);
            break;
         default:
            console.error(`No type supplied for member ${ref} in way ${id}`);
            break;
      }
   });

   r.id = parseInt(id, 10);
   addTags(el, r);

   relations.set(r.id, r);
}

function parseOsmNodes(list: HTMLCollectionOf<Element>): Map<number, Node> {
   const nodes = new Map<number, Node>();
   eachElement(list, el => addOsmNode(el, nodes));
   return nodes;
}

function parseOsmWays(
   list: HTMLCollectionOf<Element>,
   nodes: Map<number, Node>
): Map<number, Way> {
   const ways = new Map<number, Way>();
   eachElement(list, el => addOsmWay(el, ways, nodes));
   return ways;
}

function parseOsmRelations(
   items: HTMLCollectionOf<Element>,
   nodes: Map<number, Node>,
   ways: Map<number, Way>
): Map<number, Relation> {
   const relations = new Map<number, Relation>();
   eachElement(items, el => addOsmRelation(el, relations, ways, nodes));
   return relations;
}

export function parseFile(xmlText: string) {
   const el = xml.fromText(xmlText);
   const nodes = parseOsmNodes(el.getElementsByTagName('node'));
   const ways = parseOsmWays(el.getElementsByTagName('way'), nodes);
   const relations = parseOsmRelations(
      el.getElementsByTagName('relation'),
      nodes,
      ways
   );

   return { nodes, ways, relations };
}
