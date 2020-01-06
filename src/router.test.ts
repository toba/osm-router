import '@toba/test';
import path from 'path';
import { readFileText } from '@toba/node-tools';
import { Router } from './router';
import { TravelMode, Point, Status } from './types';
import { parseOsmXML } from './parse';
import { tiles } from './tile';

const osmFile = path.join(__dirname, '__mocks__', 'simple.osm');
const carRoute = new Router(TravelMode.Car);
const busRoute = new Router(TravelMode.Bus);
const p1 = [53.7926757, 21.5732485] as Point;
const p2 = [53.799199, 21.5726826] as Point;

beforeAll(async () => {
   const osmText: string = await readFileText(osmFile);
   const tile = parseOsmXML(osmText);

   tiles.fetchIfMissing = false;
   carRoute.addTile(tile);
   busRoute.addTile(tile);
});

it('finds node nearest to coordinates', async () => {
   expect(await carRoute.nearestNode(...p1)).toBe(-102562);
   expect(await carRoute.nearestNode(...p2)).toBe(-102326);

   expect(await busRoute.nearestNode(...p1)).toBe(-102604);
   expect(await busRoute.nearestNode(...p2)).toBe(-102326);
});

it('finds correct car route', async () => {
   const found = await carRoute.find(p1, p2);

   expect(found.status).toBe(Status.Success);
   expect(found.nodes).toEqual([
      -102562,
      -102564,
      -102566,
      -102612,
      -102592,
      -102590,
      -102588,
      -102586,
      -102584,
      -102582,
      -102580,
      -102578,
      -102576,
      -102574,
      -102572,
      -102570,
      -102470,
      -102468,
      -102466,
      -102464,
      -102462,
      -102460,
      -102458,
      -102456,
      -102454,
      -102452,
      -102450,
      -102446,
      -102444,
      -102442,
      -102414,
      -102412,
      -102410,
      -102408,
      -102406,
      -102404,
      -102402,
      -102400,
      -102398,
      -102396,
      -102524,
      -102526,
      -102528,
      -102530,
      -102522,
      -102358,
      -102356,
      -102354,
      -102352,
      -102350,
      -102348,
      -102346,
      -102344,
      -102342,
      -102238,
      -102240,
      -102242,
      -102244,
      -102246,
      -102248,
      -102250,
      -102252,
      -102254,
      -102256,
      -102258,
      -102260,
      -102262,
      -102264,
      -102324,
      -102326
   ]);
});
