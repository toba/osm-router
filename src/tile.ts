import 'whatwg-fetch';
import fs from 'fs';
import path from 'path';
import { measure } from '@toba/map';
import { ensureAllExist, Encoding } from '@toba/node-tools';
import { Point } from './types';

const defaultZoom = 15;
const downloadedTiles = new Set<string>();
let dataPath = path.join(__dirname, '..', 'temp');
/** Whether to fetch tile data if not cached */
let fetchIfMissing = true;

let cacheMilliseconds = 30;

const tilesForZoom = (z: number) => 2 ** z;
const secant = (x: number) => 1.0 / Math.cos(x);
const mercToLat = (x: number) => measure.toDegrees(Math.atan(Math.sinh(x)));

/**
 * @see https://wiki.openstreetmap.org/wiki/Mercator#ActionScript_and_JavaScript
 */
function pointToPosition(p: Point) {
   const [lat, lon] = p;
   const radLat = measure.toRadians(lat);
   const x = (lon + 180) / 360;
   const y = (1 - Math.log(Math.tan(radLat) + secant(radLat)) / Math.PI) / 2;
   return [x, y];
}

function tilePosition(p: Point, zoom: number = defaultZoom) {
   const n = tilesForZoom(zoom);
   const [x, y] = pointToPosition(p);
   return [Math.trunc(n * x), Math.trunc(n * y)];
}

/**
 * Time since file was last modified in milliseconds or negativie infinity if
 * the file doesn't exist.
 */
const fileAge = (path: string): Promise<number> =>
   new Promise<number>(resolve =>
      fs.stat(path, (err, stats) => {
         resolve(err === null ? stats.mtimeMs : Number.NEGATIVE_INFINITY);
      })
   );

/**
 * Calculate left, bottom, right and top for tile.
 * @param x Tile X coordinate
 * @param y Tile Y coordinate
 *
 * @see https://wiki.openstreetmap.org/wiki/API_v0.6#Retrieving_map_data_by_bounding_box:_GET_.2Fapi.2F0.6.2Fmap
 */
function tileBoundary(
   x: number,
   y: number,
   zoom: number = defaultZoom
): [number, number, number, number] {
   const n = tilesForZoom(zoom);
   const top = mercToLat(Math.PI * (1 - 2 * (y * (1 / n))));
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
   const [x, y] = tilePosition([lat, lon]);
   const tileID = `${x},${y}`;

   if (downloadedTiles.has(tileID)) {
      return;
   }

   downloadedTiles.add(tileID);

   const folder = path.join(dataPath, 'tiles', defaultZoom.toString());
   const file = path.join(folder, `${tileID}.osm`);
   const [left, bottom, right, top] = tileBoundary(x, y);
   debugger;
   ensureAllExist(folder);

   const age = new Date().getTime() - (await fileAge(file));

   if (age > cacheMilliseconds) {
      const res = await fetch(
         `https://api.openstreetmap.org/api/0.6/map?bbox=${left},${bottom},${right},${top}`
      );
      const text = await res.text();
      fs.writeFileSync(file, text, { encoding: Encoding.UTF8 });
   }
}

/**
 *
 * @see https://wiki.openstreetmap.org/wiki/API_v0.6#Retrieving_map_data_by_bounding_box:_GET_.2Fapi.2F0.6.2Fmap
 */
function downloadInBoundary() {}

/**
 * OSM tile management singleton.
 */
export const tiles = {
   position: tilePosition,
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
