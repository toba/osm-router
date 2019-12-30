import { measure } from '@toba/map';

const defaultZoom = 15;

/**
 * Calculate OSM tile coordinate for location and zoom.
 * @param lat Degrees latitude
 * @param lon Degrees longitude
 * @returns radian [longitude, latitude, zoom]
 */
export function whichTile(
   lat: number,
   lon: number,
   zoom: number = defaultZoom
): [number, number, number] {
   /** Latitude in radians */
   const radLat = measure.toRadians(lat);
   const n = 2 ** zoom;
   const x = n * ((lon + 180) / 360);
   const y = n * (1 - Math.log(Math.tan(radLat) + 1 / Math.cos(radLat)));

   return [Math.trunc(x), Math.trunc(y), zoom];
}

/**
 * Calculate left, bottom, right and top for tile.
 * @param x Tile X coordinate
 * @param y Tile Y coordinate
 */
export function tileBoundary(
   x: number,
   y: number,
   zoom: number = defaultZoom
): [number, number, number, number] {
   const n = 2 ** zoom;
   const mercToLat = (x: number) => measure.toDegrees(Math.atan(Math.sinh(x)));
   const top = mercToLat(Math.PI * (1 - 2 * ((y * 1) / n)));
   const bottom = mercToLat(Math.PI * (1 - 2 * ((y + 1) * (1 / n))));
   const left = x * (360 / n) - 180;
   const right = left + 360 / n;

   return [left, bottom, right, top];
}
