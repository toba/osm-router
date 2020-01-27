#[cfg(test)]
mod test {
   use super::*;
   use crate::elements::{Tag, UnresolvedReference, Way};

   #[test]
   fn tagless_and_nonloop_is_not_polygon() {
      let way = Way {
         id: 1234567,
         tags: Vec::new(),
         nodes: Vec::new(),
      };

      assert!(!is_polygon(&way));
   }

   #[test]
   fn closed_loop_is_polygon() {
      let way = Way {
         id: 1234567,
         tags: Vec::new(),
         nodes: vec![
            UnresolvedReference::Node(1),
            UnresolvedReference::Node(2),
            UnresolvedReference::Node(3),
            UnresolvedReference::Node(26),
            UnresolvedReference::Node(1),
         ],
      };

      assert!(is_polygon(&way));
   }

   #[test]
   fn detect_ruletype_all_with_tag_val() {
      let way = Way {
         id: 1234567,
         tags: vec![Tag {
            key: String::from("building"),
            val: String::from("this_is_not_valid"),
         }],
         nodes: Vec::new(),
      };

      assert!(is_polygon(&way));
   }

   #[test]
   fn detect_ruletype_all_without_tag_val() {
      let way = Way {
         id: 1234567,
         tags: vec![Tag {
            key: String::from("building"),
            val: String::from(""),
         }],
         nodes: Vec::new(),
      };

      assert!(is_polygon(&way));
   }

   #[test]
   fn whitelist_val_included_is_polygon() {
      let way = Way {
         id: 1234567,
         tags: vec![Tag {
            key: String::from("highway"),
            val: String::from("escape"),
         }],
         nodes: Vec::new(),
      };

      assert!(is_polygon(&way));
   }

   #[test]
   fn whitelist_val_not_included_is_not_polygon() {
      let way = Way {
         id: 1234567,
         tags: vec![Tag {
            key: String::from("highway"),
            val: String::from("footway"),
         }],
         nodes: Vec::new(),
      };

      assert!(!is_polygon(&way));
   }

   #[test]
   fn whitelist_with_empty_val_is_not_polygon() {
      let way = Way {
         id: 1234567,
         tags: vec![Tag {
            key: String::from("highway"),
            val: String::from(""),
         }],
         nodes: Vec::new(),
      };

      assert!(!is_polygon(&way));
   }

   #[test]
   fn whitelist_with_matching_and_nonmatching_tags_is_polygon() {
      let way = Way {
         id: 1234567,
         tags: vec![
            Tag {
               key: String::from("highway"),
               val: String::from("footway"),
            },
            Tag {
               key: String::from("highway"),
               val: String::from("escape"),
            },
         ],
         nodes: Vec::new(),
      };

      assert!(is_polygon(&way));
   }

   #[test]
   fn nonloop_and_whitelist_match_is_polygon() {
      let way = Way {
         id: 1234567,
         tags: vec![Tag {
            key: String::from("highway"),
            val: String::from("escape"),
         }],
         nodes: vec![
            UnresolvedReference::Node(1),
            UnresolvedReference::Node(2),
            UnresolvedReference::Node(3),
         ],
      };

      assert!(is_polygon(&way));
   }

   #[test]
   fn blacklist_val_included_is_not_polygon() {
      let way = Way {
         id: 1234567,
         tags: vec![Tag {
            key: String::from("natural"),
            val: String::from("cliff"),
         }],
         nodes: Vec::new(),
      };

      assert!(!is_polygon(&way));
   }

   #[test]
   fn blacklist_val_not_included_is_polygon() {
      let way = Way {
         id: 1234567,
         tags: vec![Tag {
            key: String::from("natural"),
            val: String::from("tree"),
         }],
         nodes: Vec::new(),
      };

      assert!(is_polygon(&way));
   }

   #[test]
   fn blacklist_with_empty_val_is_not_polygon() {
      let way = Way {
         id: 1234567,
         tags: vec![Tag {
            key: String::from("natural"),
            val: String::from(""),
         }],
         nodes: Vec::new(),
      };

      assert!(!is_polygon(&way));
   }

   #[test]
   fn blacklist_with_matching_and_nonmatching_tags_is_polygon() {
      let way = Way {
         id: 1234567,
         tags: vec![
            Tag {
               key: String::from("natural"),
               val: String::from("cliff"),
            },
            Tag {
               key: String::from("natural"),
               val: String::from("tree"),
            },
         ],
         nodes: Vec::new(),
      };

      assert!(is_polygon(&way));
   }

   #[test]
   fn nonloop_and_blacklist_cleared_is_polygon() {
      let way = Way {
         id: 1234567,
         tags: vec![Tag {
            key: String::from("natural"),
            val: String::from("tree"),
         }],
         nodes: vec![
            UnresolvedReference::Node(1),
            UnresolvedReference::Node(2),
            UnresolvedReference::Node(3),
         ],
      };

      assert!(is_polygon(&way));
   }

   #[test]
   fn rules_with_no_value_are_not_polygons() {
      let keys = vec![
         "building",
         "highway",
         "natural",
         "landuse",
         "waterway",
         "amenity",
         "leisure",
         "barrier",
         "railway",
         "area",
         "boundary",
         "man_made",
         "power",
         "place",
         "shop",
         "aeroway",
         "tourism",
         "historic",
         "public_transport",
         "office",
         "building:part",
         "military",
         "ruins",
         "area:highway",
         "craft",
         "golf",
      ];

      let ways = keys.iter().map(|key| {
         return Way {
            id: 1234567,
            tags: vec![Tag {
               key: String::from(*key),
               val: String::from("no"),
            }],
            nodes: Vec::new(),
         };
      });

      for way in ways {
         assert!(!is_polygon(&way));
      }
   }
}
