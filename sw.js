/**
 * Service Worker for AI Journal PWA
 * Provides offline support with cache-first strategy
 * Enhanced with better error handling and cache management
 */

const CACHE_NAME = 'ai-journal-v2';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/styles.css',
    './js/app.js',
    './js/api.js',
    './js/db.js',
    './js/crypto.js',
    './js/utils/export.js',
    './js/utils/notifications.js'
];

// Maximum cache size (in bytes) - 50MB
const MAX_CACHE_SIZE = 50 * 1024 * 1024;

/**
 * Log error with context
 */
function logError(context, error) {
    console.error(`[SW] ${context}:`, error);
}

/**
 * Get cache size
 */
async function getCacheSize(cacheName) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    let size = 0;

    for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
            const blob = await response.blob();
            size += blob.size;
        }
    }

    return size;
}

/**
 * Clean old cache entries if quota is exceeded
 */
async function cleanCacheIfNeeded(cacheName) {
    try {
        const size = await getCacheSize(cacheName);

        if (size > MAX_CACHE_SIZE) {
            console.log(`[SW] Cache size (${size} bytes) exceeds limit, cleaning...`);
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();

            // Remove oldest entries (keep static assets)
            const entriesToRemove = keys.filter(key => {
                const url = new URL(key.url);
                return !STATIC_ASSETS.some(asset => url.pathname.endsWith(asset));
            }).slice(0, Math.floor(keys.length / 2));

            for (const key of entriesToRemove) {
                await cache.delete(key);
            }

            console.log(`[SW] Removed ${entriesToRemove.length} cache entries`);
        }
    } catch (error) {
        logError('Cache cleanup', error);
    }
}

// Install - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(STATIC_ASSETS).catch(error => {
                    logError('Cache installation', error);
                    // Continue even if some assets fail to cache
                    return Promise.all(
                        STATIC_ASSETS.map(url =>
                            cache.add(url).catch(err => {
                                console.warn(`[SW] Failed to cache ${url}:`, err);
                            })
                        )
                    );
                });
            })
            .then(() => {
                console.log('[SW] Installation complete');
                return self.skipWaiting();
            })
            .catch(error => {
                logError('Installation', error);
            })
    );
});

// Activate - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log(`[SW] Deleting old cache: ${key}`);
                        return caches.delete(key);
                    })
            ))
            .then(() => {
                console.log('[SW] Activation complete');
                return self.clients.claim();
            })
            .catch(error => {
                logError('Activation', error);
            })
    );
});

// Fetch - cache-first for static assets
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle same-origin requests
    if (url.origin !== location.origin) {
        return;
    }

    // Network-first for API requests
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .catch(error => {
                    logError('API fetch', error);
                    return new Response(
                        JSON.stringify({ error: 'Network error. Please check your connection.' }),
                        {
                            status: 503,
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                })
        );
        return;
    }

    // Cache-first strategy for static assets
    event.respondWith(
        caches.match(request)
            .then(cached => {
                if (cached) {
                    return cached;
                }

                return fetch(request)
                    .then(response => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type === 'error') {
                            return response;
                        }

                        // Clone and cache the response
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => cache.put(request, responseToCache))
                            .then(() => cleanCacheIfNeeded(CACHE_NAME))
                            .catch(error => {
                                if (error.name === 'QuotaExceededError') {
                                    console.warn('[SW] Cache quota exceeded, cleaning...');
                                    cleanCacheIfNeeded(CACHE_NAME);
                                } else {
                                    logError('Cache write', error);
                                }
                            });

                        return response;
                    })
                    .catch(error => {
                        logError('Fetch', error);

                        // Return offline fallback for navigation requests
                        if (request.mode === 'navigate') {
                            return caches.match('./index.html')
                                .then(response => {
                                    if (response) {
                                        return response;
                                    }
                                    return new Response(
                                        '<html><body><h1>Offline</h1><p>Please check your connection.</p></body></html>',
                                        { headers: { 'Content-Type': 'text/html' } }
                                    );
                                });
                        }

                        return new Response('Offline', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
            .catch(error => {
                logError('Cache match', error);
                return new Response('Cache error', { status: 500 });
            })
    );
});

// Handle messages from the app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
