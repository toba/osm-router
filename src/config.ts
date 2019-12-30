import { RouteMode, Transport, WayType, AccessibleTo } from './types';

export const routeModes: RouteMode = {
   [Transport.Car]: {
      weights: {
         [WayType.Freeway]: 10,
         [WayType.Trunk]: 10,
         [WayType.Primary]: 2,
         [WayType.Secondary]: 1.5,
         [WayType.Tertiary]: 1,
         [WayType.Minor]: 1,
         [WayType.Residential]: 0.7,
         [WayType.TwoTrack]: 0.5,
         [WayType.ServiceRoad]: 0.5
      },
      access: [
         AccessibleTo.Any,
         AccessibleTo.Vehicle,
         AccessibleTo.MotorVehicle,
         AccessibleTo.MotorCar
      ]
   },
   [Transport.Bus]: {
      weights: {
         [WayType.Freeway]: 10,
         [WayType.Trunk]: 10,
         [WayType.Primary]: 2,
         [WayType.Secondary]: 1.5,
         [WayType.Tertiary]: 1,
         [WayType.Minor]: 1,
         [WayType.Residential]: 0.8,
         [WayType.TwoTrack]: 0.3,
         [WayType.ServiceRoad]: 0.9
      },
      access: [
         AccessibleTo.Any,
         AccessibleTo.Vehicle,
         AccessibleTo.MotorVehicle,
         AccessibleTo.ServiceVehicle,
         AccessibleTo.Bus
      ]
   },
   [Transport.Bicycle]: {
      weights: {
         [WayType.Trunk]: 0.05,
         [WayType.Primary]: 0.3,
         [WayType.Secondary]: 0.9,
         [WayType.Tertiary]: 1,
         [WayType.Minor]: 1,
         [WayType.BicyclePath]: 2,
         [WayType.Residential]: 2.5,
         [WayType.TwoTrack]: 1,
         [WayType.ServiceRoad]: 1,
         [WayType.HorsePath]: 0.8,
         [WayType.FootPath]: 0.8,
         [WayType.Stairs]: 0.5,
         [WayType.Path]: 1
      },
      access: [AccessibleTo.Any, AccessibleTo.Vehicle, AccessibleTo.Bicycle]
   },
   [Transport.Horse]: {
      weights: {
         [WayType.Primary]: 0.05,
         [WayType.Secondary]: 0.15,
         [WayType.Tertiary]: 0.3,
         [WayType.Minor]: 1,
         [WayType.Residential]: 1,
         [WayType.TwoTrack]: 1,
         [WayType.ServiceRoad]: 1,
         [WayType.HorsePath]: 1,
         [WayType.FootPath]: 1.2,
         [WayType.Stairs]: 1.15,
         [WayType.Path]: 1.2
      },
      access: [AccessibleTo.Any, AccessibleTo.Horse]
   },
   [Transport.Tram]: {
      weights: {
         [WayType.Tram]: 1,
         [WayType.LightRail]: 1
      },
      access: [AccessibleTo.Any]
   },
   [Transport.Train]: {
      weights: {
         [WayType.Rail]: 1,
         [WayType.LightRail]: 1,
         [WayType.Subway]: 1,
         [WayType.NarrowGauge]: 1
      },
      access: [AccessibleTo.Any]
   }
};
