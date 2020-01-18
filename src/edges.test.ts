import '@toba/test'
import { AreaData, TravelMode, WayType } from '@toba/osm-models'
import { Edges } from './edges'
import { preferences } from './config'
import { sampleData } from './__mocks__'

let osm: AreaData

function getEdges(t: TravelMode, ...ways: number[]): Edges {
   const e = new Edges(preferences[t], t)

   ways.forEach(id => {
      const way = osm.ways.get(id)
      expect(way).toBeDefined()
      e.fromWay(way!)
   })

   return e
}

beforeAll(async () => (osm = await sampleData()))

it('creates weighted edges for each node in a way', () => {
   new Map<number, number[]>([
      [14, [-102627]],
      [2, [-102626]],
      [6, [-102620]],
      [16, [-102627, -102626]]
   ]).forEach((ways, count) => {
      const e = getEdges(TravelMode.Car, ...ways)
      expect(e.length).toBe(count)
   })
})

it('creates one edge per connection', () => {
   const e = getEdges(TravelMode.Car, -102645)
   const start = e.get(-102594)
   const mid = e.get(-102562)

   expect(mid).toBeDefined()
   expect(mid!.size).toBe(2)
   expect(mid!.has(-102594)).toBe(true)
   expect(mid!.has(-102564)).toBe(true)

   expect(start).toBeDefined()
   expect(start!.size).toBe(1)
})

it('indicates if edge includes a node', () => {
   const e = getEdges(TravelMode.Car, -102627, -102620, -102626)

   expect(e.has(-102400)).toBe(true)
   expect(e.has(-102400, -102402)).toBe(true)
   expect(e.has(12)).toBe(false)
   expect(e.has(12, 10)).toBe(false)
   expect(e.has(-102400, -1024)).toBe(false)
   expect(e.has(-102350, -102348)).toBe(true)
   expect(e.has(-102350, -102352)).toBe(true)
})

it('retrieves edge weight from route configuration', () => {
   const weights = preferences[TravelMode.Car].weights
   const e = getEdges(TravelMode.Car, -102627, -102626, -102620)

   expect(e.weight(-102400, -102402)).toBe(weights[WayType.Residential])
   expect(e.weight(-102350, -102352)).toBe(weights[WayType.Primary])
   expect(e.weight(-102350, -102348)).toBe(weights[WayType.Primary])

   // expect two-way edges to have standard weight
   new Map([
      [WayType.Primary, [-102350, -102352]],
      [WayType.Primary, [-102348, -102346]]
   ]).forEach(([n1, n2], wayType) => {
      const w = weights[wayType]
      expect(w).toBeGreaterThan(0)
      expect(e.weight(n1, n2)).toBe(w)
      expect(e.weight(n2, n1)).toBe(w)
   })
})

// it('creates different edges for different travel modes', () => {
//    // left turn car restriction between -102626 and -102622 defined by -102646
//    const carWeights = preferences[TravelMode.Car].weights;
//    const busWeights = preferences[TravelMode.Bus].weights;
//    const carEdges = getEdges(TravelMode.Car, -102622, -102626);
//    const busEdges = getEdges(TravelMode.Bus, -102622, -102626);

//    expect(busEdges.length).toBe(3);
//    expect(carEdges.length).toBe(3);
// });

it('iterates all edges starting with a node', () => {
   const e = getEdges(TravelMode.Car, -102645)
   const fn = jest.fn()

   expect(e.length).toBe(5)
   e.each(-102562, fn)
   expect(fn).toHaveBeenCalledTimes(2)
})

it('maps edges to an array', () => {
   const weights = preferences[TravelMode.Car].weights
   const e = getEdges(TravelMode.Car, -102622, -102624, -102626)
   const fn = jest.fn()

   expect(e.length).toBe(7)
   e.map(-102352, fn)
   expect(fn).toHaveBeenCalledTimes(3)

   let count = 1
   new Map([
      [-102394, weights[WayType.Residential]],
      [-102354, weights[WayType.Primary]],
      [-102350, weights[WayType.Primary]]
   ]).forEach((weight, node) => {
      expect(fn).toHaveBeenNthCalledWith(count++, weight, node)
   })
})

// node -102524 is part of way -102635 which is part of restriction -102649
