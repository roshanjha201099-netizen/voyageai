# [COMPLETED] when a user add from the spotlight on home page:
  - Added modern AddToItineraryModal with Day (Day 1..N) and Time Slot selection (Morning/Afternoon/Evening/Night)
  - Fixed strikethrough bug in ItineraryView (isConfirmed was incorrectly triggering isDone line-through)
  - Added clean confirmed badge, location spacing, and non-blocking toast notifications
# [COMPLETED] the url [http://localhost:5173/en/home/trip/6cddb9082ff5] gets called again and again:
  - Fixed route matching in App.tsx by adding dedicated handlers for `/:lang/home/trip/:tripId`, `/:lang/trip/:tripId`, `/home/trip/:tripId`, `/trip/:tripId`, and `/:lang/*`
  - Added clean slicing of `/en/` locale prefixes (`LocaleRedirect`) and trip ID normalization (`TripRouteRedirect` maps raw hex `6cddb9082ff5` to `trip_6cddb9082ff5` and replaces cleanly with `/trip/itinerary`)
  - Updated backend trip resolvers in `main.py` (`verify_trip_ownership`, `get_trip_by_id`, `trips:get_itinerary`, `trips:get_stays`, `trips:get_transports`, `trips:get_expenses`) to match candidate IDs (`[trip_id, f"trip_{trip_id}", trip_id.replace("trip_", "")]`) to prevent 404 retry loops
  - Stabilized `userLocation` state reference in `AppContext.tsx` and primitive coordinate dependencies in `HomePage.tsx` to stop continuous GPS tick re-renders

# when ever i go to landing page it gets this guest_id saved in cookies for some reason 


# where are saved places kept verify it and make a section for saved places if not already


# on map page add filters to food stay and all 


# [COMPLETED] Performance Audit Optimizations (Netlify / Frontend)
  1) Created netlify.toml:
     - Long-lived immutable caching for `/assets/*` (Cache-Control: public, max-age=31536000, immutable)
     - Must-revalidate caching for HTML/entry point (Cache-Control: public, max-age=0, must-revalidate)
     - SPA catch-all redirect rule (/* -> /index.html 200)
     - Allow images.unsplash.com in remote image CDN config
  2) Eliminated render-blocking Leaflet CSS:
     - Removed static unpkg Leaflet CSS link from index.html
     - Isolated Leaflet CSS into lazy-loaded MapView and vendor-leaflet chunk
  3) Image Optimizations & CLS:
     - Added loading="lazy" and decoding="async" across all image components
     - Preserved layout dimensions with aspect ratios and background placeholders
     - Added optimizeUnsplashUrl utility with responsive query parameters
  4) Asset Filename Casing:
     - Verified all public assets and index.html references use strict lowercase matching disk (manifest, favicon, etc.)
