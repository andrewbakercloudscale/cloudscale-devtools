/* global csdtVulnScan, csdtCspI18n */
'use strict';

(function(){
    var base = {
        'default-src': ["'self'"],
        'script-src':  ["'self'","'unsafe-inline'"],
        'style-src':   ["'self'","'unsafe-inline'"],
        'img-src':     ["'self'","data:","https:"],
        'font-src':    ["'self'","data:"],
        'connect-src': ["'self'"],
        'frame-src':   ["'self'"],
        'object-src':  ["'none'"],
        'base-uri':    ["'self'"],
        'form-action': ["'self'"]
    };
    var serviceMap = {
        google_analytics:    { 'script-src':['https://www.googletagmanager.com','https://www.google-analytics.com'], 'img-src':['https://www.google-analytics.com','https://www.googletagmanager.com'], 'connect-src':['https://www.google-analytics.com','https://analytics.google.com','https://stats.g.doubleclick.net','https://region1.google-analytics.com'] },
        google_adsense:      { 'script-src':['https://*.googlesyndication.com','https://*.googletagservices.com','https://*.googleadservices.com','https://adservice.google.com','https://fundingchoicesmessages.google.com'], 'frame-src':['blob:','https://*.googlesyndication.com','https://*.safeframe.googlesyndication.com','https://googleads.g.doubleclick.net','https://ep2.adtrafficquality.google'], 'img-src':['https://*.googlesyndication.com','https://googleads.g.doubleclick.net'], 'connect-src':['https://*.googlesyndication.com','https://*.googletagservices.com','https://adservice.google.com','https://ep1.adtrafficquality.google','https://ep2.adtrafficquality.google','https://fundingchoicesmessages.google.com','https://csi.gstatic.com'] },
        google_tag_manager:  { 'script-src':['https://www.googletagmanager.com'], 'img-src':['https://www.googletagmanager.com'] },
        google_fonts:        { 'style-src':['https://fonts.googleapis.com'], 'font-src':['https://fonts.gstatic.com'] },
        cloudflare_insights: { 'script-src':['https://static.cloudflareinsights.com'], 'connect-src':['https://cloudflareinsights.com'] },
        facebook_pixel:      { 'script-src':['https://connect.facebook.net'], 'img-src':['https://www.facebook.com'], 'connect-src':['https://www.facebook.com'] },
        recaptcha:           { 'script-src':['https://www.google.com','https://www.gstatic.com'], 'frame-src':['https://www.google.com'] },
        youtube:             { 'frame-src':['https://www.youtube.com','https://www.youtube-nocookie.com'] },
        vimeo:               { 'frame-src':['https://player.vimeo.com'] },
        stripe:              { 'script-src':['https://js.stripe.com'], 'frame-src':['https://js.stripe.com','https://hooks.stripe.com'], 'connect-src':['https://api.stripe.com'] },
        hotjar:              { 'script-src':['https://static.hotjar.com','https://script.hotjar.com'], 'connect-src':['https://*.hotjar.com','wss://*.hotjar.com'], 'img-src':['https://*.hotjar.com'], 'frame-src':['https://*.hotjar.com'] },
        intercom:            { 'script-src':['https://widget.intercom.io','https://js.intercomcdn.com'], 'connect-src':['https://api.intercom.io','https://api-iam.intercom.io','wss://nexus-websocket-a.intercom.io','wss://nexus-websocket-b.intercom.io'], 'img-src':['https://*.intercom.io','https://*.intercomcdn.com'], 'frame-src':['https://intercom-sheets.com'] },
        twitter_embeds:      { 'script-src':['https://platform.twitter.com'], 'frame-src':['https://platform.twitter.com','https://syndication.twitter.com'], 'connect-src':['https://api.twitter.com'], 'img-src':['https://pbs.twimg.com','https://abs.twimg.com'] },
        disqus:              { 'script-src':['https://*.disqus.com','https://*.disquscdn.com'], 'frame-src':['https://disqus.com'], 'connect-src':['https://*.disqus.com'], 'img-src':['https://*.disquscdn.com','https://referrer.disqus.com'] },
        woocommerce_payments: { 'script-src':['https://js.stripe.com','https://pay.google.com'], 'frame-src':['https://js.stripe.com','https://hooks.stripe.com','https://pay.google.com'], 'connect-src':['https://api.stripe.com'] }
    };

    function buildPreview() {
        var d = JSON.parse(JSON.stringify(base));
        document.querySelectorAll('.cs-csp-service:checked').forEach(function(cb){
            var svc = serviceMap[cb.value];
            if (!svc) return;
            Object.keys(svc).forEach(function(dir){
                svc[dir].forEach(function(v){ if (d[dir].indexOf(v) === -1) d[dir].push(v); });
            });
        });
        var parts = Object.keys(d).map(function(k){ return k + ' ' + d[k].join(' '); });
        var custom = document.getElementById('cs-csp-custom');
        if (custom && custom.value.trim()) parts.push(custom.value.trim());
        document.getElementById('cs-csp-preview').textContent = parts.join(';\n');
    }

    document.querySelectorAll('.cs-csp-service').forEach(function(cb){ cb.addEventListener('change', buildPreview); });
    var customIn = document.getElementById('cs-csp-custom');
    if (customIn) customIn.addEventListener('input', buildPreview);
    buildPreview();

    var copyBtn = document.getElementById('cs-csp-copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', function(){
            var text = document.getElementById('cs-csp-preview').textContent;
            navigator.clipboard.writeText(text).then(function(){
                copyBtn.textContent = '✅ Copied';
                setTimeout(function(){ copyBtn.textContent = '📋 Copy'; }, 2000);
            });
        });
    }

    var saveBtn  = document.getElementById('cs-csp-save-btn');
    var savedMsg = document.getElementById('cs-csp-saved');
    if (saveBtn) {
        saveBtn.addEventListener('click', function(){
            saveBtn.disabled = true;
            var services = [];
            document.querySelectorAll('.cs-csp-service:checked').forEach(function(cb){ services.push(cb.value); });
            var modeEl = document.querySelector('input[name="cs-csp-mode"]:checked');
            var fd = new FormData();
            fd.append('action',   'csdt_devtools_csp_save');
            fd.append('nonce',    csdtVulnScan.nonce);
            fd.append('enabled',      document.getElementById('cs-csp-enabled').checked ? '1' : '0');
            fd.append('mode',         modeEl ? modeEl.value : 'enforce');
            fd.append('services',     JSON.stringify(services));
            fd.append('custom',       customIn ? customIn.value.trim() : '');
            var dbgCb = document.getElementById('cs-csp-debug-panel');
            fd.append('debug_panel',       dbgCb && dbgCb.checked ? '1' : '0');
            var reportingCb = document.getElementById('cs-csp-reporting-enabled');
            fd.append('reporting_enabled', reportingCb && reportingCb.checked ? '1' : '0');
            fetch(csdtVulnScan.ajaxUrl, { method:'POST', body:fd })
                .then(function(r){ return r.json(); })
                .then(function(resp){
                saveBtn.disabled = false;
                if (savedMsg) { savedMsg.style.display = 'inline'; setTimeout(function(){ savedMsg.style.display = 'none'; }, 2500); }
                document.dispatchEvent(new CustomEvent('csdt:csp:saved'));
                // Create or update rollback button with fresh timestamp.
                if (resp && resp.data && resp.data.has_backup) {
                    var rb = document.getElementById('cs-csp-rollback-btn');
                    if (!rb) {
                        rb = document.createElement('button');
                        rb.id = 'cs-csp-rollback-btn';
                        rb.type = 'button';
                        rb.className = 'cs-btn-secondary cs-btn-sm';
                        rb.style.cssText = 'border-color:#f87171;color:#dc2626;';
                        saveBtn.parentNode.insertBefore(rb, saveBtn.nextSibling);
                        wireRollback(rb);
                    }
                    rb.innerHTML = '\u21a9 ' + ( window.csdtCspI18n ? csdtCspI18n.rollbackLabel : 'Rollback to previous settings' ) + ' <span style="font-weight:400;font-size:11px;opacity:.8;">(just now)</span>';
                }
            })
            .catch(function(){ saveBtn.disabled = false; });
        });
    }

    function wireRollback(btn) {
        if (!btn) return;
        btn.addEventListener('click', function(){
            if (!confirm('Restore the previous CSP settings? This will overwrite the current configuration.')) { return; }
            btn.disabled = true;
            var fd = new FormData();
            fd.append('action', 'csdt_devtools_csp_rollback');
            fd.append('nonce',  csdtVulnScan.nonce);
            fetch(csdtVulnScan.ajaxUrl, { method:'POST', body:fd })
                .then(function(r){ return r.json(); })
                .then(function(resp){
                    if (!resp.success) { alert('Rollback failed: ' + (resp.data || 'unknown error')); btn.disabled = false; return; }
                    var d = resp.data;
                    // Restore UI state.
                    var en = document.getElementById('cs-csp-enabled');
                    if (en) en.checked = d.enabled === '1';
                    var modeEl = document.querySelector('input[name="cs-csp-mode"][value="' + (d.mode || 'enforce') + '"]');
                    if (modeEl) modeEl.checked = true;
                    document.querySelectorAll('.cs-csp-service').forEach(function(cb){
                        cb.checked = Array.isArray(d.services) && d.services.indexOf(cb.value) !== -1;
                    });
                    if (customIn) customIn.value = d.custom || '';
                    buildPreview();
                    btn.remove();
                    var rb2 = document.getElementById('cs-csp-rolledback');
                    if (rb2) { rb2.style.display = 'inline'; setTimeout(function(){ rb2.style.display = 'none'; }, 3000); }
                })
                .catch(function(){ btn.disabled = false; });
        });
    }
    wireRollback(document.getElementById('cs-csp-rollback-btn'));

    // ── Change history restore ────────────────────────────────────
    document.querySelectorAll('.cs-csp-restore-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var idx = btn.getAttribute('data-index');
            if (!confirm('Restore this CSP configuration? The current settings will be pushed to history first.')) { return; }
            btn.disabled = true; btn.textContent = '⏳';
            var fd = new FormData();
            fd.append('action', 'csdt_devtools_csp_restore');
            fd.append('nonce',  csdtVulnScan.nonce);
            fd.append('index',  idx);
            fetch(csdtVulnScan.ajaxUrl, { method:'POST', body:fd })
                .then(function(r){ return r.json(); })
                .then(function(resp) {
                    if (!resp.success) { alert('Restore failed: ' + (resp.data || 'unknown error')); btn.disabled = false; btn.textContent = '↩ Restore'; return; }
                    var d = resp.data;
                    var en = document.getElementById('cs-csp-enabled');
                    if (en) en.checked = d.enabled === '1';
                    var modeEl = document.querySelector('input[name="cs-csp-mode"][value="' + (d.mode || 'enforce') + '"]');
                    if (modeEl) modeEl.checked = true;
                    document.querySelectorAll('.cs-csp-service').forEach(function(cb) {
                        cb.checked = Array.isArray(d.services) && d.services.indexOf(cb.value) !== -1;
                    });
                    if (customIn) customIn.value = d.custom || '';
                    buildPreview();
                    var msg = document.getElementById('cs-csp-restore-msg');
                    if (msg) { msg.style.display = 'block'; msg.textContent = '↩ Restored — click Save CSP Settings to apply.'; }
                    btn.textContent = '✅ Restored';
                })
                .catch(function() { btn.disabled = false; btn.textContent = '↩ Restore'; });
        });
    });

    // ── Violation log ────────────────────────────────────────────
    var violWrap    = document.getElementById('cs-csp-violation-wrap');
    var violTable   = document.getElementById('cs-csp-viol-table');
    var violCount   = document.getElementById('cs-csp-viol-count');
    var violRefresh = document.getElementById('cs-csp-viol-refresh');
    var violClear   = document.getElementById('cs-csp-viol-clear');

    function renderViolations(rows) {
        if (!violTable) return;
        if (!rows || !rows.length) {
            violTable.innerHTML = '<p style="color:#94a3b8;font-size:12px;margin:0;">No violations recorded yet. Browse your site with Report-Only enabled to capture them.</p>';
            if (violCount) violCount.style.display = 'none';
            return;
        }
        if (violCount) { violCount.textContent = rows.length; violCount.style.display = 'inline'; }
        var html = '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
            '<thead><tr style="background:#f1f5f9;">' +
            '<th style="padding:6px 8px;text-align:left;font-weight:600;color:#374151;border-bottom:1px solid #e2e8f0;">Time</th>' +
            '<th style="padding:6px 8px;text-align:left;font-weight:600;color:#374151;border-bottom:1px solid #e2e8f0;">Blocked</th>' +
            '<th style="padding:6px 8px;text-align:left;font-weight:600;color:#374151;border-bottom:1px solid #e2e8f0;">Directive</th>' +
            '<th style="padding:6px 8px;text-align:left;font-weight:600;color:#374151;border-bottom:1px solid #e2e8f0;">Source</th>' +
            '<th style="padding:6px 8px;text-align:left;font-weight:600;color:#374151;border-bottom:1px solid #e2e8f0;">Page</th>' +
            '</tr></thead><tbody>';
        rows.forEach(function(r, i) {
            var d = new Date(r.time * 1000);
            var t = d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) + ' ' + d.toLocaleDateString([], {month:'short',day:'numeric'});
            var bg = i % 2 === 0 ? '#fff' : '#f8fafc';
            var blocked = r.blocked || '—';
            var isEval   = blocked === 'eval' || blocked === 'inline';
            var blockedColor = isEval ? '#dc2626' : '#0f172a';
            var blockedDisplay = blocked.length > 50 ? blocked.slice(0, 47) + '…' : blocked;
            var srcFile = r.source ? r.source.replace(/^https?:\/\/[^/]+\//, '') : '';
            if (srcFile.length > 45) srcFile = '…' + srcFile.slice(-42);
            var srcDisplay = srcFile ? srcFile + (r.line ? ':' + r.line : '') : '—';
            var pageDisplay = (r.page || '—').replace(/^https?:\/\/[^/]+/, '');
            if (pageDisplay.length > 35) pageDisplay = pageDisplay.slice(0, 32) + '…';
            html += '<tr style="background:' + bg + ';border-bottom:1px solid #f1f5f9;">' +
                '<td style="padding:5px 8px;white-space:nowrap;color:#64748b;">' + t + '</td>' +
                '<td style="padding:5px 8px;font-family:monospace;color:' + blockedColor + ';" title="' + blocked.replace(/"/g,'&quot;') + '">' + blockedDisplay + '</td>' +
                '<td style="padding:5px 8px;font-family:monospace;color:#6366f1;">' + (r.directive || '—') + '</td>' +
                '<td style="padding:5px 8px;font-family:monospace;font-size:11px;color:#0369a1;" title="' + (r.source||'').replace(/"/g,'&quot;') + (r.line?':'+r.line:'') + '">' + srcDisplay + '</td>' +
                '<td style="padding:5px 8px;color:#64748b;" title="' + (r.page||'').replace(/"/g,'&quot;') + '">' + pageDisplay + '</td>' +
                '</tr>';
        });
        html += '</tbody></table>';
        violTable.innerHTML = html;
    }

    function fetchViolations() {
        var fd = new FormData();
        fd.append('action', 'csdt_devtools_csp_violations_get');
        fd.append('nonce',  csdtVulnScan.nonce);
        fetch(csdtVulnScan.ajaxUrl, { method:'POST', body:fd })
            .then(function(r){ return r.json(); })
            .then(function(resp){ if (resp && resp.success) renderViolations(resp.data); })
            .catch(function(){});
    }

    function updateViolWrapVisibility() {
        if (!violWrap) return;
        var cspOn    = document.getElementById('cs-csp-enabled');
        var reportOn = document.getElementById('cs-csp-reporting-enabled');
        var show = (cspOn && cspOn.checked) && (reportOn && reportOn.checked);
        violWrap.style.display = show ? '' : 'none';
        if (show) fetchViolations();
    }

    var cspEnabledCb    = document.getElementById('cs-csp-enabled');
    var reportingEnabledCb = document.getElementById('cs-csp-reporting-enabled');
    if (cspEnabledCb)       cspEnabledCb.addEventListener('change', updateViolWrapVisibility);
    if (reportingEnabledCb) reportingEnabledCb.addEventListener('change', updateViolWrapVisibility);

    if (violRefresh) violRefresh.addEventListener('click', fetchViolations);

    if (violClear) {
        violClear.addEventListener('click', function() {
            var fd = new FormData();
            fd.append('action', 'csdt_devtools_csp_violations_clear');
            fd.append('nonce',  csdtVulnScan.nonce);
            fetch(csdtVulnScan.ajaxUrl, { method:'POST', body:fd })
                .then(function(){ renderViolations([]); })
                .catch(function(){});
        });
    }

    // Auto-load if violation log is visible on page load
    if (violWrap && violWrap.style.display !== 'none') fetchViolations();

    // Auto-refresh every 30 s when panel is visible
    setInterval(function() {
        if (violWrap && violWrap.style.display !== 'none') fetchViolations();
    }, 30000);

    // ── Fixes log ────────────────────────────────────────────────
    var fixesWrap  = document.getElementById('cs-csp-fixes-wrap');
    var fixesTable = document.getElementById('cs-csp-fixes-table');
    var fixesCount = document.getElementById('cs-csp-fixes-count');
    var fixesClear = document.getElementById('cs-csp-fixes-clear');

    function renderFixes(rows) {
        if (!fixesWrap) return;
        if (!rows || !rows.length) {
            fixesWrap.style.display = 'none';
            return;
        }
        fixesWrap.style.display = '';
        if (fixesCount) fixesCount.textContent = rows.length;
        if (!fixesTable) return;
        var html = '';
        rows.forEach(function(f, i) {
            var d   = new Date(f.time * 1000);
            var ts  = d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) + ' ' + d.toLocaleDateString([], {month:'short',day:'numeric'});
            var bg  = i % 2 === 0 ? '#fff' : '#f8fafc';
            var lbl = f.label || 'Settings updated';
            html += '<div style="display:flex;align-items:center;gap:10px;padding:7px 12px;background:' + bg + ';' + (i > 0 ? 'border-top:1px solid #e2e8f0;' : '') + '">' +
                '<span style="color:#94a3b8;font-size:11px;white-space:nowrap;min-width:110px;">' + ts + '</span>' +
                '<span style="flex:1;font-size:12px;color:#15803d;font-weight:600;">' + lbl + '</span>' +
                '</div>';
        });
        fixesTable.innerHTML = html;
    }

    if (fixesClear) {
        fixesClear.addEventListener('click', function() {
            var fd = new FormData();
            fd.append('action', 'csdt_devtools_csp_fixes_clear');
            fd.append('nonce',  csdtVulnScan.nonce);
            fetch(csdtVulnScan.ajaxUrl, { method:'POST', body:fd })
                .then(function() { renderFixes([]); })
                .catch(function() {});
        });
    }

    // After a successful save, refresh the fixes log in case new ones were added.
    // Hooked via a custom event dispatched by the save handler.
    document.addEventListener('csdt:csp:saved', function() {
        var fd = new FormData();
        fd.append('action', 'csdt_devtools_csp_fixes_get');
        fd.append('nonce',  csdtVulnScan.nonce);
        fetch(csdtVulnScan.ajaxUrl, { method:'POST', body:fd })
            .then(function(r) { return r.json(); })
            .then(function(resp) { if (resp && resp.success) renderFixes(resp.data); })
            .catch(function() {});
    });

    // ── Header security scan ──────────────────────────────────────
    var scanBtn     = document.getElementById('cs-csp-scan-btn');
    var scanResults = document.getElementById('cs-csp-scan-results');
    var scanSpinner = document.getElementById('cs-csp-scan-spinner');

    var SEC_KEYS = ['content-security-policy','content-security-policy-report-only','strict-transport-security','x-frame-options','x-content-type-options','referrer-policy','permissions-policy'];
    var SEC_LABELS = {'content-security-policy':'Content-Security-Policy','content-security-policy-report-only':'CSP-Report-Only','strict-transport-security':'Strict-Transport-Security','x-frame-options':'X-Frame-Options','x-content-type-options':'X-Content-Type-Options','referrer-policy':'Referrer-Policy','permissions-policy':'Permissions-Policy'};
    var GRADE_COLORS = {'A+':'#15803d','A':'#16a34a','B':'#1d4ed8','C':'#b45309','D':'#c2410c','F':'#991b1b'};

    function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    function secBox(title, content) {
        return '<div style="border:1px solid #d1d5db;border-radius:6px;overflow:hidden;margin-bottom:12px;">' +
            '<div style="background:#e8edf5;padding:9px 14px;border-bottom:1px solid #d1d5db;">' +
            '<strong style="font-size:13px;color:#1e293b;">' + title + '</strong></div>' +
            '<div style="padding:14px 16px;">' + content + '</div></div>';
    }

    function renderScanResults(data) {
        if (!scanResults) return;
        var home = data && data.home;
        if (!home) { scanResults.innerHTML = '<p style="color:#94a3b8;font-size:12px;">No data returned.</p>'; return; }

        var html = '';

        // ── 1. Security Report Summary ───────────────────────────────
        if (home.error) {
            html += secBox('Security Report Summary', '<p style="color:#dc2626;font-size:12px;margin:0;">Error: ' + esc(home.error) + '</p>');
        } else {
            var grade = home.grade || '?';
            var gc    = GRADE_COLORS[grade] || '#64748b';
            var sec   = home.sec || {};
            var now   = new Date();
            var ts    = now.toISOString().replace('T',' ').slice(0,19) + ' UTC';

            // Build header pills
            var pills = '';
            SEC_KEYS.forEach(function(k) {
                var s = sec[k] ? sec[k].status : 'missing';
                var lbl = SEC_LABELS[k] || k;
                // CSP-Report-Only is optional/informational — only show when present
                if (k === 'content-security-policy-report-only' && s === 'missing') return;
                if (s === 'present') {
                    pills += '<span style="display:inline-flex;align-items:center;gap:4px;background:#15803d;color:#fff;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;margin:2px 3px 2px 0;white-space:nowrap;">✓ ' + lbl + '</span>';
                } else if (s === 'duplicate') {
                    pills += '<span style="display:inline-flex;align-items:center;gap:4px;background:#d97706;color:#fff;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;margin:2px 3px 2px 0;white-space:nowrap;">⚠ ' + lbl + '</span>';
                } else {
                    pills += '<span style="display:inline-flex;align-items:center;gap:4px;background:#dc2626;color:#fff;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;margin:2px 3px 2px 0;white-space:nowrap;">✗ ' + lbl + '</span>';
                }
            });

            var warnSummary = '';
            if (home.warnings && home.warnings.length) {
                warnSummary = 'Grade capped at ' + grade + ', please see warnings below.';
            }

            var summaryInner =
                '<div style="display:flex;gap:16px;align-items:flex-start;">' +
                '<div style="width:80px;height:80px;min-width:80px;background:' + gc + ';border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                '<span style="color:#fff;font-size:44px;font-weight:900;line-height:1;">' + grade + '</span></div>' +
                '<table style="flex:1;font-size:12px;border-collapse:collapse;width:100%;">' +
                '<tr><td style="padding:4px 8px 4px 0;font-weight:700;white-space:nowrap;vertical-align:top;color:#374151;width:110px;">Site:</td>' +
                '<td style="padding:4px 0;color:#374151;"><a href="' + esc(home.url) + '" target="_blank" rel="noopener" style="color:#2563eb;">' + esc(home.url) + '</a></td></tr>';
            if (home.ip) {
                summaryInner += '<tr><td style="padding:4px 8px 4px 0;font-weight:700;white-space:nowrap;vertical-align:top;color:#374151;">IP Address:</td>' +
                    '<td style="padding:4px 0;color:#374151;">' + esc(home.ip) + '</td></tr>';
            }
            summaryInner +=
                '<tr><td style="padding:4px 8px 4px 0;font-weight:700;white-space:nowrap;vertical-align:top;color:#374151;">Report Time:</td>' +
                '<td style="padding:4px 0;color:#374151;">' + ts + '</td></tr>' +
                '<tr><td style="padding:4px 8px 4px 0;font-weight:700;white-space:nowrap;vertical-align:top;color:#374151;">Headers:</td>' +
                '<td style="padding:4px 0;line-height:1.8;">' + pills + '</td></tr>';
            if (warnSummary) {
                summaryInner += '<tr><td style="padding:4px 8px 4px 0;font-weight:700;white-space:nowrap;vertical-align:top;color:#374151;">Warning:</td>' +
                    '<td style="padding:4px 0;color:#374151;">' + esc(warnSummary) + '</td></tr>';
            }
            summaryInner += '</table></div>';
            html += secBox('Security Report Summary', summaryInner);

            // ── 2. Warnings ──────────────────────────────────────────
            if (home.warnings && home.warnings.length) {
                var warnRows = '';
                home.warnings.forEach(function(w) {
                    warnRows += '<div style="border-bottom:1px solid #f1f5f9;padding:10px 0;">' +
                        '<div style="font-weight:700;color:#b45309;font-size:12px;margin-bottom:3px;">' + esc(w.header) + '</div>' +
                        '<div style="color:#374151;font-size:12px;word-break:break-word;">' + esc(w.msg) + '</div></div>';
                });
                html += secBox('Warnings', '<div>' + warnRows + '</div>');
            }

            // ── 3. Raw Headers ───────────────────────────────────────
            if (home.all_headers) {
                var rawRows = '';
                Object.keys(home.all_headers).forEach(function(hk) {
                    var val = home.all_headers[hk];
                    var isSec = SEC_KEYS.indexOf(hk) !== -1;
                    var valStr = Array.isArray(val) ? val.join(', ') : String(val || '');
                    rawRows += '<div style="border-bottom:1px solid #f1f5f9;padding:7px 0;">' +
                        '<div style="font-weight:700;font-size:12px;margin-bottom:2px;' + (isSec ? 'color:#15803d;' : 'color:#374151;') + '">' + esc(hk) + '</div>' +
                        '<div style="font-size:12px;word-break:break-all;' + (isSec ? 'font-weight:600;color:#1e293b;' : 'color:#374151;') + '">' + esc(valStr) + '</div></div>';
                });
                html += secBox('Raw Headers', '<div>' + rawRows + '</div>');
            }
        }

        // ── 4. Other pages compact table ─────────────────────────────
        if (data.pages && data.pages.length) {
            var PAGE_COLS = ['content-security-policy','strict-transport-security','x-frame-options','x-content-type-options'];
            var pageRows = '<tr style="background:#f8fafc;">' +
                '<th style="padding:5px 8px;text-align:left;font-weight:600;color:#374151;border-bottom:1px solid #e2e8f0;font-size:11px;">Page</th>';
            PAGE_COLS.forEach(function(k) { pageRows += '<th style="padding:5px 6px;text-align:center;font-weight:600;color:#374151;border-bottom:1px solid #e2e8f0;font-size:10px;white-space:nowrap;">' + SEC_LABELS[k] + '</th>'; });
            pageRows += '</tr>';
            data.pages.forEach(function(row, i) {
                var bg = i % 2 ? '#f8fafc' : '#fff';
                if (row.error) { pageRows += '<tr style="background:' + bg + '"><td colspan="5" style="padding:5px 8px;color:#dc2626;font-size:11px;">' + esc(row.url) + ' — ' + esc(row.error) + '</td></tr>'; return; }
                var slug = (row.url.replace(/^https?:\/\/[^/]+/,'') || '/');
                if (slug.length > 50) slug = slug.slice(0,47) + '…';
                pageRows += '<tr style="background:' + bg + ';border-bottom:1px solid #f1f5f9;"><td style="padding:5px 8px;font-size:11px;color:#374151;" title="' + esc(row.url) + '">' + esc(slug) + '</td>';
                PAGE_COLS.forEach(function(k) {
                    var s = row.sec && row.sec[k] ? row.sec[k].status : 'missing';
                    var cell = s === 'present' ? '<span style="color:#16a34a;font-weight:700;">✓</span>'
                             : s === 'duplicate' ? '<span style="color:#d97706;font-weight:700;">⚠</span>'
                             : '<span style="color:#dc2626;font-weight:700;">✗</span>';
                    pageRows += '<td style="text-align:center;padding:5px 4px;">' + cell + '</td>';
                });
                pageRows += '</tr>';
            });
            html += secBox('Last 10 Pages', '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">' + pageRows + '</table></div>');
        }

        scanResults.innerHTML = html;
    }

    function runHeaderScan() {
        if (!scanBtn) { return; }
        scanBtn.disabled = true;
        if (scanSpinner) scanSpinner.style.display = 'inline';
        if (scanResults) scanResults.innerHTML = '';

        var controller = new AbortController();
        var timer = setTimeout(function() { controller.abort(); }, 30000);

        var fd = new FormData();
        fd.append('action', 'csdt_scan_headers');
        fd.append('nonce',  csdtVulnScan.nonce);
        fetch(csdtVulnScan.ajaxUrl, { method:'POST', body:fd, signal: controller.signal })
            .then(function(r) {
                return r.text().then(function(txt) { return { status: r.status, txt: txt }; });
            })
            .then(function(res) {
                clearTimeout(timer);
                scanBtn.disabled = false;
                if (scanSpinner) scanSpinner.style.display = 'none';
                var resp = null;
                try { resp = JSON.parse(res.txt); } catch(e) {}
                if (resp && resp.success) {
                    renderScanResults(resp.data);
                } else if (resp) {
                    if (scanResults) scanResults.innerHTML = '<p style="color:#dc2626;font-size:12px;">Scan failed: ' + esc(resp.data || 'unknown error') + '</p>' + retryHtml();
                } else {
                    var preview = res.txt ? res.txt.replace(/<[^>]+>/g, ' ').trim().slice(0, 200) : '(empty)';
                    if (scanResults) scanResults.innerHTML = '<p style="color:#dc2626;font-size:12px;">Scan error (HTTP ' + res.status + '): ' + esc(preview) + '</p>' + retryHtml();
                }
            })
            .catch(function(err) {
                clearTimeout(timer);
                scanBtn.disabled = false;
                if (scanSpinner) scanSpinner.style.display = 'none';
                var isTimeout = err && err.name === 'AbortError';
                var msg = isTimeout ? 'Request timed out after 30s' : ('Request failed: ' + (err && err.message ? err.message : 'network error'));
                if (scanResults) scanResults.innerHTML = '<p style="color:#dc2626;font-size:12px;">' + esc(msg) + '</p>' + retryHtml();
            });
    }

    function retryHtml() {
        return '<p style="margin-top:6px;"><button type="button" id="cs-scan-retry" style="font-size:12px;padding:3px 10px;background:#fff;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;">Retry scan</button></p>';
    }

    if (scanBtn) {
        scanBtn.addEventListener('click', runHeaderScan);
    }

    document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'cs-scan-retry') { runHeaderScan(); }
    });
})();
