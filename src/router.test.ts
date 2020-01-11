import '@toba/test';
import { TravelMode, Point } from '@toba/osm-models';
import { Status } from './types';
import { Router } from './router';
import { sampleData } from './__mocks__';

const carRoute = new Router(TravelMode.Car);
const busRoute = new Router(TravelMode.Bus);
const p1 = [53.7926757, 21.5732485] as Point;
const p2 = [53.799199, 21.5726826] as Point;

beforeAll(async () => {
   const osm = await sampleData();
   carRoute.addData(osm);
   busRoute.addData(osm);
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
   // prettier-ignore
   expect(found.nodes).toEqual([
      -102562, -102564, -102566, -102612, -102592, -102590, -102588, -102586,
      -102584, -102582, -102580, -102578, -102576, -102574, -102572, -102570,
      -102470, -102468, -102466, -102464, -102462, -102460, -102458, -102456,
      -102454, -102452, -102450, -102446, -102444, -102442, -102414, -102412,
      -102410, -102408, -102406, -102404, -102402, -102400, -102398, -102396,
      -102524, -102526, -102528, -102530, -102522, -102358, -102356, -102354,
      -102352, -102350, -102348, -102346, -102344, -102342, -102238, -102240,
      -102242, -102244, -102246, -102248, -102250, -102252, -102254, -102256,
      -102258, -102260, -102262, -102264, -102324, -102326
   ]);
});

it('finds correct bus route', async () => {
   const found = await busRoute.find(p1, p2);

   expect(found.status).toBe(Status.Success);
   // prettier-ignore
   expect(found.nodes).toEqual([
      -102604, -102606, -102608, -102610, -102612, -102566, -102564, -102562,
      -102594, -102560, -102558, -102556, -102554, -102552, -102550, -102548,
      -102546, -102544, -102542, -102440, -102438, -102436, -102434, -102432,
      -102430, -102428, -102426, -102420, -102424, -102422, -102406, -102404,
      -102402, -102400, -102398, -102396, -102524, -102526, -102528, -102530,
      -102522, -102358, -102356, -102354, -102352, -102350, -102348, -102346,
      -102344, -102342, -102238, -102240, -102242, -102244, -102246, -102248,
      -102250, -102252, -102254, -102256, -102258, -102260, -102262, -102264,
      -102324, -102326
   ]);
});

it('finds correct reverse car route', async () => {
   const found = await carRoute.find(p2, p1);

   expect(found.status).toBe(Status.Success);
   // prettier-ignore
   expect(found.nodes).toEqual([
      -102326, -102324, -102264, -102266, -102322, -102306, -102308, -102310,
      -102312, -102314, -102316, -102318, -102320, -102334, -102336, -102338,
      -102340, -102238, -102342, -102344, -102346, -102348, -102350, -102352,
      -102354, -102356, -102358, -102522, -102476, -102492, -102494, -102496,
      -102498, -102500, -102502, -102504, -102506, -102478, -102508, -102510,
      -102512, -102514, -102516, -102474, -102480, -102520, -102518, -102396,
      -102398, -102400, -102402, -102404, -102406, -102408, -102410, -102412,
      -102414, -102442, -102444, -102446, -102450, -102452, -102454, -102456,
      -102458, -102460, -102462, -102464, -102466, -102468, -102470, -102570,
      -102572, -102574, -102576, -102578, -102580, -102582, -102584, -102586,
      -102588, -102590, -102592, -102612, -102566, -102564, -102562
   ]);
});

it('finds correct reverse bus route', async () => {
   const found = await busRoute.find(p2, p1);

   expect(found.status).toBe(Status.Success);
   // prettier-ignore
   expect(found.nodes).toEqual([
      -102326, -102324, -102264, -102262, -102260, -102258, -102256, -102254,
      -102252, -102250, -102248, -102246, -102244, -102242, -102240, -102238,
      -102342, -102344, -102346, -102348, -102350, -102352, -102394, -102392,
      -102390, -102368, -102366, -102388, -102364, -102416, -102418, -102420,
      -102426, -102428, -102430, -102432, -102434, -102436, -102438, -102440,
      -102542, -102544, -102546, -102548, -102550, -102552, -102554, -102556,
      -102558, -102560, -102594, -102596, -102598, -102600, -102602, -102604
   ]);
});
