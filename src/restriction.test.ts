import '@toba/test';
import { allowTravelMode, Restrictions } from './restriction';
import { preferences } from './config';
import { Tag, WayType, TagMap, AreaData, TravelMode } from './types';
import { sampleData } from './__mocks__';
import { forEach } from '@toba/node-tools';

let osm: AreaData;

function getRestrictions(t: TravelMode): Restrictions {
   const config = preferences[t];
   const r = new Restrictions(config, t);
   forEach(osm.relations, rel => r.fromRelation(rel));
   return r;
}

beforeAll(async () => (osm = await sampleData()));

it('checks if travel mode is allowed in way', () => {
   const tags: TagMap = {
      [Tag.RoadType]: WayType.ServiceRoad,
      [Tag.OneWay]: 'yes',
      [Tag.MotorVehicle]: 'no',
      [Tag.ServiceVehicle]: 'yes'
   };
   const canUse = [Tag.Access, Tag.Vehicle, Tag.MotorVehicle, Tag.MotorCar];

   expect(allowTravelMode(tags, canUse)).toBe(false);
});

it('disallows nodes based on turn restrictions', () => {
   const car = getRestrictions(TravelMode.Car);
   const bus = getRestrictions(TravelMode.Bus);

   // from relation -102651
   expect(car.forbids([-102530, -102522, -102476])).toBe(true);
   expect(car.forbids([-102356, -102358, -102522])).toBe(false);

   // from relation -102646
   expect(car.forbids([-102348, -102350, -102352, -102394])).toBe(true);
   // bus is excepted
   expect(bus.forbids([-102350, -102352, -102394])).toBe(false);
   // reverse direction allowed
   expect(car.forbids([-102394, -102352, -102350])).toBe(false);
});

it('requires nodes based on only_ rule', () => {
   const r = getRestrictions(TravelMode.Car);
   const pattern = [-102472, -102478];
   const required = [
      -102508,
      -102510,
      -102512,
      -102514,
      -102516,
      -102474,
      -102480,
      -102482,
      -102484,
      -102486,
      -102488,
      -102490,
      -102476,
      -102522
   ];

   expect(r.getRequired(pattern)).toEqual(required);
   expect(r.getRequired([-999, ...pattern])).toEqual(required);
   expect(r.getRequired([...pattern, -999])).toEqual([]);
});
