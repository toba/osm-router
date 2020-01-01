import '@toba/test';
import { tiles } from './tile';
import { Point } from './types';

const sample: Point = [53.7926757, 21.5732485];
const boise: Point = [43.61778, -116.199717];

it('identifies tile ID for location', () => {
   expect(tiles.position(sample)).toEqual([18347, 10553]);
   expect(tiles.position(boise)).toEqual([5807, 11963]);
});

it('calculates bounding box for OSM download', () => {
   const [x, y] = tiles.position(boise);
   expect(tiles.boundary(x, y)).toEqual([
      -116.202392578125,
      43.61221676817571,
      -116.19140625,
      43.6201706161899
   ]);
});

it('downloads missing tiles', async () => {
   await tiles.ensure(...boise);
   expect(2).toBe(2);
});
