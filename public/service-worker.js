/**
 * Service Worker for ImagePDF Toolkit
 * Smart caching with development mode support
 */

const CACHE_VERSION = 'v2.7';
const CACHE_NAME = `imagepdf-toolkit-${CACHE_VERSION}`;
const STATIC_CACHE = `imagepdf-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `imagepdf-dynamic-${CACHE_VERSION}`;

// Development mode detection
const isDevelopment = location.hostname === 'localhost' || 
                     location.hostname === '127.0.0.1' || 
                     location.hostname.includes('localhost') ||
                     location.protocol === 'file:' ||
                     location.port !== '';

console.log('Service Worker: Development mode detected:', isDevelopment);

// Get the base path for the current service worker
const getBasePath = () => {
    const swPath = self.location.pathname;
    return swPath.substring(0, swPath.lastIndexOf('/')) || './';
};

const basePath = getBasePath();

// Files to cache immediately - using dynamic base path resolution
const STATIC_FILES = [
    basePath + '/',
    basePath + '/index.html',
    basePath + '/styles.min.css',
    basePath + '/tailwind-complete.css',
    basePath + '/css/all.min.css', 
    basePath + '/css/premium-buttons.css',
    basePath + '/js/jspdf.min.js',
    basePath + '/js/pdf.min.js',
    basePath + '/js/pdf-config.js',
    basePath + '/js/pdf.worker.min.js',
    basePath + '/js/qrcode.min.js',
    basePath + '/js/library-loader.js',
    basePath + '/script.js',
    basePath + '/manifest.json',
    basePath + '/assets/svg-icons/qr-icon.svg'
];

// Critical JavaScript libraries that need special handling
const CRITICAL_JS_FILES = [
    basePath + '/js/jspdf.min.js',
    basePath + '/js/pdf.min.js',
    basePath + '/js/pdf-config.js',
    basePath + '/js/pdf.worker.min.js',
    basePath + '/js/qrcode.min.js',
    basePath + '/js/library-loader.js',
    basePath + '/script.js'
];

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        Promise.all([
            // Cache regular static files
            caches.open(STATIC_CACHE)
                .then(cache => {
                    console.log('Service Worker: Caching static files');
                    // Cache files individually to avoid complete failure
                    return Promise.allSettled(
                        STATIC_FILES.map(async (url) => {
                            try {
                                // First check if the file exists
                                const response = await fetch(url);
                                if (response.ok) {
                                    await cache.put(url, response.clone());
                                    console.log(`Service Worker: Cached ${url}`);
                                    return { success: true, url };
                                } else {
                                    console.warn(`Service Worker: Skipped ${url} (${response.status})`);
                                    return { success: false, url, status: response.status };
                                }
                            } catch (error) {
                                console.warn(`Service Worker: Failed to cache ${url}:`, error.message);
                                return { success: false, url, error: error.message };
                            }
                        })
                    );
                })
                .then((results) => {
                    const successful = results.filter(result => result.status === 'fulfilled' && result.value.success).length;
                    const failed = results.filter(result => result.status === 'rejected' || !result.value.success).length;
                    console.log(`Service Worker: Cached ${successful} files, ${failed} failed`);
                }),
            
            // Pre-warm critical JS files with extra care
            warmCriticalFiles()
        ])
        .then(() => {
            console.log('Service Worker: Installation completed');
            return self.skipWaiting();
        })
        .catch(error => {
            console.error('Service Worker: Error during installation:', error);
            // Still proceed with installation even if some files fail
            return self.skipWaiting();
        })
    );
});

// Function to pre-warm critical JavaScript files
async function warmCriticalFiles() {
    console.log('Service Worker: Warming critical JS files...');
    const cache = await caches.open(STATIC_CACHE);
    
    for (const filePath of CRITICAL_JS_FILES) {
        try {
            const response = await fetch(filePath);
            if (response.ok) {
                await cache.put(filePath, response.clone());
                console.log(`Service Worker: Critical file cached: ${filePath}`);
            } else {
                console.warn(`Service Worker: Failed to fetch critical file: ${filePath} (${response.status})`);
            }
        } catch (error) {
            console.warn(`Service Worker: Error caching critical file ${filePath}:`, error.message);
        }
    }
}

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated');
                return self.clients.claim();
            })
    );
});

// Smart fetch event - development vs production caching
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip external requests
    if (url.origin !== location.origin) {
        return;
    }

    // Development mode: Always fetch fresh, fallback to cache
    if (isDevelopment) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    console.log('🔄 Fresh fetch for:', request.url);
                    // Clone response for caching critical JS libraries
                    if (response.ok && (url.pathname.includes('jspdf') || url.pathname.includes('pdf.'))) {
                        const responseClone = response.clone();
                        caches.open(STATIC_CACHE)
                            .then(cache => cache.put(request, responseClone))
                            .catch(err => console.warn('Cache put failed:', err));
                    }
                    return response;
                })
                .catch(() => {
                    console.log('📦 Network failed, using cache for:', request.url);
                    return caches.match(request)
                        .then(cachedResponse => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
                            // Return a proper response for failed requests
                            return new Response('Resource not available', {
                                status: 404,
                                statusText: 'Not Found',
                                headers: { 'Content-Type': 'text/plain' }
                            });
                        });
                })
        );
        return;
    }

    // Production mode: Smart caching strategies
    if (request.destination === 'document' || request.destination === '') {
        // HTML pages - Network first with cache fallback
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(DYNAMIC_CACHE)
                            .then(cache => cache.put(request, responseClone))
                            .catch(err => console.warn('Cache put failed:', err));
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request)
                        .then(cachedResponse => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
                            return new Response('Page not available', {
                                status: 404,
                                statusText: 'Not Found',
                                headers: { 'Content-Type': 'text/html' }
                            });
                        });
                })
        );
    } else if (request.destination === 'style' || request.destination === 'script') {
        // CSS and JS files - Enhanced strategy for critical libraries
        const isCriticalJS = url.pathname.includes('jspdf') || 
                           url.pathname.includes('pdf.') || 
                           url.pathname.includes('script.js') ||
                           url.pathname.includes('qrcode');
        
        if (isCriticalJS) {
            // Critical JS: Cache-first with network update
            event.respondWith(
                caches.match(request)
                    .then(response => {
                        const fetchPromise = fetch(request)
                            .then(fetchResponse => {
                                if (fetchResponse.status === 200) {
                                    caches.open(STATIC_CACHE)
                                        .then(cache => cache.put(request, fetchResponse.clone()))
                                        .catch(err => console.warn('Cache put failed:', err));
                                }
                                return fetchResponse;
                            })
                            .catch(err => {
                                console.warn('Network fetch failed for critical JS:', request.url, err);
                                return response; // Return cached version on network error
                            });
                        
                        // Return cached version immediately if available, update in background
                        if (response) {
                            fetchPromise.catch(() => {}); // Update in background
                            return response;
                        }
                        
                        return fetchPromise;
                    })
            );
        } else {
            // Non-critical CSS and JS - Stale-while-revalidate
            event.respondWith(
                caches.match(request)
                    .then(response => {
                        const fetchPromise = fetch(request)
                            .then(fetchResponse => {
                                if (fetchResponse.status === 200) {
                                    caches.open(STATIC_CACHE)
                                        .then(cache => cache.put(request, fetchResponse.clone()))
                                        .catch(err => console.warn('Cache put failed:', err));
                                }
                                return fetchResponse;
                            })
                            .catch(() => {
                                if (response) {
                                    return response;
                                }
                                return new Response('Resource not available', {
                                    status: 404,
                                    statusText: 'Not Found',
                                    headers: { 'Content-Type': 'application/javascript' }
                                });
                            });
                        
                        return response || fetchPromise;
                    })
            );
        }
    } else if (request.destination === 'image') {
        // Images - Cache first with network fallback
        event.respondWith(
            caches.match(request)
                .then(response => {
                    return response || fetch(request)
                        .then(fetchResponse => {
                            if (fetchResponse.status === 200) {
                                const responseClone = fetchResponse.clone();
                                caches.open(DYNAMIC_CACHE)
                                    .then(cache => cache.put(request, responseClone))
                                    .catch(err => console.warn('Cache put failed:', err));
                            }
                            return fetchResponse;
                        })
                        .catch(() => {
                            return new Response('Image not available', {
                                status: 404,
                                statusText: 'Not Found',
                                headers: { 'Content-Type': 'text/plain' }
                            });
                        });
                })
        );
    } else {
        // Other resources - Network first
        event.respondWith(
            fetch(request)
                .then(response => response)
                .catch(() => {
                    return caches.match(request)
                        .then(cachedResponse => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
                            return new Response('Resource not available', {
                                status: 404,
                                statusText: 'Not Found',
                                headers: { 'Content-Type': 'text/plain' }
                            });
                        });
                })
        );
    }
});

// Background sync for offline actions
self.addEventListener('sync', event => {
    console.log('Service Worker: Background sync triggered:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(
            // Handle background sync tasks
            console.log('Service Worker: Processing background sync')
        );
    }
});

// Push notification handling
self.addEventListener('push', event => {
    console.log('Service Worker: Push notification received');
    
    const options = {
        body: event.data ? event.data.text() : 'New update available!',
        icon: '/assets/svg-icons/qr-icon.svg',
        badge: '/assets/svg-icons/qr-icon.svg',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Open Toolkit',
                icon: '/assets/svg-icons/qr-icon.svg'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/assets/svg-icons/qr-icon.svg'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('ImagePDF Toolkit', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification clicked');
    
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Error handling
self.addEventListener('error', event => {
    console.error('Service Worker: Error:', event.error);
});

// Unhandled rejection handling
self.addEventListener('unhandledrejection', event => {
    console.error('Service Worker: Unhandled rejection:', event.reason);
    // Prevent the error from propagating to the console
    event.preventDefault();
});

// Message handling for debugging and cache management
self.addEventListener('message', event => {
    console.log('Service Worker: Message received:', event.data);
    
    if (event.data && event.data.type === 'CHECK_CACHE') {
        // Check if a specific file is cached
        const { url } = event.data;
        caches.match(url)
            .then(response => {
                event.ports[0].postMessage({
                    type: 'CACHE_STATUS',
                    url: url,
                    cached: !!response,
                    timestamp: Date.now()
                });
            })
            .catch(error => {
                console.error('Service Worker: Error checking cache:', error);
                event.ports[0].postMessage({
                    type: 'CACHE_ERROR',
                    error: error.message
                });
            });
    } else if (event.data && event.data.type === 'FORCE_CACHE_REFRESH') {
        // Force refresh critical files
        const { url } = event.data;
        fetch(url, { cache: 'reload' })
            .then(response => {
                if (response.ok) {
                    return caches.open(STATIC_CACHE)
                        .then(cache => cache.put(url, response.clone()))
                        .then(() => {
                            event.ports[0].postMessage({
                                type: 'CACHE_REFRESHED',
                                url: url,
                                success: true
                            });
                        });
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            })
            .catch(error => {
                console.error('Service Worker: Error refreshing cache:', error);
                event.ports[0].postMessage({
                    type: 'CACHE_REFRESH_ERROR',
                    url: url,
                    error: error.message
                });
            });
    }
}); 