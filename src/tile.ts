import 'whatwg-fetch';
import fs from 'fs';
import path from 'path';
import { measure } from '@toba/map';
import { readFile, ensureAllExist, Encoding } from '@toba/node-tools';

const defaultZoom = 15;
const tileCache = new Map<string, boolean>();
let dataPath = path.join(__dirname, '..', 'temp');
/** Whether to fetch tile data if not cached */
let fetchIfMissing = true;

let cacheMilliseconds = 30;

/**
 * Calculate OSM tile coordinate for location and zoom.
 * @param lat Degrees latitude
 * @param lon Degrees longitude
 * @returns radian [longitude, latitude, zoom]
 */
function whichTile(
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

function fileAge(path: string): number {
   if (fs.existsSync(path)) {
      const stats = fs.statSync(path);
      return stats.mtimeMs;
   } else {
      return Number.POSITIVE_INFINITY;
   }
}

/**
 * Calculate left, bottom, right and top for tile.
 * @param x Tile X coordinate
 * @param y Tile Y coordinate
 */
function tileBoundary(
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

/**
 * Ensure tile data have been cached.
 */
async function ensureTiles(lat: number, lon: number) {
   if (!fetchIfMissing) {
      return;
   }
   const [x, y] = whichTile(lat, lon);
   const tileID = `${x},${y}`;

   if (tileCache.has(tileID)) {
      return;
   }

   tileCache.set(tileID, true);

   const folder = path.join(dataPath, 'tiles', defaultZoom.toString());
   const file = path.join(folder, `${tileID}.osm`);
   const [left, bottom, right, top] = tileBoundary(x, y);

   ensureAllExist(folder);

   const age = new Date().getTime() - fileAge(file);

   if (age > cacheMilliseconds) {
      const res = await fetch(
         `https://api.openstreetmap.org/api/0.6/map?bbox=${left},${bottom},${right},${top}`
      );
      const text = await res.text();
      fs.writeFileSync(file, text, { encoding: Encoding.UTF8 });
   }
}

/**
 * OSM tile management singleton.
 */
export const tiles = {
   which: whichTile,
   boundary: tileBoundary,
   ensure: ensureTiles,
   /**
    * Set absolute path where tile data should be saved.
    */
   set path(p: string) {
      dataPath = p;
   },

   /**
    * Whether to retrieve tile data if not found in cache.
    */
   set fetchIfMissing(v: boolean) {
      fetchIfMissing = v;
   },

   /**
    * Seconds to use downloaded tile data before replacing it.
    */
   set cacheSeconds(s: number) {
      cacheMilliseconds = s * 1000;
   },

   set cacheMinutes(m: number) {
      this.cacheSeconds = m * 60;
   }
};
