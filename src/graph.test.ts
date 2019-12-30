import '@toba/test';
import { readFileText } from '@toba/node-tools';
import path from 'path';
import { measure } from '@toba/map';
import { Graph } from './graph';
import { Tile, Transport, Point } from './types';
import { parseOsmXML } from './parse';

const osmFile = path.join(__dirname, '__mocks__', 'data.osm');
let tile: Tile;

beforeAll(async () => {
   const osmText: string = await readFileText(osmFile);
   tile = parseOsmXML(osmText);
});

it('finds node nearest to coordinates', () => {
   const carGraph = new Graph(Transport.Car, tile);
   const busGraph = new Graph(Transport.Bus, tile);
   const p1 = [53.7926757, 21.5732485] as Point;
   const p2 = [53.799199, 21.5726826] as Point;

   expect(carGraph.nearestNode(...p1)).toBe(-102562);
   expect(carGraph.nearestNode(...p2)).toBe(-102326);

   expect(busGraph.nearestNode(...p1)).toBe(-102604);
   expect(busGraph.nearestNode(...p2)).toBe(-102326);
});
