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

it('disallows based on turn restrictions', () => {
   const r = getRestrictions(TravelMode.Car);
   // from relation -102651
   expect(r.forbids([-102530, -102522, -102476])).toBe(true);
   expect(r.forbids([-102356, -102358, -102522])).toBe(false);
});

/*
 <relation id='-102648' action='modify' visible='true'>
    <member type='way' ref='-102631' role='from' />
    <member type='way' ref='-102633' role='via' />
    <member type='way' ref='-102634' role='via' />
    <member type='way' ref='-102638' role='to' />
    <tag k='restriction' v='only_straight_on' />
    <tag k='type' v='restriction' />
  </relation>
*/

it('requires based on only_ rule', () => {
   const r = getRestrictions(TravelMode.Car);
   // from relation -102648
   // key: -102472,-102478,-102522
   // 0: -102508
   // 1:-102510
   // 2:-102512
   // 3:-102514
   // 4:-102516
   // 5:-102474
   // 6:-102480
   // 7:-102482
   // 8:-102484
   // 9:-102486
   // 10:-102488
   // 11:-102490
   // 12:-102476
   //expect(r.getRequired([-102506, -102478])).toEqual([-102522, -102476]);

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
