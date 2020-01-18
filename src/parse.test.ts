import '@toba/test'
import { AreaData, WayType, Tag, OsmElement } from '@toba/osm-models'
import { forEach } from '@toba/node-tools'
import { addTags } from './parse'
import { sampleData } from './__mocks__'

it('converts OSM XML to an object', async () => {
   const osm: AreaData = await sampleData()

   expect(osm.nodes.size).toBe(189)
   expect(osm.ways.size).toBe(33)
   expect(osm.relations.length).toBe(7)

   expect(osm.ways.has(-102631)).toBe(true)
   expect(osm.ways.has(-102620)).toBe(true)

   const way = osm.ways.get(-102630)

   expect(way).toBeDefined()

   if (way === undefined) return

   expect(way.nodes.length).toBe(18)
   expect(way.tags).toEqual({ [Tag.RoadType]: WayType.Residential })
   expect(way.nodes[0].id).toBe(-102446)
   expect(way.nodes[0].lat).toBe(53.79681712755)
   expect(way.nodes[0].point()).toEqual([53.79681712755, 21.56294344783])
})

it('normalizes relation members', async () => {
   const osm: AreaData = await sampleData()
   const r = osm.relations.find(r => r.id == -102648)

   expect(r).toBeDefined()

   if (r === undefined) return

   expect(r.members).toHaveLength(4)

   forEach([3, 8, 7, 2], (count, i) => {
      expect(r.members[i].nodes).toHaveLength(count)
   })
})

it('converts tags to plain object with synonym substitutions', () => {
   const tags: any[] = []
   const out: any = {}
   const item: OsmElement = { id: 2 }
   const synonyms = { value2: 'fixed2' }

   for (let i = 1; i <= 5; i++) {
      const key = 'key' + i
      const value = 'value' + i
      tags.push({ key, value })
      // replace value with synonym if one is defined
      out[key] = value == 'value2' ? synonyms[value] : value
   }
   addTags(tags, item, synonyms)
   expect(item.tags).toEqual(out)
})
