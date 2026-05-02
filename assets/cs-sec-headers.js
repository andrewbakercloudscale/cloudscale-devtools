/* global csdtVulnScan, ajaxurl */
'use strict';

( function () {
    function wireRestoreBtn( restoreBtn ) {
        if ( ! restoreBtn ) { return; }
        restoreBtn.addEventListener( 'click', function () {
            var idx = restoreBtn.getAttribute( 'data-index' );
            if ( ! confirm( 'Restore this Security Headers configuration? The current settings will be pushed to history first.' ) ) { return; }
            restoreBtn.disabled = true;
            restoreBtn.textContent = '⏳';
            var fd = new FormData();
            fd.append( 'action', 'csdt_sec_headers_restore' );
            fd.append( 'nonce',  csdtVulnScan.nonce );
            fd.append( 'index',  idx );
            fetch( ajaxurl, { method: 'POST', body: fd } )
                .then( function ( r ) { return r.json(); } )
                .then( function ( resp ) {
                    if ( ! resp.success ) {
                        alert( 'Restore failed: ' + ( resp.data || 'unknown error' ) );
                        restoreBtn.disabled = false;
                        restoreBtn.textContent = '↩ Restore';
                        return;
                    }
                    var d = resp.data;
                    var enabledCb = document.getElementById( 'csdt-sec-headers-enabled' );
                    var extCb     = document.getElementById( 'csdt-sec-headers-ext' );
                    if ( enabledCb ) { enabledCb.checked = d.enabled === '1'; }
                    if ( extCb )     { extCb.checked     = d.ext_ack === '1'; }
                    restoreBtn.textContent = '✅ Restored';
                    var restoreMsg = document.getElementById( 'csdt-sh-restore-msg' );
                    if ( restoreMsg ) {
                        restoreMsg.style.display = 'block';
                        restoreMsg.textContent   = '✅ Restored and saved.';
                        setTimeout( function () { restoreMsg.style.display = 'none'; }, 5000 );
                    }
                } )
                .catch( function () { restoreBtn.disabled = false; restoreBtn.textContent = '↩ Restore'; } );
        } );
    }

    function prependHistoryEntry( entry ) {
        var wrap = document.getElementById( 'csdt-sh-history-wrap' );
        var ts   = entry.saved_at ? ( Math.floor( ( Date.now() / 1000 ) - entry.saved_at ) < 60 ? 'just now' : 'moments ago' ) : '';

        if ( ! wrap ) {
            var panel = document.getElementById( 'cs-sec-headers-panel' );
            if ( ! panel ) { return; }
            wrap = document.createElement( 'div' );
            wrap.id = 'csdt-sh-history-wrap';
            wrap.style.marginTop = '18px';
            wrap.innerHTML =
                '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:8px;">Change History (1 save)</div>' +
                '<div id="csdt-sh-history-list" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;"></div>' +
                '<div id="csdt-sh-restore-msg" style="display:none;margin-top:6px;font-size:12px;font-weight:600;color:#16a34a;"></div>';
            panel.appendChild( wrap );
        }

        var list = wrap.querySelector( '#csdt-sh-history-list' ) || wrap.querySelector( '[style*="border"]' );
        if ( ! list ) { return; }

        var heading = wrap.querySelector( 'div' );
        if ( heading ) {
            var existing = list.querySelectorAll( '[data-sh-idx]' ).length;
            heading.textContent = 'Change History (' + ( existing + 1 ) + ' saves)';
        }

        list.querySelectorAll( '.csdt-sh-restore-btn' ).forEach( function ( b ) {
            var old = parseInt( b.getAttribute( 'data-index' ), 10 );
            b.setAttribute( 'data-index', old + 1 );
        } );

        var row = document.createElement( 'div' );
        row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 12px;background:#fff;';
        row.setAttribute( 'data-sh-idx', '0' );
        row.innerHTML =
            '<span style="color:#94a3b8;font-size:11px;white-space:nowrap;min-width:95px;">' + ts + '</span>' +
            '<span style="flex:1;font-size:12px;color:#334155;">' + ( entry.label || 'Settings saved' ) + '</span>' +
            '<button type="button" class="csdt-sh-restore-btn" data-index="0" ' +
            'style="background:none;border:1px solid #94a3b8;color:#475569;font-size:11px;font-weight:600;padding:3px 10px;border-radius:4px;cursor:pointer;white-space:nowrap;">&#x21A9; Restore</button>';

        var firstRow = list.querySelector( ':first-child' );
        if ( firstRow ) { firstRow.style.borderTop = '1px solid #e2e8f0'; }

        list.insertBefore( row, list.firstChild );
        wireRestoreBtn( row.querySelector( '.csdt-sh-restore-btn' ) );
    }

    function gradeToScore( grade ) {
        var map = { 'A+': 100, 'A': 88, 'B': 75, 'C': 55, 'D': 35, 'F': 10 };
        return map[ grade ] !== undefined ? map[ grade ] : 10;
    }

    function renderScanHistoryChart( history ) {
        var canvas = document.getElementById( 'csdt-scan-history-chart' );
        if ( ! canvas || ! history || ! history.length ) { return; }
        var ctx = canvas.getContext( '2d' );
        var w = canvas.offsetWidth || 600;
        var h = 100;
        canvas.width  = w;
        canvas.height = h;
        ctx.clearRect( 0, 0, w, h );

        var bands = [
            { label: 'A+', score: 100, color: '#dcfce7' },
            { label: 'A',  score: 88,  color: '#f0fdf4' },
            { label: 'B',  score: 75,  color: '#fef9c3' },
            { label: 'C',  score: 55,  color: '#fff7ed' },
            { label: 'D',  score: 35,  color: '#fef2f2' },
            { label: 'F',  score: 10,  color: '#fef2f2' },
        ];
        var pad = { top: 8, bottom: 8, left: 30, right: 8 };
        var chartW = w - pad.left - pad.right;
        var chartH = h - pad.top - pad.bottom;

        function yOf( score ) {
            return pad.top + chartH - ( ( score / 110 ) * chartH );
        }

        // Grid lines
        bands.forEach( function ( b ) {
            var y = yOf( b.score );
            ctx.beginPath();
            ctx.moveTo( pad.left, y );
            ctx.lineTo( w - pad.right, y );
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#94a3b8';
            ctx.font = '9px sans-serif';
            ctx.fillText( b.label, 2, y + 3 );
        } );

        var len = history.length;
        function xOf( i ) {
            if ( len === 1 ) { return pad.left + chartW / 2; }
            return pad.left + ( i / ( len - 1 ) ) * chartW;
        }

        // Draw polyline (oldest at right, newest at left — index 0 = newest)
        ctx.beginPath();
        for ( var i = 0; i < len; i++ ) {
            var x = xOf( len - 1 - i );
            var y = yOf( gradeToScore( history[ i ].grade ) );
            if ( i === 0 ) { ctx.moveTo( x, y ); } else { ctx.lineTo( x, y ); }
        }
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Dots
        var dotColors = { 'A+': '#16a34a', 'A': '#22c55e', 'B': '#eab308', 'C': '#f97316', 'D': '#ef4444', 'F': '#991b1b' };
        for ( var j = 0; j < len; j++ ) {
            var dx = xOf( len - 1 - j );
            var dy = yOf( gradeToScore( history[ j ].grade ) );
            ctx.beginPath();
            ctx.arc( dx, dy, 4, 0, Math.PI * 2 );
            ctx.fillStyle = dotColors[ history[ j ].grade ] || '#3b82f6';
            ctx.fill();
        }
    }

    function renderScanHistoryList( history ) {
        var list = document.getElementById( 'csdt-scan-history-list' );
        if ( ! list || ! history || ! history.length ) { return; }
        var gradeColors = { 'A+': '#16a34a', 'A': '#22c55e', 'B': '#eab308', 'C': '#f97316', 'D': '#ef4444', 'F': '#991b1b' };
        var rows = history.map( function ( entry ) {
            var d = new Date( entry.ts * 1000 );
            var dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString( [], { hour: '2-digit', minute: '2-digit' } );
            var gc = gradeColors[ entry.grade ] || '#64748b';
            var secHtml = '';
            if ( entry.sec ) {
                var keys = Object.keys( entry.sec );
                secHtml = keys.map( function ( k ) {
                    var st = entry.sec[ k ];
                    var dot = st === 'present' ? '&#x2714;' : ( st === 'duplicate' ? '&#x26A0;' : '&#x2718;' );
                    var col = st === 'present' ? '#16a34a' : ( st === 'duplicate' ? '#f59e0b' : '#dc2626' );
                    var shortKey = k.replace( /^(content-security-policy|strict-transport-security)$/, function ( m ) {
                        return m === 'content-security-policy' ? 'CSP' : 'HSTS';
                    } ).replace( /^x-/, '' ).replace( /-/g, ' ' );
                    return '<span style="color:' + col + ';font-size:10px;margin-right:6px;" title="' + k + '">' + dot + ' ' + shortKey + '</span>';
                } ).join( '' );
            }
            return '<div style="display:flex;align-items:center;gap:10px;padding:6px 12px;border-bottom:1px solid #f1f5f9;">' +
                '<span style="background:' + gc + ';color:#fff;font-size:11px;font-weight:700;padding:2px 7px;border-radius:4px;min-width:28px;text-align:center;">' + entry.grade + '</span>' +
                '<span style="color:#64748b;font-size:11px;white-space:nowrap;">' + dateStr + '</span>' +
                '<div style="flex:1;font-size:11px;">' + secHtml + '</div>' +
                '</div>';
        } );
        list.innerHTML = rows.join( '' );
    }

    function updateScanHistoryDisplay( history ) {
        var wrap = document.getElementById( 'csdt-scan-history-wrap' );
        if ( ! wrap || ! history || ! history.length ) { return; }
        wrap.style.display = '';
        var heading = wrap.querySelector( 'div' );
        if ( heading ) { heading.textContent = 'Scan History (' + history.length + ' scans)'; }
        renderScanHistoryChart( history );
        renderScanHistoryList( history );
    }

    function csdtScanHeadersInit() {
        var scanBtn = document.getElementById( 'csdt-scan-headers-btn' );
        if ( ! scanBtn || scanBtn._csdtScanInitted ) { return; }
        scanBtn._csdtScanInitted = true;

        scanBtn.addEventListener( 'click', function () {
            scanBtn.disabled = true;
            scanBtn.textContent = '⏳ Scanning…';
            var resultsDiv = document.getElementById( 'csdt-scan-results' );
            if ( resultsDiv ) { resultsDiv.style.display = 'none'; resultsDiv.innerHTML = ''; }

            var fd = new FormData();
            fd.append( 'action', 'csdt_scan_headers' );
            fd.append( 'nonce',  csdtVulnScan.nonce );
            fetch( csdtVulnScan.ajaxUrl, { method: 'POST', body: fd } )
                .then( function ( r ) { return r.json(); } )
                .then( function ( resp ) {
                    scanBtn.disabled    = false;
                    scanBtn.textContent = 'Scan Headers Now';
                    if ( ! resp.success || ! resp.data ) {
                        if ( resultsDiv ) { resultsDiv.style.display = 'block'; resultsDiv.innerHTML = '<span style="color:#dc2626;">Scan failed.</span>'; }
                        return;
                    }
                    var home = resp.data.home;
                    if ( resultsDiv && home ) {
                        resultsDiv.style.display = 'block';
                        var gradeColors = { 'A+': '#16a34a', 'A': '#22c55e', 'B': '#eab308', 'C': '#f97316', 'D': '#ef4444', 'F': '#991b1b' };
                        var gc = gradeColors[ home.grade ] || '#64748b';
                        var html = '<div style="display:flex;align-items:center;gap:16px;margin-bottom:12px;">' +
                            '<div style="background:' + gc + ';color:#fff;font-size:28px;font-weight:700;width:60px;height:60px;border-radius:10px;display:flex;align-items:center;justify-content:center;">' + ( home.grade || '?' ) + '</div>' +
                            '<div><div style="font-weight:700;font-size:14px;">' + ( home.url || '' ) + '</div>' +
                            '<div style="font-size:12px;color:#64748b;">HTTP ' + ( home.status_code || '' ) + ( home.ip ? ' &middot; ' + home.ip : '' ) + '</div></div></div>';
                        if ( home.sec ) {
                            html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">';
                            Object.keys( home.sec ).forEach( function ( k ) {
                                var st = home.sec[ k ];
                                var stColor = st.status === 'present' ? '#16a34a' : ( st.status === 'duplicate' ? '#f59e0b' : '#dc2626' );
                                html += '<div style="border:1px solid ' + stColor + ';border-radius:5px;padding:4px 10px;font-size:11px;">' +
                                    '<span style="color:' + stColor + ';font-weight:700;">' + k + '</span>' +
                                    '<span style="color:#64748b;margin-left:6px;">' + st.status + '</span>';
                                if ( st.values && st.values.length ) {
                                    html += '<div style="font-family:monospace;font-size:10px;color:#475569;margin-top:2px;word-break:break-all;">' + st.values.join( '<br>' ) + '</div>';
                                }
                                html += '</div>';
                            } );
                            html += '</div>';
                        }
                        if ( home.warnings && home.warnings.length ) {
                            html += '<div style="margin-bottom:8px;">';
                            home.warnings.forEach( function ( w ) {
                                html += '<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:5px;padding:8px 12px;margin-bottom:4px;font-size:12px;">' +
                                    '<strong style="color:#c2410c;">' + w.header + ':</strong> ' + w.msg + '</div>';
                            } );
                            html += '</div>';
                        }
                        resultsDiv.innerHTML = html;
                    }
                    if ( home && home.scan_history ) {
                        updateScanHistoryDisplay( home.scan_history );
                    }
                } )
                .catch( function () {
                    scanBtn.disabled    = false;
                    scanBtn.textContent = 'Scan Headers Now';
                    if ( resultsDiv ) { resultsDiv.style.display = 'block'; resultsDiv.innerHTML = '<span style="color:#dc2626;">Request failed.</span>'; }
                } );
        } );
    }

    function csdtSecHeadersInit() {
        var btn = document.getElementById( 'csdt-sec-headers-save' );
        if ( ! btn || btn._csdtSHInitted ) { return; }
        btn._csdtSHInitted = true;
        var msg = document.getElementById( 'csdt-sec-headers-msg' );

        function flash( ok ) {
            if ( ! msg ) { return; }
            msg.textContent = ok ? '✓ Saved' : '❌ Error';
            msg.style.color = ok ? '#16a34a' : '#dc2626';
            msg.classList.add( 'visible' );
            setTimeout( function () { msg.classList.remove( 'visible' ); msg.style.color = ''; }, 10000 );
        }

        btn.addEventListener( 'click', function () {
            btn.disabled = true;
            var fd = new FormData();
            fd.append( 'action',  'csdt_sec_headers_save' );
            fd.append( 'nonce',   csdtVulnScan.nonce );
            fd.append( 'enabled', document.getElementById( 'csdt-sec-headers-enabled' ).checked ? '1' : '0' );
            fd.append( 'ext_ack', document.getElementById( 'csdt-sec-headers-ext' ).checked     ? '1' : '0' );
            fetch( ajaxurl, { method: 'POST', body: fd } )
                .then( function ( r ) { return r.json(); } )
                .then( function ( resp ) {
                    flash( resp.success );
                    if ( resp.success && resp.data && resp.data.history_entry ) {
                        prependHistoryEntry( resp.data.history_entry );
                    }
                } )
                .catch( function () { flash( false ); } )
                .finally( function () { btn.disabled = false; } );
        } );

        document.querySelectorAll( '.csdt-sh-restore-btn' ).forEach( wireRestoreBtn );
    }

    // ── Boot ────────────────────────────────────────────────────────────────
    function bootHeaders() {
        csdtSecHeadersInit();
        csdtScanHeadersInit();
        if ( window.csdtScanHeaderHistory && window.csdtScanHeaderHistory.length ) {
            updateScanHistoryDisplay( window.csdtScanHeaderHistory );
        }
    }

    if ( document.readyState === 'loading' ) {
        document.addEventListener( 'DOMContentLoaded', bootHeaders );
    } else {
        bootHeaders();
    }
    document.addEventListener( 'csdt:tab-shown', function ( e ) {
        if ( e.detail && e.detail.tab === 'headers' ) {
            csdtSecHeadersInit();
            csdtScanHeadersInit();
        }
    } );
} )();
