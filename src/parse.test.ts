import '@toba/test';
import path from 'path';
import { readFileText } from '@toba/node-tools';
import { parseOsmXML } from './parse';

const osmFile = path.join(__dirname, '__mocks__', 'data.osm');

it('converts OSM XML to an object', async () => {
   const osmText = await readFileText(osmFile);
   const osm = parseOsmXML(osmText);

   expect(osm).toMatchSnapshot();
});
