import '@toba/test';
import path from 'path';
import { readFileText } from '@toba/node-tools';
import { parseOsmXML } from './parse';
import { Tile, WayType, Tag } from './types';

const osmFile = path.join(__dirname, '__mocks__', 'data.osm');

it('converts OSM XML to an object', async () => {
   const osmText: string = await readFileText(osmFile);
   const osm: Tile = await parseOsmXML(osmText);

   expect(osm.nodes.size).toBe(189);
   expect(osm.ways.size).toBe(33);
   expect(osm.relations.length).toBe(7);

   expect(osm.ways.has(-102631)).toBe(true);

   const way = osm.ways.get(-102630);

   expect(way).toBeDefined();

   if (way === undefined) {
      return;
   }
   expect(way.nodes.length).toBe(18);
   expect(way.tags).toEqual({ [Tag.RoadType]: WayType.Residential });
   expect(way.nodes[0].id).toBe(-102446);
   expect(way.nodes[0].lat).toBe(53.79681712755);
   expect(way.nodes[0].point()).toEqual([53.79681712755, 21.56294344783]);
});
