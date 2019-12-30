/**
 * A way is an ordered list of nodes which normally also has at least one tag or
 * is included within a `Relation`. A way can have between 2 and 2,000 nodes,
 * although it's possible that faulty ways with zero or a single node exist. A
 * way can be open or closed. A closed way is one whose last node on the way is
 * also the first on that way. A closed way may be interpreted either as a
 * closed polyline, or an area, or both.
 * @see https://wiki.openstreetmap.org/wiki/Way
 * @see https://wiki.openstreetmap.org/wiki/Key:highway
 */
export const enum WayType {
   /**
    * For horse riders. Equivalent to `highway=path` + `horse=designated`.
    */
   HorsePath = 'bridleway',
   /**
    * For designated cycleways. Add `foot=*` only if default-access-restrictions
    * do not apply.
    */
   BicyclePath = 'cycleway',
   /**
    * For designated footpaths; i.e., mainly/exclusively for pedestrians. This
    * includes walking tracks and gravel paths. If bicycles are allowed as well,
    * you can indicate this by adding a `bicycle=yes` tag. Should not be used
    * for paths where the primary or intended usage is unknown. Use
    * `highway=pedestrian` for pedestrianised roads in shopping or residential
    * areas and `highway=track` if it is usable by agricultural or similar
    * vehicles.
    */
   FootPath = 'footway',
   LightRail = 'light_rail',
   /**
    * A restricted access major divided highway, normally with 2 or more running
    * lanes plus emergency hard shoulder. Equivalent to the Freeway, Autobahn,
    * etc..
    */
   Freeway = 'motorway',
   NarrowGauge = 'narrow_gauge',
   Path = 'path',
   /** Links between larger towns */
   Primary = 'primary',
   Rail = 'rail',
   /**
    * Roads which serve as an access to housing, without function of connecting
    * settlements. Often lined with housing.
    */
   Residential = 'residential',
   /** Links between towns */
   Secondary = 'secondary',
   /**
    * For access roads to, or within an industrial estate, camp site, business
    * park, car park etc. Can be used in conjunction with `service=*` to
    * indicate the type of usage and with access=* to indicate who can use it
    * and in what circumstances.
    */
   ServiceRoad = 'service',
   /**
    * For flights of steps (stairs) on footways. Use with `step_count=*` to
    * indicate the number of steps
    */
   Stairs = 'steps',
   Subway = 'subway',
   Tertiary = 'tertiary',
   /**
    * Roads for mostly agricultural or forestry uses. To describe the quality of
    * a track, see `tracktype=*`. Note: Although tracks are often rough with
    * unpaved surfaces, this tag is not describing the quality of a road but its
    * use. Consequently, if you want to tag a general use road, use one of the
    * general highway values instead of track.
    */
   TwoTrack = 'track',
   Tram = 'tram',
   /**
    * The most important roads in a country's system that aren't motorways.
    * (Need not necessarily be a divided highway.)
    */
   Trunk = 'trunk',
   /**
    * The least important through roads in a country's system — i.e. minor roads
    * of a lower classification than tertiary, but which serve a purpose other
    * than access to properties. (Often link villages and hamlets.)
    *
    * The word 'unclassified' is a historical artefact of the UK road system and
    * does not mean that the classification is unknown; you can use
    * `highway=road` for that.
    */
   Minor = 'unclassified'
}

/**
 * Common tags relevant to routing.
 */
export const enum Tag {
   /** `WayType` value */
   RoadType = 'highway',
   RailType = 'railway',
   JunctionType = 'junction',
   OneWay = 'oneway',
   /** Restriction exceptions */
   Exception = 'except',
   Type = 'type',
   /** Indicates disallowed transportation types */
   Restriction = 'restriction'
}

/**
 * Modes of transportion.
 */
export const enum Transport {
   Car = 'car',
   Bus = 'bus',
   Bicycle = 'bicycle',
   Horse = 'horse',
   Walk = 'foot',
   Motorcycle = 'motorcycle',
   Tram = 'tram',
   Train = 'train'
}

/**
 * @see https://wiki.openstreetmap.org/wiki/Key:access
 */
export const enum AccessibleTo {
   AllTerrainVehicle = 'atv',
   Any = 'access',
   Bicycle = 'bicycle',
   Bus = 'bus',
   Foot = 'foot',
   Horse = 'horse',
   MotorCar = 'motorcar',
   Motorcycle = 'motorcycle',
   MotorVehicle = 'motor_vehicle',
   ServiceVehicle = 'psv',
   Vehicle = 'vehicle'
}

export const enum ItemType {
   Node = 'node',
   Way = 'way',
   Relation = 'relation'
}

export const enum Access {
   None = 'no',
   Private = 'private'
}

export interface RouteConfig {
   name?: string;
   /** Weights per road type key */
   weights: { [key: string]: number };
   access: AccessibleTo[];
}

export type RouteMode = { [key: string]: RouteConfig };

export type Tags = { [key: string]: string };

export const enum Action {
   Modify = 'modify',
   Delete = 'delete'
}

export const enum Role {
   From = 'from',
   Via = 'via',
   To = 'to'
}

/**
 * Decimal latitude and longitude.
 */
export type Point = [number, number];

/**
 * @see https://wiki.openstreetmap.org/wiki/API_v0.6/XSD
 */
export interface OsmItem {
   id: number;
   //visible?: boolean;
   timestamp?: number;
   tags?: { [key: string]: string | undefined };
}

/**
 * Single point on the map.
 */
export interface Node extends OsmItem {
   lat: number;
   lon: number;
   open?: boolean;
   date?: number;
   point(): [number, number];
}

export interface Way extends OsmItem {
   nodes: Node[];
}

export interface RelationMember {
   nodes: Node[];
   role?: Role;
}

export interface Relation extends OsmItem {
   members: RelationMember[];
}

export interface Tile {
   /** Nodes keyed to their ID */
   nodes: Map<number, Node>;
   /** Ways keyed to their ID */
   ways: Map<number, Way>;
   relations: Relation[];
}
