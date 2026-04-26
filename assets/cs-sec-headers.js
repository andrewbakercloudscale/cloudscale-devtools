/* global csdtVulnScan, ajaxurl */
'use strict';

( function () {
    var btn = document.getElementById( 'csdt-sec-headers-save' );
    if ( ! btn ) { return; }
    var msg = document.getElementById( 'csdt-sec-headers-msg' );

    function flash( ok ) {
        if ( ! msg ) { return; }
        msg.textContent = ok ? '✓ Saved' : '❌ Error';
        msg.style.color = ok ? '' : '#e53e3e';
        msg.classList.add( 'visible' );
        setTimeout( function () { msg.classList.remove( 'visible' ); msg.style.color = ''; }, 5000 );
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

    function prependHistoryEntry( entry ) {
        var wrap = document.getElementById( 'csdt-sh-history-wrap' );
        var ts   = entry.saved_at ? ( Math.floor( ( Date.now() / 1000 ) - entry.saved_at ) < 60 ? 'just now' : 'moments ago' ) : '';

        if ( ! wrap ) {
            // First-ever history entry — build the wrap from scratch.
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

        // Update heading count.
        var heading = wrap.querySelector( 'div' );
        if ( heading ) {
            var existing = list.querySelectorAll( '[data-sh-idx]' ).length;
            heading.textContent = 'Change History (' + ( existing + 1 ) + ' saves)';
        }

        // Re-index existing rows.
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

        // Add border-top to previous first row.
        var firstRow = list.querySelector( ':first-child' );
        if ( firstRow ) { firstRow.style.borderTop = '1px solid #e2e8f0'; }

        list.insertBefore( row, list.firstChild );
        wireRestoreBtn( row.querySelector( '.csdt-sh-restore-btn' ) );
    }

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

    // Wire any server-rendered restore buttons.
    document.querySelectorAll( '.csdt-sh-restore-btn' ).forEach( wireRestoreBtn );
} )();
