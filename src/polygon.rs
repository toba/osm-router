use crate::elements::{Tag, Way};

struct Rule {
   key: &'static str,
   polygon: RuleType,
   values: [&'static str; 6],
}

enum RuleType {
   All,
   Blacklist,
   Whitelist,
}

static RULES: [Rule; 26] = [
   Rule {
      key: "building",
      polygon: RuleType::All,
      values: ["", "", "", "", "", ""],
   },
   Rule {
      key: "highway",
      polygon: RuleType::Whitelist,
      values: ["services", "rest_area", "escape", "elevator", "", ""],
   },
   Rule {
      key: "natural",
      polygon: RuleType::Blacklist,
      values: ["coastline", "cliff", "ridge", "arete", "tree_row", ""],
   },
   Rule {
      key: "landuse",
      polygon: RuleType::All,
      values: ["", "", "", "", "", ""],
   },
   Rule {
      key: "waterway",
      polygon: RuleType::Whitelist,
      values: ["riverbank", "dock", "boatyard", "dam", "", ""],
   },
   Rule {
      key: "amenity",
      polygon: RuleType::All,
      values: ["", "", "", "", "", ""],
   },
   Rule {
      key: "leisure",
      polygon: RuleType::All,
      values: ["", "", "", "", "", ""],
   },
   Rule {
      key: "barrier",
      polygon: RuleType::Whitelist,
      values: [
         "city_wall",
         "ditch",
         "hedge",
         "retaining_wall",
         "wall",
         "spikes",
      ],
   },
   Rule {
      key: "railway",
      polygon: RuleType::Whitelist,
      values: ["station", "turntable", "roundhouse", "platform", "", ""],
   },
   Rule {
      key: "area",
      polygon: RuleType::All,
      values: ["", "", "", "", "", ""],
   },
   Rule {
      key: "boundary",
      polygon: RuleType::All,
      values: ["", "", "", "", "", ""],
   },
   Rule {
      key: "man_made",
      polygon: RuleType::Blacklist,
      values: ["cutline", "embankment", "pipeline", "", "", ""],
   },
   Rule {
      key: "power",
      polygon: RuleType::Whitelist,
      values: ["plant", "substation", "generator", "transformer", "", ""],
   },
   Rule {
      key: "place",
      polygon: RuleType::All,
      values: ["", "", "", "", "", ""],
   },
   Rule {
      key: "shop",
      polygon: RuleType::All,
      values: ["", "", "", "", "", ""],
   },
   Rule {
      key: "aeroway",
      polygon: RuleType::Blacklist,
      values: ["taxiway", "", "", "", "", ""],
   },
   Rule {
      key: "tourism",
      polygon: RuleType::All,
      values: ["", "", "", "", "", ""],
   },
   Rule {
      key: "historic",
      polygon: RuleType::All,
      values: ["", "", "", "", "", ""],
   },
   Rule {
      key: "public_transport",
      polygon: RuleType::All,
      values: ["", "", "", "", "", ""],
   },
   Rule {
      key: "office",
      polygon: RuleType::All,
      values: ["", "", "", "", "", ""],
   },
   Rule {
      key: "building:part",
      polygon: RuleType::All,
      values: ["", "", "", "", "", ""],
   },
   Rule {
      key: "military",
      polygon: RuleType::All,
      values: ["", "", "", "", "", ""],
   },
   Rule {
      key: "ruins",
      polygon: RuleType::All,
      values: ["", "", "", "", "", ""],
   },
   Rule {
      key: "area:highway",
      polygon: RuleType::All,
      values: ["", "", "", "", "", ""],
   },
   Rule {
      key: "craft",
      polygon: RuleType::All,
      values: ["", "", "", "", "", ""],
   },
   Rule {
      key: "golf",
      polygon: RuleType::All,
      values: ["", "", "", "", "", ""],
   },
];

pub fn is_polygon(way: &Way) -> bool {
   if is_closed_loop(way) {
      return true;
   }

   way.tags.iter().any(|tag| {
      RULES
         .iter()
         .any(|rule| rule.key == tag.key && tag.val != "no" && has_matching_rule_value(rule, tag))
   })
}

fn is_closed_loop(way: &Way) -> bool {
   let first = way.nodes.first();
   let last = way.nodes.last();

   if let None = first.and(last) {
      return false;
   }

   first.unwrap() == last.unwrap()
}

fn has_matching_rule_value(rule: &Rule, tag: &Tag) -> bool {
   match rule.polygon {
      RuleType::All => true,
      RuleType::Whitelist => rule.values.iter().any(|val| *val != "" && *val == tag.val),
      RuleType::Blacklist => !rule.values.iter().any(|val| *val == tag.val),
   }
}
