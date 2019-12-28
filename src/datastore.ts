import { measure } from '@toba/map';
import { forEach } from '@toba/node-tools';
import { RouteSpec, Transport, routeModes, Tags, accessDenied } from './types';
import { is } from '.';

function whichTile(
   lat: number,
   lon: number,
   zoom: number
): [number, number, number] {
   const radLat = measure.toRadians(lat);
   const n = 2 ** zoom;
   const x = n * ((lon + 180) / 360);
   const y = n * (1 - Math.log(Math.tan(radLat) + 1 / Math.cos(radLat)));

   return [x, y, zoom];
}

function tileBoundary(
   x: number,
   y: number,
   zoom: number
): [number, number, number, number] {
   const n = 2 ** zoom;
   const mercToLat = (x: number) => measure.toDegrees(Math.atan(Math.sinh(x)));
   const top = mercToLat(Math.PI * (1 - 2 * ((y * 1) / n)));
   const bottom = mercToLat(Math.PI * (1 - 2 * ((y + 1) * (1 / n))));
   const left = x * (360 / n) - 180;
   const right = left + 360 / n;

   return [left, bottom, right, top];
}

class Datastore {
   routing: { [key: string]: string };
   rnodes: { [key: string]: string };
   mandatoryMoves: { [key: string]: string };
   forbiddenMoves: { [key: string]: string };

   tiles: { [key: string]: string };
   transport: string;
   spec: RouteSpec;

   constructor(
      transport: RouteSpec | Transport,
      localFile = false,
      expireData = 30
   ) {
      this.routing = {};

      if (is.object<RouteSpec>(transport)) {
         this.transport = transport.name!;
         this.spec = transport;
      } else {
         this.transport = transport;
         // TODO: clone
         this.spec = routeModes[transport];
      }
   }

   /**
    * Whether mode of transportation is allowed along the given OSM `way` as
    * indicated by its tags.
    */
   private isAccessible(tags: Tags): boolean {
      let allowed = true;

      forEach(this.spec.access, key => {
         if (key in tags) {
            allowed = !(tags[key] in accessDenied);
         }
      });

      return allowed;
   }

   // private distance(n1: number[], n2: number[]): number {
   //    // TODO: lat/lon seem to be reversed
   //    return measure.pointDistance(n1, n2);
   // }
}
