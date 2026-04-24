/* global csdtOptimizer */
'use strict';

(function(){
    var ajaxUrl = csdtOptimizer.ajaxUrl;
    var nonce   = csdtOptimizer.nonce;
    var hasAi   = csdtOptimizer.hasAi;

    function post(action, data) {
        var params = 'action=' + encodeURIComponent(action) + '&nonce=' + encodeURIComponent(nonce);
        if (data) {
            Object.keys(data).forEach(function(k) {
                params += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(
                    typeof data[k] === 'object' ? JSON.stringify(data[k]) : data[k]
                );
            });
        }
        return fetch(ajaxUrl, {
            method: 'POST', credentials: 'same-origin',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: params
        }).then(function(r){ return r.json(); });
    }

    function esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function fmtKb(kb) {
        return kb >= 1024 ? (kb/1024).toFixed(1)+' MB' : kb+' KB';
    }

    /* ── Orphan Scan ───────────────────────────── */
    function runOrphanScan() {
        var btn = document.getElementById('csdt-orphan-scan-btn');
        var res = document.getElementById('csdt-orphan-results');
        if (!btn || !res) return;
        btn.disabled = true;
        btn.textContent = '⏳ Scanning…';
        res.innerHTML = '';
        post('csdt_db_orphaned_scan').then(function(r) {
            btn.disabled = false;
            btn.textContent = '🔍 Scan for Orphaned Tables';
            if (!r.success) { res.innerHTML = '<p style="color:#ef4444;font-size:13px;">' + esc(r.data||'Scan failed.') + '</p>'; return; }
            renderOrphanResults(r.data.tables||[], res);
        }).catch(function(e){
            btn.disabled = false;
            btn.textContent = '🔍 Scan for Orphaned Tables';
            res.innerHTML = '<p style="color:#ef4444;font-size:13px;">Error: ' + esc(e.message) + '</p>';
        });
    }

    function renderOrphanResults(tables, container) {
        if (!tables.length) {
            container.innerHTML = '<p style="color:#16a34a;font-size:13px;margin:0;">✅ No orphaned tables found.</p>';
            return;
        }
        var totalKb = tables.reduce(function(s,t){ return s + (t.size_kb||0); }, 0);
        var unknownTables = tables.filter(function(t){ return t.plugin === 'Unknown plugin'; });
        var emptyCount = tables.filter(function(t){ return !t.rows; }).length;
        var html = '<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-bottom:14px;">'
            + '<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:8px 16px;text-align:center;"><div style="font-size:1.3rem;font-weight:700;color:#92400e;">' + tables.length + '</div><div style="font-size:11px;color:#78350f;">tables found</div></div>'
            + '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:8px 16px;text-align:center;"><div style="font-size:1.3rem;font-weight:700;color:#166534;">' + fmtKb(totalKb) + '</div><div style="font-size:11px;color:#14532d;">total size</div></div>'
            + (emptyCount ? '<button id="csdt-select-empty-btn" type="button" style="background:#0f172a;color:#fff;border:1px solid #0f172a;padding:8px 16px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">☑ Select ' + emptyCount + ' Empty Tables</button>' : '')
            + (hasAi && unknownTables.length ? '<button id="csdt-orphan-ai-btn" type="button" style="background:#6366f1;color:#fff;border:1px solid #4f46e5;padding:8px 16px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;margin-left:auto;">🤖 Identify ' + unknownTables.length + ' Unknown with AI</button>' : '')
            + '</div>';
        html += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px;">'
            + '<thead><tr style="background:#f1f5f9;text-align:left;">'
            + '<th style="padding:6px 8px;border:1px solid #e2e8f0;width:36px;"><input type="checkbox" id="csdt-orphan-chk-all"></th>'
            + '<th style="padding:6px 8px;border:1px solid #e2e8f0;width:50px;"></th>'
            + '<th style="padding:6px 8px;border:1px solid #e2e8f0;">Table</th>'
            + '<th style="padding:6px 8px;border:1px solid #e2e8f0;">Plugin</th>'
            + '<th style="padding:6px 8px;border:1px solid #e2e8f0;">Description</th>'
            + '<th style="padding:6px 8px;border:1px solid #e2e8f0;">URL</th>'
            + '<th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;">Confidence</th>'
            + '<th style="padding:6px 8px;border:1px solid #e2e8f0;">Created</th>'
            + '<th style="padding:6px 8px;border:1px solid #e2e8f0;">Rows</th>'
            + '<th style="padding:6px 8px;border:1px solid #e2e8f0;">Size</th>'
            + '</tr></thead><tbody>';
        tables.forEach(function(t){
            var isUnknown = t.plugin === 'Unknown plugin';
            var typeTag = (t.table_type && t.table_type !== 'BASE TABLE') ? ' <span style="background:#fde68a;color:#92400e;font-size:10px;padding:1px 4px;border-radius:3px;">' + esc(t.table_type) + '</span>' : '';
            var pluginCell = isUnknown
                ? '<span class="csdt-plugin-label" data-table="' + esc(t.table) + '" style="color:#9ca3af;font-style:italic;">Unknown</span>' + typeTag
                : esc(t.plugin) + typeTag;
            var descCell = '<span class="csdt-desc-label" data-table="' + esc(t.table) + '" style="color:#9ca3af;">—</span>';
            var urlCell  = '<span class="csdt-url-label"  data-table="' + esc(t.table) + '" style="color:#9ca3af;">—</span>';
            var confCell = '<span class="csdt-conf-label" data-table="' + esc(t.table) + '" style="color:#9ca3af;">—</span>';
            html += '<tr>'
                + '<td style="padding:5px 8px;border:1px solid #e2e8f0;"><input type="checkbox" class="csdt-orphan-cb" value="' + esc(t.table) + '" data-rows="' + (t.rows||0) + '"></td>'
                + '<td style="padding:5px 8px;border:1px solid #e2e8f0;text-align:center;"><button type="button" class="csdt-row-archive-btn" data-table="' + esc(t.table) + '" style="background:#f59e0b;color:#fff;border:none;border-radius:4px;padding:3px 8px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;" title="Move to Recycle Bin">📦 Bin</button></td>'
                + '<td style="padding:5px 8px;border:1px solid #e2e8f0;font-family:monospace;font-size:11px;">' + esc(t.table) + '</td>'
                + '<td style="padding:5px 8px;border:1px solid #e2e8f0;">' + pluginCell + '</td>'
                + '<td style="padding:5px 8px;border:1px solid #e2e8f0;max-width:240px;font-size:11px;">' + descCell + '</td>'
                + '<td style="padding:5px 8px;border:1px solid #e2e8f0;font-size:11px;">' + urlCell + '</td>'
                + '<td style="padding:5px 8px;border:1px solid #e2e8f0;text-align:center;">' + confCell + '</td>'
                + '<td style="padding:5px 8px;border:1px solid #e2e8f0;color:#6b7280;font-size:11px;">' + esc(t.created_date||'—') + '</td>'
                + '<td style="padding:5px 8px;border:1px solid #e2e8f0;">' + Number(t.rows).toLocaleString() + '</td>'
                + '<td style="padding:5px 8px;border:1px solid #e2e8f0;">' + fmtKb(t.size_kb||0) + '</td>'
                + '</tr>';
        });
        html += '</tbody></table></div>'
            + '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">'
            + '<button id="csdt-orphan-archive-btn" type="button" class="cs-btn-primary" style="background:#f59e0b;border-color:#d97706;">📦 Move Selected to Recycle Bin</button>'
            + '</div>'
            + '<span id="csdt-orphan-archive-msg" style="display:block;margin-top:8px;font-size:12px;color:#6b7280;"></span>';
        container.innerHTML = html;

        var chkAll = container.querySelector('#csdt-orphan-chk-all');
        chkAll.addEventListener('change', function(){
            container.querySelectorAll('.csdt-orphan-cb').forEach(function(c){ c.checked = chkAll.checked; });
        });

        var selectEmptyBtn = container.querySelector('#csdt-select-empty-btn');
        if (selectEmptyBtn) {
            selectEmptyBtn.addEventListener('click', function() {
                container.querySelectorAll('.csdt-orphan-cb').forEach(function(c){
                    c.checked = c.dataset.rows === '0';
                });
            });
        }

        // Single batch AI identify
        var aiIdentifyBtn = container.querySelector('#csdt-orphan-ai-btn');
        if (aiIdentifyBtn) {
            aiIdentifyBtn.addEventListener('click', function() {
                var names = unknownTables.map(function(t){ return t.table; });
                aiIdentifyBtn.disabled = true;
                aiIdentifyBtn.textContent = '⏳ Asking AI…';
                post('csdt_db_identify_table', {table_names: names}).then(function(r){
                    aiIdentifyBtn.disabled = false;
                    aiIdentifyBtn.textContent = '🤖 Identify Unknown with AI';
                    if (!r.success || !r.data || !r.data.map) {
                        var errMsg = (r.data && r.data.message) ? r.data.message : (typeof r.data === 'string' ? r.data : 'AI identification failed — check console.');
                        aiIdentifyBtn.insertAdjacentHTML('afterend', '<span id="csdt-ai-err" style="margin-left:10px;font-size:12px;color:#ef4444;">' + esc(errMsg) + '</span>');
                        return;
                    }
                    var errEl = container.querySelector('#csdt-ai-err');
                    if (errEl) errEl.remove();
                    var map = r.data.map;
                    var confColor = {'High':'#16a34a','Medium':'#d97706','Low':'#ef4444'};
                    container.querySelectorAll('.csdt-plugin-label').forEach(function(cell){
                        var tbl = cell.dataset.table;
                        var info = map[tbl];
                        if (!info) return;
                        cell.style.cssText = 'color:#6366f1;font-weight:600;font-style:normal;';
                        cell.textContent = info.plugin || info;
                    });
                    container.querySelectorAll('.csdt-desc-label').forEach(function(cell){
                        var info = map[cell.dataset.table];
                        if (info && info.description) { cell.style.color='#374151'; cell.textContent = info.description; }
                    });
                    container.querySelectorAll('.csdt-url-label').forEach(function(cell){
                        var info = map[cell.dataset.table];
                        if (info && info.url) {
                            cell.innerHTML = '<a href="' + esc(info.url) + '" target="_blank" rel="noopener" style="color:#2563eb;font-size:11px;">' + esc(info.url.replace(/^https?:\/\//, '')) + '</a>';
                        }
                    });
                    container.querySelectorAll('.csdt-conf-label').forEach(function(cell){
                        var info = map[cell.dataset.table];
                        if (info && info.confidence) {
                            var c = info.confidence;
                            cell.style.cssText = 'font-weight:600;color:' + (confColor[c]||'#6b7280') + ';';
                            cell.textContent = c;
                        }
                    });
                }).catch(function(){
                    aiIdentifyBtn.disabled = false;
                    aiIdentifyBtn.textContent = '🤖 Identify Unknown with AI';
                });
            });
        }

        container.querySelector('#csdt-orphan-archive-btn').addEventListener('click', function(){
            var sel = Array.from(container.querySelectorAll('.csdt-orphan-cb:checked')).map(function(c){ return c.value; });
            if (!sel.length) { alert('Select at least one table.'); return; }
            var btn = this, msg = container.querySelector('#csdt-orphan-archive-msg');
            btn.disabled = true; btn.textContent = '⏳ Archiving…'; msg.textContent = '';
            post('csdt_db_archive_tables', {tables: sel}).then(function(r){
                btn.disabled = false; btn.textContent = '📦 Move Selected to Recycle Bin';
                msg.style.color = r.success ? '#16a34a' : '#ef4444';
                msg.textContent = (r.data && r.data.message) || (r.success ? 'Done.' : 'Failed.');
                runOrphanScan(); loadTrash();
            }).catch(function(e){ btn.disabled=false; btn.textContent='📦 Move Selected to Recycle Bin'; msg.style.color='#ef4444'; msg.textContent='Error: '+e.message; });
        });

        // Per-row archive buttons — direct listeners added right after innerHTML
        container.querySelectorAll('.csdt-row-archive-btn').forEach(function(rowBtn) {
            rowBtn.addEventListener('click', function() {
                var tbl = rowBtn.dataset.table;
                var msg = container.querySelector('#csdt-orphan-archive-msg');
                rowBtn.disabled = true; rowBtn.textContent = '⏳';
                if (msg) { msg.style.color='#6b7280'; msg.textContent = 'Archiving ' + tbl + '…'; }
                post('csdt_db_archive_tables', {tables: [tbl]}).then(function(r){
                    rowBtn.disabled = false; rowBtn.textContent = '📦 Bin';
                    if (r.success) {
                        if (msg) { msg.style.color='#16a34a'; msg.textContent = (r.data && r.data.message) || 'Done.'; }
                        runOrphanScan(); loadTrash();
                    } else {
                        var errText = (r.data && r.data.message) || JSON.stringify(r.data) || 'Archive failed';
                        if (msg) { msg.style.color='#ef4444'; msg.textContent = '❌ ' + errText; }
                    }
                }).catch(function(err){
                    rowBtn.disabled=false; rowBtn.textContent='📦 Bin';
                    if (msg) { msg.style.color='#ef4444'; msg.textContent = '❌ Network error: ' + err.message; }
                });
            });
        });

    }

    /* ── Recycle Bin ───────────────────────────── */
    var trashBody    = document.getElementById('csdt-trash-body');
    var trashChevron = document.getElementById('csdt-trash-chevron');
    var trashLoaded  = false;

    function loadTrash() {
        if (trashBody && trashBody.style.display === 'none') {
            trashBody.style.display = '';
            if (trashChevron) trashChevron.textContent = '▼';
        }
        trashLoaded = true;
        var res = document.getElementById('csdt-trash-results');
        if (!res) return;
        res.innerHTML = '<span style="color:#9ca3af;font-size:12px;">⏳ Loading…</span>';
        post('csdt_db_trash_scan').then(function(r){
            if (!r.success) { res.innerHTML = '<p style="color:#ef4444;font-size:13px;">' + esc(r.data||'Failed.') + '</p>'; return; }
            renderTrashResults(r.data.tables||[], res);
        }).catch(function(e){ res.innerHTML = '<p style="color:#ef4444;font-size:13px;">Error: ' + esc(e.message) + '</p>'; });
    }

    function renderTrashResults(tables, container) {
        if (!tables.length) {
            container.innerHTML = '<p style="color:#9ca3af;font-size:13px;margin:0;">Recycle bin is empty.</p>';
            return;
        }
        var html = '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">'
            + '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px;min-width:520px;">'
            + '<thead><tr style="background:#fef2f2;text-align:left;">'
            + '<th style="padding:6px 8px;border:1px solid #fecaca;width:36px;"><input type="checkbox" id="csdt-trash-chk-all"></th>'
            + '<th style="padding:6px 8px;border:1px solid #fecaca;">Original Table</th>'
            + '<th style="padding:6px 8px;border:1px solid #fecaca;">Plugin</th>'
            + '<th style="padding:6px 8px;border:1px solid #fecaca;">Created</th>'
            + '<th style="padding:6px 8px;border:1px solid #fecaca;">Archived On</th>'
            + '<th style="padding:6px 8px;border:1px solid #fecaca;">Rows</th>'
            + '<th style="padding:6px 8px;border:1px solid #fecaca;">Size</th>'
            + '</tr></thead><tbody>';
        tables.forEach(function(t){
            var m = t.trash_table.match(/_trash_(\d{4})(\d{2})(\d{2})_/);
            var dated = m ? m[1]+'-'+m[2]+'-'+m[3] : '—';
            var isUnknown = !t.plugin || t.plugin === 'Unknown plugin';
            var pluginCell = isUnknown
                ? '<span style="color:#9ca3af;font-style:italic;">Unknown</span>'
                : (t.plugin_url ? '<a href="' + esc(t.plugin_url) + '" target="_blank" rel="noopener" style="color:#3b82f6;text-decoration:none;">' + esc(t.plugin) + '</a>' : esc(t.plugin));
            html += '<tr><td style="padding:5px 8px;border:1px solid #fecaca;"><input type="checkbox" class="csdt-trash-cb" value="' + esc(t.trash_table) + '"></td>'
                + '<td style="padding:5px 8px;border:1px solid #fecaca;font-family:monospace;font-size:11px;">' + esc(t.original_table) + '</td>'
                + '<td style="padding:5px 8px;border:1px solid #fecaca;font-size:11px;">' + pluginCell + '</td>'
                + '<td style="padding:5px 8px;border:1px solid #fecaca;color:#6b7280;font-size:11px;">' + esc(t.created_date||'—') + '</td>'
                + '<td style="padding:5px 8px;border:1px solid #fecaca;">' + esc(dated) + '</td>'
                + '<td style="padding:5px 8px;border:1px solid #fecaca;">' + Number(t.rows||0).toLocaleString() + '</td>'
                + '<td style="padding:5px 8px;border:1px solid #fecaca;">' + fmtKb(t.size_kb||0) + '</td></tr>';
        });
        html += '</tbody></table></div>'
            + '<div style="display:flex;gap:10px;flex-wrap:wrap;">'
            + '<button id="csdt-trash-restore-btn" type="button" class="cs-btn-secondary">↩ Restore Selected</button>'
            + '<button id="csdt-trash-delete-btn" type="button" style="background:#ef4444;color:#fff;border:1px solid #dc2626;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">🗑 Delete Forever</button>'
            + '</div>'
            + '<span id="csdt-trash-msg" style="display:block;margin-top:8px;font-size:12px;color:#6b7280;"></span>';
        container.innerHTML = html;

        var chkAll = container.querySelector('#csdt-trash-chk-all');
        chkAll.addEventListener('change', function(){
            container.querySelectorAll('.csdt-trash-cb').forEach(function(c){ c.checked = chkAll.checked; });
        });

        container.querySelector('#csdt-trash-restore-btn').addEventListener('click', function(){
            var sel = Array.from(container.querySelectorAll('.csdt-trash-cb:checked')).map(function(c){ return c.value; });
            if (!sel.length) { alert('Select at least one table.'); return; }
            if (!confirm('Restore ' + sel.length + ' table(s) to their original names?')) return;
            var btn = this, msg = container.querySelector('#csdt-trash-msg');
            btn.disabled=true; btn.textContent='⏳ Restoring…'; msg.textContent='';
            post('csdt_db_restore_tables', {tables: sel}).then(function(r){
                btn.disabled=false; btn.textContent='↩ Restore Selected';
                msg.style.color = r.success ? '#16a34a' : '#ef4444';
                msg.textContent = (r.data && r.data.message) || (r.success ? 'Restored.' : 'Failed.');
                loadTrash(); runOrphanScan();
            }).catch(function(e){ btn.disabled=false; btn.textContent='↩ Restore Selected'; msg.style.color='#ef4444'; msg.textContent='Error: '+e.message; });
        });

        container.querySelector('#csdt-trash-delete-btn').addEventListener('click', function(){
            var sel = Array.from(container.querySelectorAll('.csdt-trash-cb:checked')).map(function(c){ return c.value; });
            if (!sel.length) { alert('Select at least one table.'); return; }
            if (!confirm('⚠️ Permanently delete ' + sel.length + ' table(s)? This CANNOT be undone.')) return;
            var btn = this, msg = container.querySelector('#csdt-trash-msg');
            btn.disabled=true; btn.textContent='⏳ Deleting…'; msg.textContent='';
            post('csdt_db_drop_tables', {tables: sel}).then(function(r){
                btn.disabled=false; btn.textContent='🗑 Delete Forever';
                msg.style.color = r.success ? '#16a34a' : '#ef4444';
                msg.textContent = (r.data && r.data.message) || (r.success ? 'Deleted.' : 'Failed.');
                loadTrash();
            }).catch(function(e){ btn.disabled=false; btn.textContent='🗑 Delete Forever'; msg.style.color='#ef4444'; msg.textContent='Error: '+e.message; });
        });
    }

    /* ── Init ──────────────────────────────────── */
    document.getElementById('csdt-orphan-scan-btn').addEventListener('click', runOrphanScan);

    document.getElementById('csdt-trash-toggle').addEventListener('click', function(){
        var open = trashBody.style.display !== 'none';
        trashBody.style.display = open ? 'none' : '';
        trashChevron.textContent = open ? '▶' : '▼';
        if (!open && !trashLoaded) { trashLoaded = true; loadTrash(); }
    });

    document.getElementById('csdt-trash-refresh-btn').addEventListener('click', function(e){
        e.stopPropagation();
        loadTrash();
    });
})();
