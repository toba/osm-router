import '@toba/test';
import { readFileText } from '@toba/node-tools';
import path from 'path';
import { Graph } from './graph';
import { Tile, Transport } from './types';
import { parseOsmXML } from './parse';

const osmFile = path.join(__dirname, '__mocks__', 'data.osm');
let tile: Tile;

beforeAll(async () => {
   const osmText: string = await readFileText(osmFile);
   tile = parseOsmXML(osmText);
});

it('finds node nearest to coordinates', () => {
   const graph = new Graph(Transport.Car, tile);

   expect(graph.nearestNode(53.7926757, 21.5732485)).toBe(-102562);
});
