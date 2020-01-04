import '@toba/test';
import path from 'path';
import { readFileText } from '@toba/node-tools';
import { Edges } from './edges';
import { Plan } from './plan';
import { parseOsmXML } from './parse';
import { tiles } from './tile';
import { Tile, TravelMode, WayType, Node } from './types';
import { preferences } from './config';
import { Restrictions } from './restriction';

const osmFile = path.join(__dirname, '__mocks__', 'simple.osm');
let tile: Tile;

function getPlan(t: TravelMode): Plan {
   const config = preferences[t];
   const e = new Edges(config, t);
   const nodes = new Map<number, Node>();

   tile.ways.forEach(way => e.fromWay(way).forEach(n => nodes.set(n.id, n)));

   return new Plan(nodes, e, new Restrictions(config, t));
}

beforeAll(async () => {
   tile = parseOsmXML(await readFileText(osmFile));
   tiles.fetchIfMissing = false;
});

it('initializes plan', async () => {
   const p = getPlan(TravelMode.Car);

   expect(p.edges.length).toBe(178);
   // same start/end node is not valid
   expect(await p.prepare(-102562, -102562)).toBe(false);
   expect(await p.prepare(-102562, -102326)).toBe(true);
   expect(p.endPoint).toEqual([53.79920293412, 21.57283007562]);
   // way -102645 defines two directions from -102562
   expect(p.options.length).toBe(2);
});
