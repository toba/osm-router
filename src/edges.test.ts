import '@toba/test';
import path from 'path';
import { readFileText } from '@toba/node-tools';
import { Edges } from './edges';
import { parseOsmXML } from './parse';
import { tiles } from './tile';
import { Tile, TravelMode, WayType } from './types';
import { preferences } from './config';

const osmFile = path.join(__dirname, '__mocks__', 'simple.osm');
let tile: Tile;

function getEdges(t: TravelMode, ...ways: number[]): Edges {
   const e = new Edges(preferences[t], t);

   ways.forEach(id => {
      const way = tile.ways.get(id);
      expect(way).toBeDefined();
      e.fromWay(way!);
   });

   return e;
}

beforeAll(async () => {
   tile = parseOsmXML(await readFileText(osmFile));
   tiles.fetchIfMissing = false;
});

it('creates weighted edges for each node in a way', () => {
   new Map<number, number[]>([
      [14, [-102627]],
      [2, [-102626]],
      [16, [-102627, -102626]]
   ]).forEach((ways, count) => {
      const e = getEdges(TravelMode.Car, ...ways);
      expect(e.length).toBe(count);
   });
});

it('creates one edge per connection', () => {
   const e = getEdges(TravelMode.Car, -102645);
   const start = e.items.get(-102594);
   const mid = e.items.get(-102562);

   expect(mid).toBeDefined();
   expect(mid!.size).toBe(2);
   expect(mid!.has(-102594)).toBe(true);
   expect(mid!.has(-102564)).toBe(true);

   expect(start).toBeDefined();
   expect(start!.size).toBe(1);
});

it('indicates if edge includes a node', () => {
   const e = getEdges(TravelMode.Car, -102645);

   expect(e.has(-102400)).toBe(true);
   expect(e.has(-102400, -102402)).toBe(true);
   expect(e.has(12)).toBe(false);
   expect(e.has(12, 10)).toBe(false);
   expect(e.has(-102400, -1024)).toBe(false);
});

it('retrieves edge weight from route configuration', () => {
   const config = preferences[TravelMode.Car];
   const e = getEdges(TravelMode.Car, -102627, -102626);

   expect(e.weight(-102400, -102402)).toBe(config.weights[WayType.Residential]);
   expect(e.weight(-102350, -102352)).toBe(config.weights[WayType.Primary]);
});

it('iterates all edges starting with a node', () => {
   const e = getEdges(TravelMode.Car, -102645);
   const fn = jest.fn();

   expect(e.length).toBe(5);
   e.each(-102562, fn);
   expect(fn).toHaveBeenCalledTimes(2);
});
