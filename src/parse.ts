import { forEach } from '@toba/node-tools'
import {
   Node,
   Way,
   Role,
   Relation,
   OsmElement,
   AreaData,
   WayType,
   ItemType,
   Tag
} from '@toba/osm-models'
import transform from 'camaro'

interface ItemXML {
   id: number
   visible?: boolean
   tags: TagXML[]
}

interface TagXML {
   key: string
   value: string
}

interface NodeXML extends ItemXML {
   lat: number
   lon: number
}

interface WayXML extends ItemXML {
   nodes: number[]
}

interface MemberXML {
   type: string
   ref: number
   role: string
}

interface RelationXML extends ItemXML {
   members: MemberXML[]
}

interface OsmXML {
   nodes: NodeXML[]
   ways: WayXML[]
   relations: RelationXML[]
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
}

function point(this: Node): [number, number] {
   return [this.lat, this.lon]
}

/**
 * Convert tags to plain object and add to item.
 * @param synonyms Optionally replace key value with a synonym
 */
export const addTags = <T extends OsmElement>(
   tags: TagXML[],
   item: Partial<T>,
   synonyms: { [alt: string]: string } = {}
): T => {
   if (tags !== undefined && tags.length > 0) {
      const out = new Object(null) as { [key: string]: string | undefined }

      forEach(tags, t => {
         out[t.key] = synonyms[t.value] ?? t.value
      })
      item.tags = out
   }
   return item as T
}

/**
 * Optimize OSM XML object for subsequent operations.
 * @param xml Pre-parsed object having the shape of OSM XML
 */
export function normalizeOsmXML(xml: OsmXML): AreaData {
   const nodes = new Map<number, Node>()
   const ways = new Map<number, Way>()

   forEach(xml.nodes, n =>
      nodes.set(
         n.id,
         addTags<Node>(n.tags, {
            id: n.id,
            lat: n.lat,
            lon: n.lon,
            point
         })
      )
   )

   forEach(xml.ways, w =>
      ways.set(
         w.id,
         addTags<Way>(
            w.tags,
            {
               id: w.id,
               nodes: w.nodes
                  .filter(id => nodes.has(id))
                  .map(id => nodes.get(id)!)
            },
            wayTypeSynonyms
         )
      )
   )

   const relations: Relation[] = xml.relations.map(r =>
      addTags<Relation>(r.tags, {
         id: r.id,
         members: r.members.map(m => ({
            role: m.role as Role,
            nodes:
               m.type == ItemType.Way
                  ? ways.get(m.ref)?.nodes ?? []
                  : nodes.has(m.ref)
                  ? [nodes.get(m.ref)!]
                  : []
         }))
      })
   )

   return {
      nodes,
      ways,
      relations
   }
}

/**
 * Convert XML text to an XML shaped object using XPath.
 * @see https://github.com/tuananh/camaro/blob/develop/API.md
 * @see https://devhints.io/xpath
 */
export function parseOsmXML(xmlText: string): AreaData {
   const template = {
      // initially all nodes but later filtered to only those in routable ways
      nodes: [
         '/osm/node',
         {
            id: 'number(@id)',
            lat: 'number(@lat)',
            lon: 'number(@lon)'
         }
      ],
      // only include ways that have road or rail type tags
      ways: [
         `/osm/way[tag[@k='${Tag.RoadType}' or @k='${Tag.RailType}']]`,
         {
            id: 'number(@id)',
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
      // only include relations with type tag indicating a restriction
      relations: [
         `/osm/relation[tag[@k='${Tag.Type}'][starts-with(@v, '${Tag.Restriction}')]]`,
         {
            id: 'number(@id)',
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
   }

   return normalizeOsmXML(transform(xmlText, template) as OsmXML)
}
