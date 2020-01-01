import '@toba/test';
import path from 'path';
import { readFileText } from '@toba/node-tools';
import { Route } from './route';
import { Tile, TravelMode, Point } from './types';
import { parseOsmXML } from './parse';
import { tiles } from './tile';

const osmFile = path.join(__dirname, '__mocks__', 'simple.osm');
let tile: Tile;

beforeAll(async () => {
   const osmText: string = await readFileText(osmFile);
   tile = parseOsmXML(osmText);
   tiles.fetchIfMissing = false;
});

it('finds node nearest to coordinates', async () => {
   const carGraph = new Route(TravelMode.Car);
   const busGraph = new Route(TravelMode.Bus);

   const p1 = [53.7926757, 21.5732485] as Point;
   const p2 = [53.799199, 21.5726826] as Point;

   carGraph.addTile(tile);
   busGraph.addTile(tile);

   expect(await carGraph.nearestNode(...p1)).toBe(-102562);
   expect(await carGraph.nearestNode(...p2)).toBe(-102326);

   expect(await busGraph.nearestNode(...p1)).toBe(-102604);
   expect(await busGraph.nearestNode(...p2)).toBe(-102326);
});
