import '@toba/test'
import { Point } from '@toba/osm-models'
import { tiles, tilePosition, tileBoundary } from './tile'

const sample: Point = [53.7926757, 21.5732485]
const boise: Point = [43.61778, -116.199717]

it('identifies tile ID for location', () => {
   expect(tilePosition(sample)).toEqual([18347, 10553])
   expect(tilePosition(boise)).toEqual([5807, 11963])
})

it('calculates bounding box for OSM download', () => {
   const [x, y] = tilePosition(boise)
   expect(tileBoundary(x, y)).toEqual([
      -116.202392578125,
      43.61221676817573, // originally 43.61221676817571
      -116.19140625,
      43.6201706161899
   ])
})

it('downloads missing tiles', async () => {
   await tiles.ensure(...boise)
   expect(2).toBe(2)
})
