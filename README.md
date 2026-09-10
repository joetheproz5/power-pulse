# PowerPulse

A clean, responsive one-page electricity-status dashboard for Hart El Sett, built from the public status data at `info.ghawi.me`.

Open `index.html` in a browser to view it. The page pulls the live source every 10 seconds (through a CORS proxy chain, since `info.ghawi.me` sends no CORS headers), falling back to a GitHub Pages snapshot of `data/status.json` that GitHub Actions refreshes every five minutes.

## Install it as an app

The site includes a web app manifest and service worker. On Android Chrome/Edge, open the site menu and choose **Install app**. On iPhone Safari, use **Share** then **Add to Home Screen**.

## Genuine real-time updates

The source data endpoint does not allow cross-origin browser requests, so GitHub Pages cannot safely fetch it directly. For updates within seconds, deploy the included fetch logic as a small server-side proxy (for example, a Cloudflare Worker) and have the page poll that proxy; a GitHub Pages-only deployment cannot meet that latency guarantee.
