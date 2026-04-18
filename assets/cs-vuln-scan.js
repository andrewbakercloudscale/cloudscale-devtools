/* global csdtVulnScan */
(function () {
    'use strict';

    var cfg      = csdtVulnScan;
    var ajaxUrl  = cfg.ajaxUrl;
    var nonce    = cfg.nonce;

    var POLL_INTERVAL = 3000; // ms between status polls

    // ── Helpers ───────────────────────────────────────────────────────

    function post(action, params) {
        var fd = new FormData();
        fd.append('action', action);
        fd.append('nonce', nonce);
        Object.keys(params).forEach(function (k) { fd.append(k, params[k]); });
        return fetch(ajaxUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function (r) { return r.json(); });
    }

    function escHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function timeSince(unixTs) {
        var secs = Math.floor(Date.now() / 1000) - unixTs;
        if (secs < 120)             return secs + 's';
        var mins = Math.floor(secs / 60);
        if (mins < 120)             return mins + 'm';
        var hours = Math.floor(mins / 60);
        if (hours < 48)             return hours + 'h';
        return Math.floor(hours / 24) + 'd';
    }

    function scoreClass(score) {
        if (score >= 90) return 'cs-audit-score-excellent';
        if (score >= 75) return 'cs-audit-score-good';
        if (score >= 55) return 'cs-audit-score-fair';
        if (score >= 35) return 'cs-audit-score-poor';
        return 'cs-audit-score-critical';
    }

    // ── PDF export (jsPDF — direct download, no print dialog) ────────

    var JSPDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

    function exportSecurityPDF(data, scanType) {
        function build() {
            var r     = data.report;
            var now   = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
            var site  = window.location.hostname;
            var title = scanType === 'deep' ? 'AI Deep Dive Cyber Audit Report' : 'AI Cyber Audit Report';
            var doc   = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            var pageW = doc.internal.pageSize.getWidth();
            var pageH = doc.internal.pageSize.getHeight();
            var margin = 18;
            var cW     = pageW - margin * 2;
            var y      = 20;

            function checkPage(need) {
                if (y + (need || 10) > pageH - 14) { doc.addPage(); y = 20; }
            }

            function addWrapped(str, x, size, r, g, b, style, maxW) {
                doc.setFont('helvetica', style || 'normal');
                doc.setFontSize(size);
                doc.setTextColor(r, g, b);
                var lines = doc.splitTextToSize(String(str || ''), maxW || (cW - (x - margin)));
                checkPage(lines.length * (size * 0.38) + 2);
                doc.text(lines, x, y);
                y += lines.length * (size * 0.38) + 1.5;
            }

            // Header
            addWrapped(title, margin, 18, 15, 23, 42, 'bold');
            y += 1;
            addWrapped(site + '  ·  ' + now + '  ·  Model: ' + (data.model_used || '?'), margin, 9, 100, 116, 139);
            y += 5;

            // Score circle + summary
            var sc = r.score || 0;
            var sRgb = sc >= 90 ? [39,103,73] : sc >= 75 ? [43,108,176] : sc >= 55 ? [183,121,31] : sc >= 35 ? [192,86,33] : [197,48,48];
            doc.setDrawColor(sRgb[0], sRgb[1], sRgb[2]);
            doc.setLineWidth(0.8);
            doc.circle(margin + 8, y + 5, 7, 'S');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(sRgb[0], sRgb[1], sRgb[2]);
            doc.text(String(sc), margin + 8, y + 4.5, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text((r.score_label || '').toUpperCase(), margin + 8, y + 8.5, { align: 'center' });
            var sumLines = doc.splitTextToSize(r.summary || '', cW - 20);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(45, 55, 72);
            doc.text(sumLines, margin + 19, y + 2);
            y += Math.max(17, sumLines.length * 3.8 + 3) + 6;

            // Sections
            var secDefs = [
                { key: 'critical', label: 'Critical',       rgb: [197,48,48]  },
                { key: 'high',     label: 'High',           rgb: [192,86,33]  },
                { key: 'medium',   label: 'Medium',         rgb: [183,121,31] },
                { key: 'low',      label: 'Low',            rgb: [43,108,176] },
                { key: 'good',     label: 'Good Practices', rgb: [39,103,73]  },
            ];

            secDefs.forEach(function (sec) {
                var items = r[sec.key];
                if (!items || !items.length) return;

                checkPage(14);
                doc.setFillColor(sec.rgb[0], sec.rgb[1], sec.rgb[2]);
                doc.rect(margin, y - 4, cW, 7, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(255, 255, 255);
                doc.text(sec.label.toUpperCase() + ' (' + items.length + ')', margin + 3, y + 0.5);
                y += 9;

                items.forEach(function (item) {
                    checkPage(16);
                    if (sec.key === 'good') {
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(9);
                        doc.setTextColor(39, 103, 73);
                        doc.text('[OK]', margin, y);
                        var tl = doc.splitTextToSize(item.title, cW - 12);
                        doc.setTextColor(30, 41, 59);
                        doc.text(tl, margin + 10, y);
                        y += tl.length * 3.5 + 1;
                        if (item.detail) {
                            doc.setFont('helvetica', 'normal');
                            doc.setFontSize(8);
                            doc.setTextColor(100, 116, 139);
                            var dl = doc.splitTextToSize(item.detail, cW - 12);
                            doc.text(dl, margin + 10, y);
                            y += dl.length * 3 + 1;
                        }
                    } else {
                        var tl2 = doc.splitTextToSize(item.title, cW);
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(10);
                        doc.setTextColor(30, 41, 59);
                        doc.text(tl2, margin, y);
                        y += tl2.length * 3.8 + 1;
                        if (item.detail) {
                            var dl2 = doc.splitTextToSize(item.detail, cW);
                            doc.setFont('helvetica', 'normal');
                            doc.setFontSize(9);
                            doc.setTextColor(71, 85, 105);
                            doc.text(dl2, margin, y);
                            y += dl2.length * 3.5 + 1;
                        }
                        if (item.fix) {
                            var fl = doc.splitTextToSize('Fix: ' + item.fix, cW - 4);
                            doc.setFont('helvetica', 'italic');
                            doc.setFontSize(8.5);
                            doc.setTextColor(100, 116, 139);
                            doc.text(fl, margin + 4, y);
                            y += fl.length * 3.2 + 2;
                        }
                    }
                    y += 3;
                });
                y += 4;
            });

            var fname = (scanType === 'deep' ? 'cyber-deep-dive' : 'security-audit') + '-' + site + '.pdf';
            doc.save(fname);
        }

        if (window.jspdf) {
            build();
        } else {
            var s = document.createElement('script');
            s.src = JSPDF_CDN;
            s.onload = build;
            document.head.appendChild(s);
        }
    }

    // ── Render audit report ───────────────────────────────────────────

    function renderReport(data, container, scanType) {
        if (!container) return;
        var r   = data.report;
        var cls = scoreClass(r.score);
        var age = data.from_cache ? ' · cached ' + timeSince(data.scanned_at) + ' ago' : '';
        var html = '';

        html += '<div style="margin:0 0 14px"><button class="cs-audit-pdf-btn button button-secondary" data-scan-type="' + escHtml(scanType || 'standard') + '">&#8595; Download PDF Report</button></div>';
        html += '<div class="cs-audit-header">';
        html += '<div class="cs-audit-score-circle ' + cls + '">';
        html += '<span class="cs-audit-score-num">' + escHtml(r.score) + '</span>';
        html += '<span class="cs-audit-score-lbl">' + escHtml(r.score_label || '') + '</span>';
        html += '</div>';
        html += '<div class="cs-audit-meta">';
        html += '<p class="cs-audit-summary-text">' + escHtml(r.summary || '') + '</p>';
        html += '<span class="cs-audit-meta-line">Model: ' + escHtml(data.model_used || '') + age + '</span>';
        html += '</div>';
        html += '</div>';

        var secs = [
            { key: 'critical', label: 'Critical',       cls: 'cs-audit-sec-critical' },
            { key: 'high',     label: 'High',           cls: 'cs-audit-sec-high'     },
            { key: 'medium',   label: 'Medium',         cls: 'cs-audit-sec-medium'   },
            { key: 'low',      label: 'Low',            cls: 'cs-audit-sec-low'      },
            { key: 'good',     label: 'Good Practices', cls: 'cs-audit-sec-good'     },
        ];

        secs.forEach(function (sec) {
            var items = r[sec.key];
            if (!items || !items.length) return;
            html += '<div class="cs-audit-section ' + sec.cls + '">';
            html += '<h4 class="cs-audit-section-title">' + escHtml(sec.label) + ' (' + items.length + ')</h4>';
            if (sec.key === 'good') {
                items.forEach(function (g) {
                    html += '<div class="cs-audit-good-item">';
                    html += '<span class="cs-audit-good-check">✓</span>';
                    html += '<div><strong>' + escHtml(g.title) + '</strong>';
                    if (g.detail) html += ' — ' + escHtml(g.detail);
                    html += '</div></div>';
                });
            } else {
                items.forEach(function (issue) {
                    html += '<div class="cs-audit-issue">';
                    html += '<div class="cs-audit-issue-title">' + escHtml(issue.title) + '</div>';
                    if (issue.detail) html += '<div class="cs-audit-issue-detail">' + escHtml(issue.detail) + '</div>';
                    if (issue.fix)    html += '<div class="cs-audit-issue-fix">' + escHtml(issue.fix) + '</div>';
                    html += '</div>';
                });
            }
            html += '</div>';
        });

        // Code triage section (deep scan only)
        if (scanType === 'deep' && data.code_triage && !data.code_triage.skipped && data.code_triage.results && data.code_triage.results.length) {
            var triage = data.code_triage;
            var confirmed  = triage.results.filter(function (x) { return x.verdict === 'confirmed'; });
            var needsCtx   = triage.results.filter(function (x) { return x.verdict === 'needs_context'; });
            var falsePos   = triage.results.filter(function (x) { return x.verdict === 'false_positive'; });
            html += '<div class="cs-audit-section cs-audit-sec-code-triage">';
            html += '<h4 class="cs-audit-section-title">Code Triage — ' + triage.snippets_triaged + ' snippet' + (triage.snippets_triaged !== 1 ? 's' : '') + ' analysed';
            if (confirmed.length)  html += ' &nbsp;·&nbsp; <span style="color:#dc2626">' + confirmed.length + ' confirmed</span>';
            if (needsCtx.length)   html += ' &nbsp;·&nbsp; <span style="color:#d97706">' + needsCtx.length + ' inconclusive</span>';
            if (falsePos.length)   html += ' &nbsp;·&nbsp; <span style="color:#22c55e">' + falsePos.length + ' false positive' + (falsePos.length !== 1 ? 's' : '') + '</span>';
            html += '</h4>';

            triage.results.forEach(function (item) {
                var isFp = item.verdict === 'false_positive';
                var isConfirmed = item.verdict === 'confirmed';
                var severityColour = { critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#ca8a04', none: '#888' };
                var badgeColor = isConfirmed ? (severityColour[item.severity] || '#888') : (isFp ? '#22c55e' : '#d97706');
                var badgeText  = isConfirmed ? (item.severity || 'confirmed') : (isFp ? 'false positive' : 'needs context');
                html += '<div class="cs-triage-item" style="margin:8px 0;padding:10px 12px;border-radius:6px;background:' + (isFp ? '#f0fdf4' : isConfirmed ? '#fff5f5' : '#fffbeb') + ';border-left:3px solid ' + badgeColor + '">';
                html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">';
                html += '<span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#fff;background:' + badgeColor + ';padding:2px 7px;border-radius:3px">' + escHtml(badgeText) + '</span>';
                if (item.type && isConfirmed) html += '<span style="font-size:12px;font-weight:600;color:#111">' + escHtml(item.type) + '</span>';
                html += '<span style="font-size:11px;color:#666;font-family:monospace">' + escHtml(item.plugin) + ' / ' + escHtml(item.file) + ':' + escHtml(String(item.line)) + '</span>';
                html += '</div>';
                if (item.explanation) html += '<div style="font-size:13px;color:#333;margin:3px 0">' + escHtml(item.explanation) + '</div>';
                if (isConfirmed && item.fix) html += '<div class="cs-audit-issue-fix" style="margin-top:4px">' + escHtml(item.fix) + '</div>';
                html += '</div>';
            });
            html += '</div>';
        } else if (scanType === 'deep' && data.code_triage && data.code_triage.skipped && data.code_triage.reason === 'no_findings') {
            html += '<div class="cs-audit-section cs-audit-sec-good"><h4 class="cs-audit-section-title">Code Triage</h4>';
            html += '<div class="cs-audit-good-item"><span class="cs-audit-good-check">✓</span><div>No suspicious patterns found in active plugin code — triage not required.</div></div></div>';
        }

        container.innerHTML = html;

        var pdfBtn = container.querySelector('.cs-audit-pdf-btn');
        if (pdfBtn) {
            pdfBtn.addEventListener('click', function () { exportSecurityPDF(data, scanType); });
        }
    }

    // ── Progress bar ──────────────────────────────────────────────────

    // Eased fake-progress: advances quickly to ~80% then slows sharply.
    // Each call bumps by a decreasing step so it never reaches 100% on its own.
    function ProgressBar(progressEl) {
        var fill = progressEl ? progressEl.querySelector('.cs-scan-progress-fill') : null;
        var pct  = 0;
        if (progressEl) progressEl.classList.add('is-active');
        if (fill) { fill.style.transition = 'none'; fill.style.width = '0%'; }

        this.tick = function () {
            var step = pct < 40 ? 12 : pct < 65 ? 7 : pct < 80 ? 3 : 0.8;
            pct = Math.min(pct + step, 92);
            if (fill) { fill.style.transition = 'width 2.8s ease'; fill.style.width = pct + '%'; }
        };

        this.complete = function () {
            if (fill) { fill.style.transition = 'width 0.4s ease'; fill.style.width = '100%'; }
            setTimeout(function () {
                if (progressEl) progressEl.classList.remove('is-active');
                if (fill) { fill.style.transition = 'none'; fill.style.width = '0%'; }
            }, 500);
        };

        this.reset = function () {
            if (progressEl) progressEl.classList.remove('is-active');
            if (fill) { fill.style.transition = 'none'; fill.style.width = '0%'; }
        };
    }

    // ── Polling ───────────────────────────────────────────────────────

    function startPolling(type, scanBtn, cancelBtn, statusEl, resultsEl, progressEl) {
        var bar = new ProgressBar(progressEl);
        bar.tick();
        if (cancelBtn) cancelBtn.style.display = '';

        function finish() {
            if (cancelBtn) cancelBtn.style.display = 'none';
            if (scanBtn)   scanBtn.disabled = false;
        }

        var timer = setInterval(function () {
            bar.tick();
            post('csdt_devtools_scan_status', { type: type })
                .then(function (res) {
                    if (!res.success) return;
                    var d = res.data;
                    if (d.status === 'running') return;

                    clearInterval(timer);
                    finish();

                    if (d.status === 'complete') {
                        bar.complete();
                        if (statusEl) { statusEl.textContent = ''; statusEl.className = 'cs-vuln-inline-msg'; }
                        if (resultsEl && d.data) {
                            renderReport(d.data, resultsEl, type);
                            resultsEl.style.display = 'block';
                        }
                    } else if (d.status === 'error') {
                        bar.reset();
                        if (statusEl) { statusEl.textContent = '❌ ' + (d.message || 'Scan failed.'); statusEl.className = 'cs-vuln-inline-msg cs-vuln-msg-err'; }
                    } else {
                        bar.reset();
                        if (statusEl) { statusEl.textContent = ''; statusEl.className = 'cs-vuln-inline-msg'; }
                    }
                })
                .catch(function () {});
        }, POLL_INTERVAL);

        if (cancelBtn) {
            cancelBtn.onclick = function () {
                clearInterval(timer);
                finish();
                bar.reset();
                if (statusEl) { statusEl.textContent = ''; statusEl.className = 'cs-vuln-inline-msg'; }
                post('csdt_devtools_cancel_scan', { type: type }).catch(function () {});
            };
        }
    }

    // ── Standard scan ────────────────────────────────────────────────

    function runScan(cacheOnly) {
        var scanBtn    = document.getElementById('cs-vuln-scan-btn');
        var statusEl   = document.getElementById('cs-vuln-scan-status');
        var resultsEl  = document.getElementById('cs-vuln-results');
        var progressEl = document.getElementById('cs-vuln-progress');

        if (cacheOnly) {
            post('csdt_devtools_vuln_scan', { cache_only: '1' })
                .then(function (res) {
                    if (!res.success || res.data.no_cache) return;
                    if (resultsEl) { renderReport(res.data, resultsEl, 'standard'); resultsEl.style.display = 'block'; }
                    if (statusEl) { statusEl.textContent = ''; statusEl.className = 'cs-vuln-inline-msg'; }
                })
                .catch(function () {});
            return;
        }

        if (scanBtn)   scanBtn.disabled = true;
        if (statusEl)  { statusEl.textContent = '⏳ Running AI cyber audit…'; statusEl.className = 'cs-vuln-inline-msg'; }
        if (resultsEl) resultsEl.style.display = 'none';

        post('csdt_devtools_vuln_scan', {})
            .then(function (res) {
                if (!res.success) {
                    if (scanBtn) scanBtn.disabled = false;
                    var err = res.data && res.data.message ? res.data.message : 'Failed to start scan.';
                    if (statusEl) { statusEl.textContent = '❌ ' + err; statusEl.className = 'cs-vuln-inline-msg cs-vuln-msg-err'; }
                    return;
                }
                startPolling('standard', scanBtn, document.getElementById('cs-vuln-cancel-btn'), statusEl, resultsEl, progressEl);
            })
            .catch(function (e) {
                if (scanBtn) scanBtn.disabled = false;
                if (statusEl) { statusEl.textContent = '❌ ' + e.message; statusEl.className = 'cs-vuln-inline-msg cs-vuln-msg-err'; }
            });
    }

    // ── Deep dive scan ───────────────────────────────────────────────

    function runDeepScan(cacheOnly) {
        var scanBtn    = document.getElementById('cs-deep-scan-btn');
        var statusEl   = document.getElementById('cs-deep-scan-status');
        var resultsEl  = document.getElementById('cs-deep-results');
        var progressEl = document.getElementById('cs-deep-progress');

        if (cacheOnly) {
            post('csdt_devtools_deep_scan', { cache_only: '1' })
                .then(function (res) {
                    if (!res.success || res.data.no_cache) return;
                    if (resultsEl) { renderReport(res.data, resultsEl, 'deep'); resultsEl.style.display = 'block'; }
                    if (statusEl) { statusEl.textContent = ''; statusEl.className = 'cs-vuln-inline-msg'; }
                })
                .catch(function () {});
            return;
        }

        if (scanBtn)   scanBtn.disabled = true;
        if (statusEl)  { statusEl.textContent = '⏳ Running AI Deep Dive Cyber Audit… this may take 60–90s.'; statusEl.className = 'cs-vuln-inline-msg'; }
        if (resultsEl) resultsEl.style.display = 'none';

        post('csdt_devtools_deep_scan', {})
            .then(function (res) {
                if (!res.success) {
                    if (scanBtn) scanBtn.disabled = false;
                    var err = res.data && res.data.message ? res.data.message : 'Failed to start deep scan.';
                    if (statusEl) { statusEl.textContent = '❌ ' + err; statusEl.className = 'cs-vuln-inline-msg cs-vuln-msg-err'; }
                    return;
                }
                startPolling('deep', scanBtn, document.getElementById('cs-deep-cancel-btn'), statusEl, resultsEl, progressEl);
            })
            .catch(function (e) {
                if (scanBtn) scanBtn.disabled = false;
                if (statusEl) { statusEl.textContent = '❌ ' + e.message; statusEl.className = 'cs-vuln-inline-msg cs-vuln-msg-err'; }
            });
    }

    // ── Init ──────────────────────────────────────────────────────────

    var MODEL_OPTS = {
        anthropic: {
            standard: [
                { v: '_auto',                    l: '✨ Auto — Sonnet 4.6 (quality + speed)' },
                { v: 'claude-opus-4-7',          l: 'Claude Opus 4.7 (best quality)' },
                { v: 'claude-sonnet-4-6',        l: 'Claude Sonnet 4.6' },
                { v: 'claude-haiku-4-5-20251001', l: 'Claude Haiku 4.5 (fastest)' },
            ],
            deep: [
                { v: '_auto_deep',               l: '✨ Auto — Opus 4.7 (best quality)' },
                { v: 'claude-opus-4-7',          l: 'Claude Opus 4.7' },
                { v: 'claude-sonnet-4-6',        l: 'Claude Sonnet 4.6 (faster)' },
                { v: 'claude-haiku-4-5-20251001', l: 'Claude Haiku 4.5 (fastest)' },
            ],
        },
        gemini: {
            standard: [
                { v: '_auto',              l: '✨ Auto — Gemini 2.0 Flash' },
                { v: 'gemini-2.0-flash',   l: 'Gemini 2.0 Flash' },
                { v: 'gemini-2.0-flash-lite', l: 'Gemini 2.0 Flash Lite (cheapest)' },
                { v: 'gemini-1.5-pro',     l: 'Gemini 1.5 Pro' },
            ],
            deep: [
                { v: '_auto_deep',         l: '✨ Auto — Gemini 2.0 Flash' },
                { v: 'gemini-2.0-flash',   l: 'Gemini 2.0 Flash' },
                { v: 'gemini-1.5-pro',     l: 'Gemini 1.5 Pro (highest capability)' },
                { v: 'gemini-2.0-flash-lite', l: 'Gemini 2.0 Flash Lite (cheapest)' },
            ],
        },
    };

    document.addEventListener('DOMContentLoaded', function () {
        var providerSel       = document.getElementById('cs-sec-provider');
        var rowAnthropicKey   = document.getElementById('cs-row-anthropic-key');
        var rowGeminiKey      = document.getElementById('cs-row-gemini-key');
        var keyInput          = document.getElementById('cs-sec-api-key');
        var keyStatus         = document.getElementById('cs-sec-key-status');
        var testKeyBtn        = document.getElementById('cs-sec-test-key');
        var geminiKeyInput    = document.getElementById('cs-sec-gemini-key');
        var geminiKeyStatus   = document.getElementById('cs-sec-gemini-key-status');
        var testGeminiKeyBtn  = document.getElementById('cs-sec-test-gemini-key');
        var modelSel          = document.getElementById('cs-sec-model');
        var deepModelSel      = document.getElementById('cs-sec-deep-model');
        var deepModelBadge    = document.getElementById('cs-deep-model-badge');
        var vulnModelBadge    = document.getElementById('cs-vuln-model-badge');
        var promptArea        = document.getElementById('cs-sec-prompt');
        var copyBtn           = document.getElementById('cs-sec-copy-prompt');
        var resetBtn          = document.getElementById('cs-sec-reset-prompt');
        var saveBtn           = document.getElementById('cs-sec-save');
        var savedMsg          = document.getElementById('cs-sec-saved');
        var scanBtn           = document.getElementById('cs-vuln-scan-btn');
        var deepBtn           = document.getElementById('cs-deep-scan-btn');

        if (promptArea) promptArea.value = cfg.savedPrompt || cfg.defaultPrompt || '';
        if (scanBtn)  scanBtn.disabled  = !cfg.hasKey;
        if (deepBtn)  deepBtn.disabled  = !cfg.hasKey;

        // ── Provider / model helpers ──────────────────────────────────

        function populateSelect(sel, opts, savedVal) {
            if (!sel) return;
            sel.innerHTML = '';
            opts.forEach(function (o) {
                var opt = document.createElement('option');
                opt.value = o.v;
                opt.textContent = o.l;
                sel.appendChild(opt);
            });
            if (savedVal) sel.value = savedVal;
        }

        function applyProvider(provider) {
            var isGemini = provider === 'gemini';
            if (rowAnthropicKey) rowAnthropicKey.style.display = isGemini ? 'none' : '';
            if (rowGeminiKey)    rowGeminiKey.style.display    = isGemini ? ''     : 'none';
            var opts = MODEL_OPTS[provider] || MODEL_OPTS.anthropic;
            populateSelect(modelSel,     opts.standard, isGemini ? '_auto'      : cfg.savedModel);
            populateSelect(deepModelSel, opts.deep,     isGemini ? '_auto_deep' : cfg.savedDeepModel);
            updateModelBadges();
        }

        var MODEL_NAMES = {
            '_auto': 'Auto', '_auto_deep': 'Auto',
            'claude-opus-4-7': 'Opus 4.7', 'claude-sonnet-4-6': 'Sonnet 4.6',
            'claude-haiku-4-5-20251001': 'Haiku 4.5',
            'gemini-2.0-flash': 'Gemini Flash', 'gemini-2.0-flash-lite': 'Flash Lite',
            'gemini-1.5-pro': 'Gemini 1.5 Pro',
        };

        function updateModelBadges() {
            if (vulnModelBadge && modelSel)     vulnModelBadge.textContent = 'Using ' + (MODEL_NAMES[modelSel.value]     || modelSel.value);
            if (deepModelBadge && deepModelSel) deepModelBadge.textContent = 'Using ' + (MODEL_NAMES[deepModelSel.value] || deepModelSel.value);
        }

        // Init provider
        if (providerSel && cfg.savedProvider) providerSel.value = cfg.savedProvider;
        if (keyInput    && cfg.maskedKey)     keyInput.placeholder    = cfg.maskedKey;
        if (geminiKeyInput && cfg.maskedGemini) geminiKeyInput.placeholder = cfg.maskedGemini;
        applyProvider(providerSel ? providerSel.value : 'anthropic');

        if (providerSel) {
            providerSel.addEventListener('change', function () { applyProvider(this.value); });
        }
        if (modelSel)     modelSel.addEventListener('change',     updateModelBadges);
        if (deepModelSel) deepModelSel.addEventListener('change', updateModelBadges);

        // ── Test key buttons ──────────────────────────────────────────

        function testKey(btn, inputEl, statusEl, provider) {
            if (!btn) return;
            btn.addEventListener('click', function () {
                var key = inputEl ? inputEl.value.trim() : '';
                btn.disabled = true;
                if (statusEl) { statusEl.textContent = 'Testing…'; statusEl.className = 'cs-sec-key-status'; }
                post('csdt_devtools_security_test_key', Object.assign({ provider: provider }, key ? { api_key: key } : {}))
                    .then(function (res) {
                        btn.disabled = false;
                        if (statusEl) {
                            statusEl.textContent = res.success ? (res.data.message || '✓ Valid') : ('✗ ' + (res.data && res.data.message ? res.data.message : 'Invalid'));
                            statusEl.className   = 'cs-sec-key-status ' + (res.success ? 'ok' : 'err');
                        }
                    })
                    .catch(function () {
                        btn.disabled = false;
                        if (statusEl) { statusEl.textContent = '✗ Connection error'; statusEl.className = 'cs-sec-key-status err'; }
                    });
            });
        }

        testKey(testKeyBtn,       keyInput,       keyStatus,       'anthropic');
        testKey(testGeminiKeyBtn, geminiKeyInput, geminiKeyStatus, 'gemini');

        // ── Prompt ────────────────────────────────────────────────────

        if (copyBtn && promptArea) {
            copyBtn.addEventListener('click', function () {
                navigator.clipboard.writeText(promptArea.value).then(function () {
                    var orig = copyBtn.textContent;
                    copyBtn.textContent = '✓ Copied';
                    setTimeout(function () { copyBtn.textContent = orig; }, 1500);
                });
            });
        }

        if (resetBtn && promptArea) {
            resetBtn.addEventListener('click', function () { promptArea.value = cfg.defaultPrompt || ''; });
        }

        // ── Save ──────────────────────────────────────────────────────

        if (saveBtn) {
            saveBtn.addEventListener('click', function () {
                saveBtn.disabled = true;
                if (savedMsg) savedMsg.style.opacity = '0';

                var provider = providerSel ? providerSel.value : 'anthropic';
                var params = {
                    provider:   provider,
                    model:      modelSel     ? modelSel.value     : '_auto',
                    deep_model: deepModelSel ? deepModelSel.value : '_auto_deep',
                    prompt:     promptArea   ? promptArea.value   : '',
                };
                var rawAnt = keyInput       ? keyInput.value.trim()       : '';
                var rawGem = geminiKeyInput ? geminiKeyInput.value.trim() : '';
                if (rawAnt) params.api_key    = rawAnt;
                if (rawGem) params.gemini_key = rawGem;

                post('csdt_devtools_vuln_save_key', params)
                    .then(function (res) {
                        saveBtn.disabled = false;
                        if (res.success) {
                            if (savedMsg) { savedMsg.style.opacity = '1'; setTimeout(function () { savedMsg.style.opacity = '0'; }, 2500); }
                            if (scanBtn) scanBtn.disabled = !res.data.has_key;
                            if (deepBtn) deepBtn.disabled = !res.data.has_key;
                            if (keyInput       && res.data.masked)       { keyInput.value = '';       keyInput.placeholder       = res.data.masked; }
                            if (geminiKeyInput && res.data.maskedGemini) { geminiKeyInput.value = ''; geminiKeyInput.placeholder = res.data.maskedGemini; }
                            if (keyStatus)      { keyStatus.textContent      = ''; keyStatus.className      = 'cs-sec-key-status'; }
                            if (geminiKeyStatus){ geminiKeyStatus.textContent = ''; geminiKeyStatus.className = 'cs-sec-key-status'; }
                        }
                    })
                    .catch(function () { saveBtn.disabled = false; });
            });
        }

        // ── Scheduled scan UI ────────────────────────────────────────

        var schedEnabled  = document.getElementById('cs-sched-enabled');
        var schedOptions  = document.getElementById('cs-sched-options');
        var schedFreq     = document.getElementById('cs-sched-freq');
        var schedType     = document.getElementById('cs-sched-type');
        var schedEmail    = document.getElementById('cs-sched-email');
        var schedNtfyUrl  = document.getElementById('cs-sched-ntfy-url');
        var schedNtfyTok  = document.getElementById('cs-sched-ntfy-token');
        var schedSaveBtn  = document.getElementById('cs-sched-save');
        var schedSavedMsg = document.getElementById('cs-sched-saved');

        if (schedEnabled && schedOptions) {
            schedEnabled.addEventListener('change', function () {
                schedOptions.style.display = schedEnabled.checked ? '' : 'none';
            });
        }

        if (schedSaveBtn) {
            schedSaveBtn.addEventListener('click', function () {
                schedSaveBtn.disabled = true;
                var params = {
                    enabled:      schedEnabled && schedEnabled.checked ? '1' : '0',
                    freq:         schedFreq    ? schedFreq.value    : 'weekly',
                    type:         schedType    ? schedType.value    : 'deep',
                    email_notify: schedEmail   && schedEmail.checked ? '1' : '0',
                    ntfy_url:     schedNtfyUrl ? schedNtfyUrl.value.trim() : '',
                    ntfy_token:   schedNtfyTok ? schedNtfyTok.value.trim() : '',
                };
                post('csdt_devtools_save_schedule', params)
                    .then(function (res) {
                        schedSaveBtn.disabled = false;
                        if (res.success && schedSavedMsg) {
                            schedSavedMsg.style.opacity = '1';
                            setTimeout(function () { schedSavedMsg.style.opacity = '0'; }, 2500);
                            if (schedNtfyTok) { schedNtfyTok.value = ''; schedNtfyTok.placeholder = '••••••••'; }
                        }
                    })
                    .catch(function () { schedSaveBtn.disabled = false; });
            });
        }

        // ── Scan buttons ──────────────────────────────────────────────

        if (scanBtn) scanBtn.addEventListener('click', function () { runScan(false); });
        if (deepBtn) deepBtn.addEventListener('click', function () { runDeepScan(false); });

        // Silently pre-fill cached results on page load
        if (cfg.hasKey) {
            runScan(true);
            runDeepScan(true);
        }

        // ── Quick fix buttons (PHP-rendered initial state) ────────────
        wireQuickFixButtons();

        // ── Scan history chart ────────────────────────────────────────
        renderScanHistoryChart(cfg.scanHistory || []);
    });

    // ── Quick Fixes ──────────────────────────────────────────────────────

    function renderQuickFixes(fixes) {
        var panel = document.getElementById('cs-quick-fixes-panel');
        if (!panel) return;
        var html = '';
        fixes.forEach(function (fix) {
            var isFixed = !!fix.fixed;
            var bg     = isFixed ? 'rgba(0,0,0,0.02)' : '#fff';
            var border = isFixed ? 'rgba(0,0,0,0.07)'  : 'rgba(0,0,0,0.12)';
            html += '<div class="cs-quick-fix-row" data-fix-id="' + escHtml(fix.id) + '" style="display:flex;align-items:center;gap:12px;padding:10px 14px;margin-bottom:6px;background:' + bg + ';border-radius:6px;border:1px solid ' + border + ';">';
            html += '<div style="flex-shrink:0;font-size:16px;line-height:1;">' + (isFixed ? '<span style="color:#16a34a;">✓</span>' : '<span style="color:#d97706;">⚠</span>') + '</div>';
            html += '<div style="flex:1;min-width:0;">';
            html += '<div style="font-size:13px;font-weight:600;color:' + (isFixed ? '#6b7280' : '#1d2327') + ';">' + escHtml(fix.title) + '</div>';
            html += '<div style="font-size:12px;color:#50575e;margin-top:2px;">' + escHtml(fix.detail) + '</div>';
            html += '</div>';
            if (isFixed) {
                html += '<div style="flex-shrink:0;"><span style="font-size:12px;color:#16a34a;font-weight:600;">Fixed ✓</span></div>';
            } else {
                html += '<div style="flex-shrink:0;"><button type="button" class="cs-btn-primary cs-btn-sm cs-quick-fix-btn" data-fix-id="' + escHtml(fix.id) + '" style="white-space:nowrap;">' + escHtml(fix.fix_label) + '</button></div>';
            }
            html += '</div>';
        });
        panel.innerHTML = html;
        wireQuickFixButtons();
    }

    function wireQuickFixButtons() {
        var btns = document.querySelectorAll('.cs-quick-fix-btn');
        btns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var fixId = btn.getAttribute('data-fix-id');
                btn.disabled = true;
                var orig = btn.textContent;
                btn.textContent = 'Applying…';
                post('csdt_devtools_quick_fix', { fix_action: 'apply', fix_id: fixId })
                    .then(function (res) {
                        if (res.success && res.data && res.data.fixes) {
                            renderQuickFixes(res.data.fixes);
                            if (res.data.warning) {
                                var warn = document.createElement('div');
                                warn.style.cssText = 'margin:8px 0;padding:10px 12px;background:#fffbeb;border-left:3px solid #d97706;border-radius:4px;font-size:13px;color:#92400e';
                                warn.textContent = '⚠ ' + res.data.warning;
                                var qfWrap = document.getElementById('cs-quick-fixes-list');
                                if (qfWrap) qfWrap.insertAdjacentElement('afterend', warn);
                            }
                        } else {
                            btn.disabled = false;
                            btn.textContent = orig;
                            if (res.data && typeof res.data === 'string') {
                                alert('Fix failed: ' + res.data);
                            }
                        }
                    })
                    .catch(function () {
                        btn.disabled = false;
                        btn.textContent = orig;
                    });
            });
        });
    }

    function renderScanHistoryChart(history) {
        var canvas = document.getElementById('cs-scan-history-chart');
        if (!canvas || !history.length) { return; }

        // Reverse so oldest → newest left → right
        var data = history.slice().reverse();

        var dpr    = window.devicePixelRatio || 1;
        var W      = canvas.offsetWidth  || canvas.parentElement.offsetWidth || 600;
        var H      = 140;
        canvas.width  = W * dpr;
        canvas.height = H * dpr;
        canvas.style.height = H + 'px';

        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        var PAD_L = 40, PAD_R = 44, PAD_T = 16, PAD_B = 28;
        var cW = W - PAD_L - PAD_R;
        var cH = H - PAD_T - PAD_B;

        // ── Background ────────────────────────────────────────────────
        ctx.clearRect(0, 0, W, H);

        // ── Grid lines ────────────────────────────────────────────────
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth   = 1;
        var scoreGridLines = [0, 25, 50, 75, 100];
        scoreGridLines.forEach(function (v) {
            var y = PAD_T + cH - (v / 100) * cH;
            ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(PAD_L + cW, y); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(v, PAD_L - 5, y + 3.5);
        });

        // ── X-axis labels ─────────────────────────────────────────────
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        var step = cW / Math.max(data.length - 1, 1);
        data.forEach(function (entry, i) {
            var x   = PAD_L + i * step;
            var d   = new Date((entry.scanned_at || 0) * 1000);
            var lbl = (d.getMonth() + 1) + '/' + d.getDate();
            ctx.fillText(lbl, x, H - 6);
            // Vertical tick
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, PAD_T + cH); ctx.stroke();
        });

        // ── Max critical+high for right-axis scale ────────────────────
        var maxIssues = 1;
        data.forEach(function (e) {
            var tot = (e.critical_count || 0) + (e.high_count || 0);
            if (tot > maxIssues) { maxIssues = tot; }
        });
        maxIssues = Math.ceil(maxIssues / 2) * 2 || 2; // round up to even

        // Right-axis labels (critical+high scale)
        ctx.fillStyle = 'rgba(255,100,100,0.5)';
        ctx.textAlign = 'left';
        [0, Math.round(maxIssues / 2), maxIssues].forEach(function (v) {
            var y = PAD_T + cH - (v / maxIssues) * cH;
            ctx.fillText(v, PAD_L + cW + 5, y + 3.5);
        });

        // ── Helper: point coords ──────────────────────────────────────
        function scoreX(i) { return PAD_L + i * step; }
        function scoreY(v) { return PAD_T + cH - ((v || 0) / 100) * cH; }
        function issueY(v) { return PAD_T + cH - ((v || 0) / maxIssues) * cH; }

        // ── Score area fill ───────────────────────────────────────────
        var grad = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + cH);
        grad.addColorStop(0,   'rgba(56,189,248,0.25)');
        grad.addColorStop(1,   'rgba(56,189,248,0.02)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(scoreX(0), PAD_T + cH);
        data.forEach(function (e, i) { ctx.lineTo(scoreX(i), scoreY(e.score)); });
        ctx.lineTo(scoreX(data.length - 1), PAD_T + cH);
        ctx.closePath();
        ctx.fill();

        // ── Score line ────────────────────────────────────────────────
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth   = 2;
        ctx.lineJoin    = 'round';
        ctx.beginPath();
        data.forEach(function (e, i) {
            if (i === 0) { ctx.moveTo(scoreX(i), scoreY(e.score)); }
            else         { ctx.lineTo(scoreX(i), scoreY(e.score)); }
        });
        ctx.stroke();

        // ── High count bars (stacked base) ───────────────────────────
        var barW = Math.max(4, Math.min(16, step * 0.35));
        data.forEach(function (e, i) {
            var x  = scoreX(i) - barW / 2;
            var hc = e.high_count || 0;
            var cc = e.critical_count || 0;
            var yBase = PAD_T + cH;
            // High — orange
            if (hc > 0) {
                var hH = (hc / maxIssues) * cH;
                ctx.fillStyle = 'rgba(251,146,60,0.7)';
                ctx.fillRect(x, yBase - hH, barW, hH);
            }
            // Critical — red (stacked on top of high)
            if (cc > 0) {
                var cHt  = (cc / maxIssues) * cH;
                var hHt  = (hc / maxIssues) * cH;
                ctx.fillStyle = 'rgba(239,68,68,0.85)';
                ctx.fillRect(x, yBase - hHt - cHt, barW, cHt);
            }
        });

        // ── Score dots ────────────────────────────────────────────────
        data.forEach(function (e, i) {
            var x = scoreX(i), y = scoreY(e.score);
            ctx.beginPath();
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle   = '#38bdf8';
            ctx.strokeStyle = '#0d1117';
            ctx.lineWidth   = 1.5;
            ctx.fill();
            ctx.stroke();
        });

        // ── Legend ────────────────────────────────────────────────────
        var legX = PAD_L, legY = PAD_T - 4;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';

        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(legX, legY - 7, 12, 3);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillText('Score', legX + 16, legY);

        ctx.fillStyle = 'rgba(239,68,68,0.85)';
        ctx.fillRect(legX + 60, legY - 7, 10, 8);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillText('Critical', legX + 74, legY);

        ctx.fillStyle = 'rgba(251,146,60,0.7)';
        ctx.fillRect(legX + 128, legY - 7, 10, 8);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillText('High', legX + 142, legY);
    }
})();
