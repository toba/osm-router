import { forEach } from '@toba/node-tools';
import transform from 'camaro';
import {
   Node,
   Way,
   Role,
   Relation,
   OsmItem,
   Tile,
   Hash,
   WayType,
   ItemType
} from './types';

interface ItemXML {
   id: number;
   visible?: boolean;
   tags: TagXML[];
}

interface TagXML {
   key: string;
   value: string;
}

interface NodeXML extends ItemXML {
   lat: number;
   lon: number;
}

interface WayXML extends ItemXML {
   nodes: number[];
}

interface MemberXML {
   type: string;
   ref: number;
   role: string;
}

interface RelationXML extends ItemXML {
   members: MemberXML[];
}

interface OsmXML {
   nodes: NodeXML[];
   ways: WayXML[];
   relations: RelationXML[];
}

/* eslint-disable @typescript-eslint/camelcase */
const wayTypeSynonyms: { [key: string]: string } = {
   motorway_link: WayType.Freeway,
   trunk_link: WayType.Trunk,
   primary_link: WayType.Primary,
   secondary_link: WayType.Secondary,
   tertiary_link: WayType.Tertiary,
   minor: WayType.Minor,
   pedestrian: WayType.FootPath,
   platform: WayType.FootPath
};

/**
 * @param xml Pre-parsed object having the shape of OSM XML
 */
export function normalizeOsmXML(xml: OsmXML): Tile {
   const nodes = new Object(null) as Hash<Node>;
   const ways = new Object(null) as Hash<Way>;

   const addTags = <T extends OsmItem>(
      tags: TagXML[],
      item: T,
      synonyms: { [alt: string]: string } = {}
   ): T => {
      if (tags !== undefined && tags.length > 0) {
         const out = new Object(null) as { [key: string]: string | null };
         forEach(tags, t => (out[t.key] = synonyms[t.value] ?? t.value));
         item.tags = out;
      }
      return item;
   };

   forEach(xml.nodes, n => {
      nodes[n.id] = addTags<Node>(n.tags, {
         id: n.id,
         lat: n.lat,
         lon: n.lon
      });
   });

   forEach(xml.ways, w => {
      ways[w.id] = addTags<Way>(
         w.tags,
         { id: w.id, nodes: w.nodes.map(id => nodes[id]) },
         wayTypeSynonyms
      );
   });

   const relations: Relation[] = xml.relations.map(r =>
      addTags<Relation>(r.tags, {
         id: r.id,
         members: r.members.map(m => ({
            role: m.role as Role,
            nodes: m.type == ItemType.Way ? ways[m.ref].nodes : [nodes[m.ref]]
         }))
      })
   );

   return {
      nodes,
      ways,
      relations
   };
}

/**
 * @see https://github.com/tuananh/camaro/blob/develop/API.md
 */
export function parseOsmXML(xmlText: string): Tile {
   const template = {
      nodes: [
         '/osm/node',
         {
            id: 'number(@id)',
            lat: 'number(@lat)',
            lon: 'number(@lon)'
            //visible: 'boolean(@visible = "true")'
         }
      ],
      ways: [
         '/osm/way',
         {
            id: 'number(@id)',
            //visible: 'boolean(@visible = "true")',
            nodes: ['nd', 'number(@ref)'],
            tags: [
               'tag',
               {
                  key: '@k',
                  value: '@v'
               }
            ]
         }
      ],
      relations: [
         '/osm/relation',
         {
            id: 'number(@id)',
            //visible: 'boolean(@visible = "true")',
            members: [
               'member',
               {
                  type: '@type',
                  ref: 'number(@ref)',
                  role: '@role'
               }
            ],
            tags: [
               'tag',
               {
                  key: '@k',
                  value: '@v'
               }
            ]
         }
      ]
   };

   return normalizeOsmXML(transform(xmlText, template) as OsmXML);
}
