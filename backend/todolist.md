# when a user add from the spotlight on home page it gets added but in tre trip detail it gets some wierd ui crossed on 
  1) when i again go back to the same page it again shows the added thing 
# the  url [http://localhost:5173/en/home/trip/6cddb9082ff5] gets called again and again 

# when ever i go to landing page it gets this guest_id saved in cookies for some reason 


# where are saved places kept verify it and make a section for saved places if not already


# on map page add filters to food stay and all 


# Performance Audit Optimizations (Netlify / Frontend)
  1) Create netlify.toml:
     - Long-lived immutable caching for `/assets/*` (Cache-Control: public, max-age=31536000, immutable)
     - Must-revalidate caching for HTML/entry point (Cache-Control: public, max-age=0, must-revalidate)
     - SPA catch-all redirect rule (/* -> /index.html 200)
     - Allow images.unsplash.com in remote image CDN config
  2) Eliminate render-blocking Leaflet CSS:
     - Remove static unpkg Leaflet CSS link from index.html
     - Dynamically import Leaflet CSS inside map view component only
  3) Image Optimizations:
     - Add loading="lazy" and decoding="async" to offscreen images (destination cards, hotel grids, profile avatar)
     - Add explicit width/height or aspect-ratio wrappers to prevent layout shifts (CLS)
     - Route Unsplash images through Netlify Image CDN or optimized query parameters
  4) Asset Filename Casing:
     - Ensure index.html and Vite build output match filename casing consistently to prevent 404s on case-sensitive Linux/Netlify hosts
