import 'whatwg-fetch'
import fs from 'fs'
import path from 'path'
import { measure } from '@toba/map'
import { ensureAllExist, writeFile } from '@toba/node-tools'
import { Point, BoundingBox, AreaData } from '@toba/osm-models'
import { parseOsmXML } from './parse'

const ext = 'osm'
const defaultZoom = 15
/** Cache names of downloaded tile data to short-circuit file system checks */
const downloadedTiles = new Set<string>()
let dataPath = path.join(__dirname, '..', 'temp')
/** Whether to fetch tile data if not cached */
let fetchIfMissing = true

let cacheSeconds = 30

const tilesForZoom = (z: number) => 2 ** z
const secant = (x: number) => 1.0 / Math.cos(x)
const mercToLat = (x: number) => measure.toDegrees(Math.atan(Math.sinh(x)))

/**
 * @see https://wiki.openstreetmap.org/wiki/Mercator#ActionScript_and_JavaScript
 */
function pointToPosition(p: Point) {
   const [lat, lon] = p
   const radLat = measure.toRadians(lat)
   const x = (lon + 180) / 360
   const y = (1 - Math.log(Math.tan(radLat) + secant(radLat)) / Math.PI) / 2
   return [x, y]
}

export function tilePosition(p: Point, zoom: number = defaultZoom) {
   const n = tilesForZoom(zoom)
   const [x, y] = pointToPosition(p)
   return [Math.trunc(n * x), Math.trunc(n * y)]
}

/**
 * Time since file was last modified as millisecond timestamp or negative
 * infinity if the file doesn't exist.
 */
const fileAge = (path: string): Promise<number> =>
   new Promise<number>(resolve =>
      fs.stat(path, (err, stats) => {
         resolve(err === null ? stats.mtimeMs : -Infinity)
      })
   )

/**
 * Calculate left, bottom, right and top for tile.
 * @param x Tile X coordinate
 * @param y Tile Y coordinate
 *
 * @see https://wiki.openstreetmap.org/wiki/API_v0.6#Retrieving_map_data_by_bounding_box:_GET_.2Fapi.2F0.6.2Fmap
 */
export function tileBoundary(
   x: number,
   y: number,
   zoom: number = defaultZoom
): BoundingBox {
   const n = tilesForZoom(zoom)
   const top = mercToLat(Math.PI * (1 - 2 * (y * (1 / n))))
   const bottom = mercToLat(Math.PI * (1 - 2 * ((y + 1) * (1 / n))))
   const left = x * (360 / n) - 180
   const right = left + 360 / n

   return [left, bottom, right, top]
}

/**
 *
 * @param folder Absolute path of directory where file should be written
 * @param onLoad Optional method to call when tile data are loaded
 * @returns Whether file could be downloaded
 * @see https://wiki.openstreetmap.org/wiki/API_v0.6#Retrieving_map_data_by_bounding_box:_GET_.2Fapi.2F0.6.2Fmap
 */
async function downloadInBoundary(
   folder: string,
   fileName: string,
   x: number,
   y: number,
   onLoad?: (t: AreaData) => void
): Promise<boolean> {
   const [left, bottom, right, top] = tileBoundary(x, y)

   try {
      const res = await fetch(
         `https://api.openstreetmap.org/api/0.6/map?bbox=${left},${bottom},${right},${top}`
      )
      const text = await res.text()

      await writeFile(fileName, text, folder, ext)

      if (onLoad !== undefined) onLoad(parseOsmXML(text))
   } catch (e) {
      // called methods should already have logged message
      downloadedTiles.delete(fileName)
      return false
   }
   return true
}

/**
 * Ensure tile data have been cached.
 * @param onLoad Optional method to call when tile data are loaded
 */
async function ensureTiles(
   lat: number,
   lon: number,
   onLoad?: (t: AreaData) => void
): Promise<boolean> {
   if (!fetchIfMissing) {
      return true
   }
   const [x, y] = tilePosition([lat, lon])
   const name = `${x},${y}`

   if (downloadedTiles.has(name)) return true

   downloadedTiles.add(name)

   const folder = path.join(dataPath, 'tiles')
   const filePath = path.join(folder, `${name}.${ext}`)

   ensureAllExist(folder)

   /** Milliseconds since file was modified */
   const age = new Date().getTime() - (await fileAge(filePath))

   return age > cacheSeconds * 1000
      ? downloadInBoundary(folder, name, x, y, onLoad)
      : true
}

/**
 * OSM tile management singleton.
 */
export const tiles = {
   ensure: ensureTiles,
   /**
    * Set absolute path where tile data should be saved.
    */
   set path(p: string) {
      dataPath = p
   },

   /**
    * Whether to retrieve tile data if not found in cache.
    */
   set fetchIfMissing(v: boolean) {
      fetchIfMissing = v
   },

   /**
    * Seconds to use downloaded tile data before replacing it.
    */
   set cacheSeconds(s: number) {
      cacheSeconds = s
   },

   /**
    * Minutes to use downloaded tile data before replacing it.
    */
   set cacheMinutes(m: number) {
      this.cacheSeconds = m * 60
   },

   /**
    * Hours to use downloaded tile data before replacing it.
    */
   set cacheHours(h: number) {
      this.cacheMinutes = h * 60
   }
}
