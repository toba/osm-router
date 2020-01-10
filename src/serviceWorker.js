const KZikesDomains = [
   'localhost:7777',
   'api-dot-zikes-web-client.appspot.com'
];
const KMapBoxAccessKey =
   'pk.eyJ1IjoicmVtc3RlciIsImEiOiJjaXF6MnlrYXUwMDY3aTVubmxxdWN2M2htIn0.8FBrAn804OlX9QYW-FRVWA';
const KMapBoxDomain = 'mapbox.com/';
const KCodeCache = 'CodeCache_V1';
const KUserAssetCache = 'UserAssetCache';

//specialist, trimmable offline caches
const KUserJourneyCache = { url: '/plan/journeys', cache: 'UserJourneyCache' };
const KUserPrefCache = { url: '/plan/preferences', cache: 'UserPrefCache' };
const KSpecialistCaches = [KUserJourneyCache, KUserPrefCache];

// https://bitbucket.org/remek_zajac/zikes-web/src/446027a01a279e25de127a9d9a07e83c557f4a48/zikes-ui/src/main/webapp/app/mobile/serviceWorker.js?at=master&fileviewer=file-view-default#serviceWorker.js-182

self.addEventListener('install', function(event) {
   console.log('Installing Service Worker');
   event.waitUntil(
      caches
         .open(KCodeCache)
         .then(function(cache) {
            return cache.addAll([
               //local code assets
               '/css/slider.css',
               '/css/zikes.css',
               '/scripts/mobile/main.js',
               '/mobile/index.html',
               '/mobile/',
               '/graphics/windrose.png',
               '/graphics/windrose-shadow.png',
               '/graphics/Zikes_logo_beta_30px.png',
               '/graphics/Zikes_logo.png',
               '/graphics/google-icon.png',
               '/graphics/facebook-icon.png',
               '/templates/ui.template.html',
               '/templates/route.mobile.template.html',
               '/templates/tools.template.html',

               //external code assets
               '//cdnjs.cloudflare.com/ajax/libs/jquery/2.2.0/jquery.min.js',
               '//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.6/js/bootstrap.min.js',
               '//cdnjs.cloudflare.com/ajax/libs/typeahead.js/0.11.1/typeahead.jquery.min.js',
               '//cdnjs.cloudflare.com/ajax/libs/bootswatch/3.3.6/superhero/bootstrap.css',
               '//cdnjs.cloudflare.com/ajax/libs/bootswatch/3.3.6/fonts/glyphicons-halflings-regular.woff2',
               'https://api.tiles.mapbox.com/mapbox-gl-js/v0.32.1/mapbox-gl.css',
               'https://api.tiles.mapbox.com/mapbox-gl-js/v0.32.1/mapbox-gl.js',

               //MAPBOX Rendering Utensils
               'https://api.mapbox.com/styles/v1/mapbox/outdoors-v10?access_token=' +
                  KMapBoxAccessKey,
               'https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2,mapbox.mapbox-streets-v7.json?secure&access_token=' +
                  KMapBoxAccessKey,
               'https://api.mapbox.com/styles/v1/mapbox/outdoors-v10/sprite@2x.json?access_token=' +
                  KMapBoxAccessKey,
               'https://api.mapbox.com/styles/v1/mapbox/outdoors-v10/sprite@2x.png?access_token=' +
                  KMapBoxAccessKey,

               //fonts - dunno how to cache them.. trying hardcoded for now
               'https://api.mapbox.com/fonts/v1/mapbox/DIN%20Offc%20Pro%20Regular,Arial%20Unicode%20MS%20Regular/0-255.pbf?access_token=' +
                  KMapBoxAccessKey,
               'https://api.mapbox.com/fonts/v1/mapbox/DIN%20Offc%20Pro%20Regular,Arial%20Unicode%20MS%20Regular/256-511.pbf?access_token=' +
                  KMapBoxAccessKey,
               'https://api.mapbox.com/fonts/v1/mapbox/DIN%20Offc%20Pro%20Regular,Arial%20Unicode%20MS%20Regular/512-767.pbf?access_token=' +
                  KMapBoxAccessKey,
               'https://api.mapbox.com/fonts/v1/mapbox/DIN%20Offc%20Pro%20Regular,Arial%20Unicode%20MS%20Regular/8192-8447.pbf?access_token=' +
                  KMapBoxAccessKey,
               'https://api.mapbox.com/fonts/v1/mapbox/DIN%20Offc%20Pro%20Regular,Arial%20Unicode%20MS%20Regular/12288-12543.pbf?access_token=' +
                  KMapBoxAccessKey,
               'https://api.mapbox.com/fonts/v1/mapbox/DIN%20Offc%20Pro%20Regular,Arial%20Unicode%20MS%20Regular/65024-65279.pbf?access_token=' +
                  KMapBoxAccessKey,
               'https://api.mapbox.com/fonts/v1/mapbox/DIN%20Offc%20Pro%20Regular,Arial%20Unicode%20MS%20Regular/65280-65535.pbf?access_token=' +
                  KMapBoxAccessKey,

               'https://api.mapbox.com/fonts/v1/mapbox/DIN%20Offc%20Pro%20Medium,Arial%20Unicode%20MS%20Regular/0-255.pbf?access_token=' +
                  KMapBoxAccessKey,
               'https://api.mapbox.com/fonts/v1/mapbox/DIN%20Offc%20Pro%20Medium,Arial%20Unicode%20MS%20Regular/256-511.pbf?access_token=' +
                  KMapBoxAccessKey,
               'https://api.mapbox.com/fonts/v1/mapbox/DIN%20Offc%20Pro%20Medium,Arial%20Unicode%20MS%20Regular/8192-8447.pbf?access_token=' +
                  KMapBoxAccessKey,
               'https://api.mapbox.com/fonts/v1/mapbox/DIN%20Offc%20Pro%20Medium,Arial%20Unicode%20MS%20Regular/12288-12543.pbf?access_token=' +
                  KMapBoxAccessKey,
               'https://api.mapbox.com/fonts/v1/mapbox/DIN%20Offc%20Pro%20Medium,Arial%20Unicode%20MS%20Regular/65024-65279.pbf?access_token=' +
                  KMapBoxAccessKey,
               'https://api.mapbox.com/fonts/v1/mapbox/DIN%20Offc%20Pro%20Medium,Arial%20Unicode%20MS%20Regular/65280-65535.pbf?access_token=' +
                  KMapBoxAccessKey,

               'https://api.mapbox.com/fonts/v1/mapbox/DIN%20Offc%20Pro%20Bold,Arial%20Unicode%20MS%20Bold/0-255.pbf?access_token=' +
                  KMapBoxAccessKey,
               'https://api.mapbox.com/fonts/v1/mapbox/DIN%20Offc%20Pro%20Bold,Arial%20Unicode%20MS%20Bold/1024-1279.pbf?access_token=' +
                  KMapBoxAccessKey,
               'https://api.mapbox.com/fonts/v1/mapbox/DIN%20Offc%20Pro%20Bold,Arial%20Unicode%20MS%20Bold/12288-12543.pbf?access_token=' +
                  KMapBoxAccessKey,
               'https://api.mapbox.com/fonts/v1/mapbox/DIN%20Offc%20Pro%20Bold,Arial%20Unicode%20MS%20Bold/65024-65279.pbf?access_token=' +
                  KMapBoxAccessKey,

               'https://api.mapbox.com/fonts/v1/mapbox/DIN%20Offc%20Pro%20Italic,Arial%20Unicode%20MS%20Regular/0-255.pbf?access_token=' +
                  KMapBoxAccessKey,
               'https://api.mapbox.com/fonts/v1/mapbox/DIN%20Offc%20Pro%20Italic,Arial%20Unicode%20MS%20Regular/256-511.pbf?access_token=' +
                  KMapBoxAccessKey,
               'https://api.mapbox.com/fonts/v1/mapbox/DIN%20Offc%20Pro%20Italic,Arial%20Unicode%20MS%20Regular/65024-65279.pbf?access_token=' +
                  KMapBoxAccessKey,
               'https://api.mapbox.com/fonts/v1/mapbox/DIN%20Offc%20Pro%20Italic,Arial%20Unicode%20MS%20Regular/65280-65535.pbf?access_token=' +
                  KMapBoxAccessKey
            ]);
         })
         .then(function() {
            console.log('Service Worker Installed');
            return registration.scope.indexOf('localhost') != -1
               ? self.skipWaiting()
               : Promise.resolve();
         })
   );
});

self.addEventListener('activate', function(event) {
   event.waitUntil(self.clients.claim());
});

function trimOfflineCache(cacheName, url, elemMetas) {
   caches
      .open(cacheName)
      .then(function(cache) {
         return cache.keys();
      })
      .then(function(cachedKeys) {
         cachedKeys.forEach(function(cachedKey) {
            let cachedIdx = elemMetas.findIndex(function(elemMeta) {
               return cachedKey.url.endsWith(elemMeta.id);
            });
            if (cachedIdx == -1) {
               //the cached element is no longer on the server
               cache.delete(cachedKey);
            }
         });
         var trimmedMetas = [];
         elemMetas.forEach(function(elemMeta) {
            cachedKeys.forEach(function(cachedKey) {
               !cachedKey.url.endsWith(elemMeta.id) ||
                  trimmedMetas.push(elemMeta);
            });
         });
         caches.open(KUserAssetCache).then(function(cache) {
            cache.put(
               url,
               new Response(JSON.stringify(trimmedMetas), {
                  status: 200,
                  statusText: 'OK',
                  headers: {
                     'Content-Type': 'application/json'
                  }
               })
            );
         });
      });
}

function fetchUserAsset(event) {
   if (navigator.onLine) {
      if (event.request.method == 'GET') {
         return fetch(event.request.clone()).then(
            function(response) {
               if (!response) {
                  return caches.match(event.request);
               }
               if (response.status !== 200 || response.type !== 'cors') {
                  return response;
               }

               if (
                  !KSpecialistCaches.find(function(specCache) {
                     if (event.request.url.indexOf(specCache.url) != -1) {
                        if (event.request.url.endsWith(specCache.url)) {
                           response
                              .clone()
                              .json()
                              .then(
                                 trimOfflineCache.bind(
                                    null,
                                    specCache.cache,
                                    event.request.url
                                 )
                              );
                        } else {
                           var responseToCache = response.clone();
                           caches.open(specCache.cache).then(function(cache) {
                              cache.put(event.request, responseToCache);
                           });
                        }
                        return true;
                     }
                  })
               ) {
                  var responseToCache = response.clone();
                  caches.open(KUserAssetCache).then(function(cache) {
                     cache.put(event.request, responseToCache);
                  });
               }
               return response;
            },
            function(e) {
               return caches.match(event.request);
            }
         );
      }
      return fetch(event.request);
   }
   return caches.match(event.request);
}

const KIgnoreDomains = ['googleapis', 'facebook', 'gstatic'];
function fetchApplicationAsset(event) {
   if (
      KZikesDomains.reduce(function(cum, domain) {
         return cum || event.request.url.indexOf(domain) != -1;
      }, false)
   ) {
      return fetchUserAsset(event);
   }

   return caches.match(event.request).then(function(response) {
      if (response) {
         return response;
      }
      var isMapboxReq = event.request.url.indexOf(KMapBoxDomain) != -1;
      if (isMapboxReq) {
         var re = /\/(\d+)\/(\d+)\/(\d+).vector.pbf/;
         var matched = event.request.url.match(re);
         if (matched) {
            var key = { z: matched[1], x: matched[2], y: matched[3] };
            return tileCacheDb.get(key).then(function(tileBuffer) {
               if (tileBuffer) {
                  return new Response(tileBuffer);
               }
               return fetch(event.request);
            });
         }
      }

      if (
         !KIgnoreDomains.find(function(domain) {
            return event.request.url.indexOf(domain) != -1;
         })
      ) {
         console.log("Unmatched URL '" + event.request.url + "'");
      }
      return fetch(event.request);
   });
}

// alternative https://github.com/mapbox/mapbox-gl-js/issues/4326
self.addEventListener('fetch', function(event) {
   event.respondWith(fetchApplicationAsset(event));
});
