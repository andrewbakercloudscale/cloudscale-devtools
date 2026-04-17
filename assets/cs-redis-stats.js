/* global csdtRedis */
(function () {
    'use strict';

    var ajaxUrl = csdtRedis.ajaxUrl;
    var nonce   = csdtRedis.nonce;

    function fmtNum(n) {
        return Number(n).toLocaleString();
    }

    function fmtUptime(seconds) {
        var d = Math.floor(seconds / 86400);
        var h = Math.floor((seconds % 86400) / 3600);
        var m = Math.floor((seconds % 3600) / 60);
        if (d > 0) return d + 'd ' + h + 'h';
        if (h > 0) return h + 'h ' + m + 'm';
        return m + 'm ' + (seconds % 60) + 's';
    }

    function setText(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    function loadStats() {
        var loading = document.getElementById('cs-redis-loading');
        var errBox  = document.getElementById('cs-redis-error');
        var grid    = document.getElementById('cs-redis-stats-grid');
        var actions = document.getElementById('cs-redis-actions');

        if (loading) loading.style.display = 'block';
        if (errBox)  { errBox.style.display = 'none'; errBox.textContent = ''; }
        if (grid)    grid.style.display = 'none';
        if (actions) actions.style.display = 'none';

        var fd = new FormData();
        fd.append('action', 'csdt_devtools_redis_stats');
        fd.append('nonce', nonce);

        fetch(ajaxUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (res) {
                if (loading) loading.style.display = 'none';
                if (!res.success) {
                    if (errBox) {
                        errBox.textContent = '❌ ' + (res.data && res.data.message ? res.data.message : 'Failed to load Redis stats.');
                        errBox.style.display = 'block';
                    }
                    return;
                }
                renderStats(res.data);
                if (grid)    grid.style.display    = 'grid';
                if (actions) actions.style.display = 'flex';
            })
            .catch(function (e) {
                if (loading) loading.style.display = 'none';
                if (errBox) {
                    errBox.textContent = '❌ Network error: ' + e.message;
                    errBox.style.display = 'block';
                }
            });
    }

    function renderStats(d) {
        // Status
        setText('cs-redis-status', '✅ Connected (v' + d.version + ')');

        // Hit rate
        var hitEl = document.getElementById('cs-redis-hit-rate');
        if (d.hit_rate !== null && d.hit_rate !== undefined) {
            var hr = d.hit_rate;
            if (hitEl) {
                hitEl.textContent = hr + '%';
                hitEl.className = 'cs-redis-stat-value cs-redis-hit-rate ' +
                    (hr >= 80 ? 'cs-redis-good' : hr >= 50 ? 'cs-redis-warn' : 'cs-redis-bad');
            }
            setText('cs-redis-hit-detail', fmtNum(d.keyspace_hits) + ' hits / ' + fmtNum(d.keyspace_misses) + ' misses');
        } else {
            if (hitEl) {
                hitEl.textContent = 'N/A';
                hitEl.className = 'cs-redis-stat-value cs-redis-hit-rate';
            }
            setText('cs-redis-hit-detail', 'No requests yet');
        }

        // Memory
        setText('cs-redis-memory', d.used_memory_human);
        var bar = document.getElementById('cs-redis-mem-bar');
        if (d.max_memory_bytes > 0) {
            var pct = Math.min(100, Math.round((d.used_memory_bytes / d.max_memory_bytes) * 100));
            if (bar) {
                bar.style.width = pct + '%';
                bar.className = 'cs-redis-progress-bar ' +
                    (pct >= 90 ? 'cs-bar-red' : pct >= 70 ? 'cs-bar-amber' : 'cs-bar-green');
            }
            setText('cs-redis-mem-detail', 'Max: ' + d.max_memory_human + ' (' + pct + '% used)');
        } else {
            if (bar) { bar.style.width = '0'; bar.className = 'cs-redis-progress-bar cs-bar-green'; }
            setText('cs-redis-mem-detail', 'Max: ' + d.max_memory_human);
        }

        setText('cs-redis-wp-keys',   d.wp_key_count !== undefined ? fmtNum(d.wp_key_count) : '—');
        setText('cs-redis-wp-prefix', d.wp_prefix ? 'Prefix: ' + d.wp_prefix + '*' : '(no prefix)');
        setText('cs-redis-total-keys', fmtNum(d.total_keys));
        setText('cs-redis-evicted',    fmtNum(d.evicted_keys));
        setText('cs-redis-expired',    fmtNum(d.expired_keys));
        setText('cs-redis-version',    d.version);
        setText('cs-redis-uptime',     fmtUptime(d.uptime_seconds));
        setText('cs-redis-clients',    fmtNum(d.connected_clients));
        setText('cs-redis-commands',   fmtNum(d.total_commands));
        setText('cs-redis-policy',     d.maxmemory_policy);
    }

    function flush(mode) {
        var msg = document.getElementById('cs-redis-flush-msg');
        if (msg) { msg.textContent = 'Flushing…'; msg.className = 'cs-redis-flush-msg'; }

        var fd = new FormData();
        fd.append('action', 'csdt_devtools_redis_flush');
        fd.append('nonce', nonce);
        fd.append('mode', mode);

        fetch(ajaxUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (res) {
                if (msg) {
                    if (res.success) {
                        msg.textContent = '✅ ' + (res.data.message || 'Done.');
                        msg.className   = 'cs-redis-flush-msg cs-flush-ok';
                    } else {
                        msg.textContent = '❌ ' + (res.data && res.data.message ? res.data.message : 'Error');
                        msg.className   = 'cs-redis-flush-msg cs-flush-err';
                    }
                    setTimeout(function () {
                        if (msg) { msg.textContent = ''; msg.className = 'cs-redis-flush-msg'; }
                    }, 4000);
                }
                if (res.success) { loadStats(); }
            });
    }

    document.addEventListener('DOMContentLoaded', function () {
        loadStats();

        var refreshBtn  = document.getElementById('cs-redis-refresh');
        var flushWpBtn  = document.getElementById('cs-redis-flush-wp');
        var flushAllBtn = document.getElementById('cs-redis-flush-all');

        if (refreshBtn)  refreshBtn.addEventListener('click',  loadStats);
        if (flushWpBtn)  flushWpBtn.addEventListener('click',  function () { flush('wp'); });
        if (flushAllBtn) {
            flushAllBtn.addEventListener('click', function () {
                if (window.confirm('This wipes the ENTIRE Redis database — not just WordPress keys.\n\nOther apps sharing this Redis instance will lose their data.\n\nContinue?')) {
                    flush('all');
                }
            });
        }
    });
})();
