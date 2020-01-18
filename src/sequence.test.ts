import '@toba/test'
import { reverse } from '@toba/node-tools'
import { Node, AreaData } from '@toba/osm-models'
import {
   sharedNode,
   nextToLast,
   last,
   sortNodeSets,
   Sequence
} from './sequence'
import { sampleData } from './__mocks__'

const nodes: Node[] = []
let osm: AreaData

beforeAll(async () => {
   osm = await sampleData()

   for (let i = 0; i < 20; i++) {
      nodes.push({
         id: i,
         lat: 0,
         lon: 0,
         point: () => [0, 0]
      })
   }
})
it('identifies node shared between sets', () => {
   const set1 = nodes.filter((_, i) => i < 10)
   const set2 = nodes.filter((_, i) => i > 8)
   const n = sharedNode(set1, set2)

   expect(n).toBeDefined()
   expect(n!.id).toBe(9)
})

it('retrieves next-to-last node from list', () => {
   const set1 = [nodes[0], nodes[1], nodes[2]]
   const set2 = [nodes[3]]

   expect(nextToLast(set1).id).toBe(1)
   expect(nextToLast(set2).id).toBe(3)
   expect(last(set1).id).toBe(2)
})

it('sorts sets of nodes so common nodes are adjacent', () => {
   const set1 = nodes.filter((_, i) => i < 8)
   const set2 = nodes.filter((_, i) => i > 6 && i < 12)
   const set3 = nodes.filter((_, i) => i > 10)

   expect(sharedNode(set1, set2)).toHaveProperty('id', 7)
   expect(sharedNode(set2, set3)).toHaveProperty('id', 11)

   const sorted = sortNodeSets([set1, set2, set3])

   expect(sorted).toBe(true)
   expect(set2[0].id).toBe(7)

   const set4 = reverse(set2)

   expect(set4[0].id).toBe(11)

   const groups = [set1, set4, set3]

   expect(groups[1]).not.toEqual(set2)

   const fixed = sortNodeSets(groups)

   expect(fixed).toBe(true)
   expect(groups[1]).toEqual(set2)
})

it('creates sequence from OSM relation', () => {
   const rel = osm.relations.find(r => r.id == -102648)

   expect(rel).toBeDefined()

   if (rel == undefined) return

   const seq = new Sequence(rel)

   expect(seq.sort().valid).toBe(true)
   expect(seq.fromNodes).toEqual([-102472, -102478])
   expect(seq.viaNodes).toEqual([
      -102508,
      -102510,
      -102512,
      -102514,
      -102516,
      -102474,
      -102480,
      -102482,
      -102484,
      -102486,
      -102488,
      -102490,
      -102476
   ])
   expect(seq.toNode).toEqual(-102522)
})
