import '@toba/test';
import { allowTransport } from './restriction';
import { Tag, WayType, TagMap } from './types';

it('checks if transport is allowed in way', () => {
   const tags: TagMap = {
      [Tag.RoadType]: WayType.ServiceRoad,
      [Tag.OneWay]: 'yes',
      [Tag.MotorVehicle]: 'no',
      [Tag.ServiceVehicle]: 'yes'
   };
   const canUse = [Tag.Access, Tag.Vehicle, Tag.MotorVehicle, Tag.MotorCar];

   expect(allowTransport(tags, canUse)).toBe(false);
});
