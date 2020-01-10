/**
 * Kind of road, street, path or rail.
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
   /** @see https://wiki.openstreetmap.org/wiki/Key:access */
   Access = 'access',
   /** `WayType` value */
   RoadType = 'highway',
   RailType = 'railway',
   JunctionType = 'junction',
   OneWay = 'oneway',
   /** Restriction exceptions */
   Exception = 'except',
   Type = 'type',
   /**
    * Indicates access generally disallowed or disallowed for a specific mode
    * of transportation.
    * @see https://wiki.openstreetmap.org/wiki/Relation:restriction
    */
   Restriction = 'restriction',
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

/**
 * Modes of travel.
 */
export const enum TravelMode {
   Car = 'car',
   Bus = 'bus',
   Bicycle = 'bicycle',
   Horse = 'horse',
   Walk = 'foot',
   Motorcycle = 'motorcycle',
   Tram = 'tram',
   Train = 'train'
}

export const enum ItemType {
   Node = 'node',
   Way = 'way',
   Relation = 'relation'
}

/**
 * @see https://wiki.openstreetmap.org/wiki/Key:access
 */
export const enum Access {
   /** Access only for agricultural vehicles */
   Agricultural = 'agricultural',
   /** Public has an official, legally-enshrined right of access */
   Allowed = 'yes',
   /** Accewss only for customers */
   Customers = 'customers',
   /** Access only for deliveries */
   Delivery = 'delivery',
   /** Access is legal but discouraged */
   Discouraged = 'discouraged',
   /** Access only to specific destination */
   Destination = 'destination',
   /** Only forestry traffic allowed */
   Forestry = 'forestry',
   /** No access to general public */
   None = 'no',
   /** Owner granted access */
   Permissive = 'permissive',
   /** Accessible only to individuals with permission */
   Private = 'private'
}

/**
 * @see https://wiki.openstreetmap.org/wiki/Relation:restriction
 */
export const enum RestrictionType {
   NoRightTurn = 'no_right_turn',
   NoLeftTurn = 'no_left_turn',
   NoUturn = 'no_u_turn',
   NoStraight = 'no_straight_on',
   OnlyRightTurn = 'only_right_turn',
   OnlyLeftTurn = 'only_left_turn',
   OnlyStright = 'only_straight_on',
   NoEntry = 'no_entry',
   NoExit = 'no_exit'
}

/**
 * Permitted access types and road or rail type weighting that together define
 * routing preferences.
 */
export interface RouteConfig {
   name: string;
   /**
    * Weights keyed to road types — larger numbers indicate stronger
    * preference
    */
   weights: { [key: string]: number };
   /**
    * Usable access types ordered by specificity. The first item should be most
    * general and the last most specific so when iterated, later types can
    * override earlier ones.
    */
   canUse: Tag[];
}

export type RouteMode = { [key: string]: RouteConfig };

/**
 * Relation member roles.
 */
export const enum Role {
   From = 'from',
   Via = 'via',
   To = 'to',
   /** Relative polygon position */
   Inner = 'inner',
   /** Relative polygon position */
   Outer = 'outer',
   SubArea = 'subarea',
   /** Direction of travel, e.g. for a bus route */
   Forward = 'forward',
   Backward = 'backward',
   Platform = 'platform'
}

/** Decimal latitude and longitude. */
export type Point = [number, number];

/** Left, bottom, right, top */
export type BoundingBox = [number, number, number, number];

/** Values keyed to tags. */
export type TagMap = { [key: string]: string | undefined };

/**
 * Properties common to OSM nodes, ways and relations.
 * @see https://wiki.openstreetmap.org/wiki/API_v0.6/XSD
 * @see https://wiki.openstreetmap.org/wiki/Elements
 */
export interface OsmElement {
   /**
    * Used for identifying the element. Element types have their own ID space,
    * so there could be a node with id=100 and a way with id=100, which are
    * unlikely to be related or geographically near to each other.
    *
    * Positive (>0) values are used for all existing elements (and will remain
    * assigned when they are modified or deleted); negative values (<0) are
    * reserved (their scope limited to the current changeset and never stored
    * in the database) and only used when sending data to the OSM database for
    * identifying new objects to create and reference them in other created or
    * modified objects (the server will replace these temporary identifiers sent
    * by the editing application, by assigning an actual positive identifier for
    * each created object, and will return a mapping from the negative
    * identifiers used to their assigned positive identifiers).
    */
   id: number;
   //visible?: boolean;
   /**
    * Time of the last modification
    * @example "2016-12-31T23:59:59.999Z"
    */
   timestamp?: number;
   /**
    * All types of data element (nodes, ways and relations), as well as
    * changesets, can have tags. Tags describe the meaning of the particular
    * element to which they are attached.
    *
    * A tag consists of two free format text fields; a `key` and a `value`. Each
    * of these are Unicode strings of up to 255 characters. For example,
    * `highway=residential` defines the way as a road whose main function is to
    * give access to people's homes. An element cannot have 2 tags with the same
    * `key`, the key's must be unique. For example, you cannot have an element
    * tagged both `amenity=restaurant` and `amenity=bar`.
    *
    * There is no fixed dictionary of tags, but there are many conventions
    * documented on this wiki (starting with the Map Features page). Tag usage
    * can be measured with the Taginfo application. If there is more than one
    * way to tag a given feature, it's probably best to use the most common
    * approach.
    *
    * Not all elements have tags. Nodes are often untagged if they are part of
    * ways. Both ways and nodes may be untagged if they are members of a
    * relation.
    *
    * @see https://wiki.openstreetmap.org/wiki/Tags
    */
   tags?: TagMap;
}

/**
 * A node is one of the core elements in the OpenStreetMap data model. It
 * consists of a single point in space defined by its latitude, longitude and
 * node id.
 *
 * A third, optional dimension (altitude) can also be included: `key:ele`
 * (abrev. for "elevation"). A node can also be defined as part of a particular
 * `layer=*` or `level=*`, where distinct features pass over or under one
 * another; say, at a bridge.
 *
 * @see https://wiki.openstreetmap.org/wiki/Node
 */
export interface Node extends OsmElement {
   /**
    * Latitude coordinate in degrees (North of equator is positive) using the
    * standard WGS84 projection
    */
   lat: number;
   /**
    * Longitude coordinate in degrees (East of Greenwich is positive) using the
    * standard WGS84 projection. Note that the geographic poles will be exactly
    * at latitude ±90 degrees but in that case the longitude will be set to an
    * arbitrary value within this range.
    */
   lon: number;
   /** Altitude or elevation */
   ele?: number;
   open?: boolean;
   date?: number;
   point(): [number, number];
}

/**
 * Collection of nodes representing a way of travel.
 *
 * A way is an ordered list of nodes which normally also has at least one tag or
 * is included within a `relation`. A way can have between 2 and 2,000 nodes,
 * although it's possible that faulty ways with zero or a single node exist. A
 * way can be open or closed. A closed way is one whose last node on the way is
 * also the first on that way. A closed way may be interpreted either as a
 * closed polyline, or an area, or both.
 *
 * @see https://wiki.openstreetmap.org/wiki/Way
 */
export interface Way extends OsmElement {
   nodes: Node[];
}

export interface RelationMember {
   nodes: Node[];
   /** @see https://wiki.openstreetmap.org/wiki/Relation#Roles */
   role?: Role;
}

/**
 * Restrictions and boundaries defined among a collection of nodes.
 * @see https://wiki.openstreetmap.org/wiki/Relation
 * @see https://wiki.openstreetmap.org/wiki/Relation:restriction
 */
export interface Relation extends OsmElement {
   members: RelationMember[];
   /**
    * Tags applied to relation. XPath OSM parsing only allows relations that
    * have tags.
    */
   tags: TagMap;
}

/**
 * Box-bounded OSM data download including
 *
 * - All nodes that are inside a given bounding box and any relations that
 *   reference them.
 * - All ways that reference at least one node that is inside a given bounding
 *   box, any relations that reference them [the ways], and any nodes outside
 *   the bounding box that the ways may reference.
 * - All relations that reference one of the nodes, ways or relations included
 *   due to the above rules. (Does not apply recursively.)
 *
 * @see https://wiki.openstreetmap.org/wiki/API_v0.6#Retrieving_map_data_by_bounding_box:_GET_.2Fapi.2F0.6.2Fmap
 */
export interface AreaData {
   /** Nodes keyed to their ID */
   nodes: Map<number, Node>;
   /** Ways keyed to their ID */
   ways: Map<number, Way>;
   relations: Relation[];
}

/**
 * Result of routing request.
 */
export const enum Status {
   /** Start and end nodes are not connected */
   NoRoute,
   /** Found series of nodes connecting start to end */
   Success,
   /**
    * Maximum tries exceeded searching for connection between start and end
    * nodes
    */
   GaveUp
}
