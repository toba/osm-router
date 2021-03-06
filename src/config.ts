import { TravelBy, WayType, Tag } from '@toba/osm-models'
import { RouteMode } from './types'

export const preferences: RouteMode = {
   [TravelBy.Car]: {
      name: TravelBy.Car,
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
      canUse: [Tag.Access, Tag.Vehicle, Tag.MotorVehicle, Tag.MotorCar]
   },
   [TravelBy.Bus]: {
      name: TravelBy.Bus,
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
      canUse: [
         Tag.Access,
         Tag.Vehicle,
         Tag.MotorVehicle,
         Tag.ServiceVehicle,
         Tag.Bus
      ]
   },
   [TravelBy.Bicycle]: {
      name: TravelBy.Bicycle,
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
      canUse: [Tag.Access, Tag.Vehicle, Tag.Bicycle]
   },
   [TravelBy.Horse]: {
      name: TravelBy.Horse,
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
      canUse: [Tag.Access, Tag.Horse]
   },
   [TravelBy.Tram]: {
      name: TravelBy.Tram,
      weights: {
         [WayType.Tram]: 1,
         [WayType.LightRail]: 1
      },
      canUse: [Tag.Access]
   },
   [TravelBy.Train]: {
      name: TravelBy.Train,
      weights: {
         [WayType.Rail]: 1,
         [WayType.LightRail]: 1,
         [WayType.Subway]: 1,
         [WayType.NarrowGauge]: 1
      },
      canUse: [Tag.Access]
   }
}
