// CloudScale Uptime Monitor — readiness probe
// Deployed via: Deploy Worker to Cloudflare button in WP Admin → Tools → CloudScale DevTools → Optimizer tab
//
// Required environment bindings (set in Cloudflare Worker → Settings → Variables):
//   SITE_URL   — your WordPress site URL (e.g. https://andrewbaker.ninja)
//   PING_URL   — WordPress admin-ajax.php URL (receives ping data)
//   READY_URL  — readiness endpoint URL (e.g. https://andrewbaker.ninja/wp-json/csdt/v1/ready/abc123)
//   PING_TOKEN — shared secret token (generated in WP Admin)
//   NTFY_URL   — ntfy.sh topic URL for down alerts (e.g. https://ntfy.sh/yourtopic)
//
// Cron trigger: * * * * *  (every minute)

export default {
  async scheduled(event, env, ctx) {
    const start = Date.now();
    let statusCode = 0, responseMs = 0, isUp = false;
    try {
      // Probe the readiness endpoint — checks DB, PHP-FPM saturation, and WP boot.
      // Returns 200 when healthy, 503 when degraded, connection error when server is down.
      const res = await fetch(env.READY_URL, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + env.PING_TOKEN,
          'User-Agent': 'CloudScale-Uptime/1.0',
          'Cache-Control': 'no-store',
        },
        signal: AbortSignal.timeout(15000),
      });
      statusCode = res.status;
      responseMs = Date.now() - start;
      isUp = statusCode === 200;
    } catch(e) { responseMs = Date.now() - start; }

    if (!isUp && env.NTFY_URL) {
      ctx.waitUntil(fetch(env.NTFY_URL, {
        method: 'POST',
        headers: {'Title': 'Site Down: ' + env.SITE_URL, 'Priority': 'urgent', 'Tags': 'rotating_light'},
        body: 'Readiness probe: ' + (statusCode ? 'HTTP ' + statusCode : 'timeout') + ' — ' + responseMs + 'ms',
      }).catch(() => {}));
    }

    ctx.waitUntil(fetch(env.PING_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: 'action=csdt_uptime_ping&token=' + encodeURIComponent(env.PING_TOKEN) + '&status_code=' + statusCode + '&response_ms=' + responseMs,
      signal: AbortSignal.timeout(10000),
    }).catch(() => {}));
  },
};
