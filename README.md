# PowerPulse

A responsive one-page electricity-status dashboard for Hart El Sett, built from the public status data at `info.ghawi.me`.

Open `index.html` in a browser to view it. On GitHub Pages, `data/status.json` is refreshed by GitHub Actions every five minutes (the shortest reliable scheduled interval offered by GitHub Actions). The page itself rechecks that JSON every 30 seconds.

## Install it as an app

The site includes a web app manifest and service worker. On Android Chrome/Edge, open the site menu and choose **Install app**. On iPhone Safari, use **Share** then **Add to Home Screen**.

## Genuine real-time updates

The source data endpoint does not allow cross-origin browser requests, so GitHub Pages cannot safely fetch it directly. For updates within seconds, deploy the included fetch logic as a small server-side proxy (for example, a Cloudflare Worker) and have the page poll that proxy; a GitHub Pages-only deployment cannot meet that latency guarantee.
