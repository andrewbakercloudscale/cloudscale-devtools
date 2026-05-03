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
                    var extCb = document.getElementById( 'csdt-sec-headers-ext' );
                    if ( extCb ) { extCb.checked = d.ext_ack === '1'; }

                    // Restore per-header cards if config is present in response.
                    if ( d.headers_config && typeof d.headers_config === 'object' ) {
                        Object.keys( d.headers_config ).forEach( function ( key ) {
                            var cfg   = d.headers_config[ key ];
                            var cb    = document.querySelector( '.csdt-sh-toggle[data-key="' + key + '"]' );
                            if ( cb ) { cb.checked = !! cfg.enabled; cb.dispatchEvent( new Event( 'change' ) ); }
                            var input = document.querySelector( '.csdt-sh-value[data-key="' + key + '"]' );
                            if ( input && cfg.value !== undefined ) { input.value = cfg.value; }
                            // Restore per-directive checkboxes for Permissions-Policy.
                            if ( key === 'permissions-policy' && cfg.value !== undefined ) {
                                document.querySelectorAll( '.csdt-pp-dir' ).forEach( function ( ppCb ) {
                                    ppCb.checked = cfg.value.indexOf( ppCb.getAttribute( 'data-dir' ) + '=()' ) !== -1;
                                } );
                            }
                        } );
                        // Sync master checkbox — prefer the server-returned master state so
                        // it reflects the stored value rather than individual header flags.
                        var masterVal = ( d.enabled !== undefined ) ? d.enabled === '1'
                                        : Object.values( d.headers_config ).some( function ( v ) { return v.enabled; } );
                        var mc    = document.getElementById( 'csdt-sh-master' );
                        if ( mc ) { mc.checked = masterVal; mc.dispatchEvent( new Event( 'change' ) ); }
                    }
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
        var ts       = entry.saved_at ? ( Math.floor( ( Date.now() / 1000 ) - entry.saved_at ) < 60 ? 'just now' : 'moments ago' ) : '';
        var d        = entry.saved_at ? new Date( entry.saved_at * 1000 ) : null;
        var months   = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];
        var timeStr  = d ? months[ d.getMonth() ] + ' ' + d.getDate() + ' · ' + String( d.getHours() ).padStart( 2, '0' ) + ':' + String( d.getMinutes() ).padStart( 2, '0' ) : '';

        if ( ! wrap ) {
            var panel = document.getElementById( 'cs-sec-headers-panel' );
            if ( ! panel ) { return; }
            wrap = document.createElement( 'div' );
            wrap.id = 'csdt-sh-history-wrap';
            wrap.style.marginTop = '18px';
            wrap.innerHTML =
                '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
                '<span id="csdt-sh-history-heading" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;flex:1;">Change History (1 save)</span>' +
                '<button type="button" id="csdt-sh-history-toggle" style="font-size:11px;padding:2px 8px;background:none;border:1px solid #cbd5e1;color:#64748b;border-radius:4px;cursor:pointer;flex-shrink:0;">Hide &#9650;</button>' +
                '</div>' +
                '<div id="csdt-sh-history-list" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;"></div>' +
                '<div id="csdt-sh-restore-msg" style="display:none;margin-top:6px;font-size:12px;font-weight:600;color:#16a34a;"></div>';
            panel.appendChild( wrap );
            wireHistoryToggle( wrap );
        }

        var list = wrap.querySelector( '#csdt-sh-history-list' ) || wrap.querySelector( '[style*="border:1px solid #e2e8f0"]' );
        if ( ! list ) { return; }

        var headingSpan = wrap.querySelector( '#csdt-sh-history-heading' );
        if ( headingSpan ) {
            var allRows = list.children.length;
            headingSpan.textContent = 'Change History (' + ( allRows + 1 ) + ' saves)';
        }

        // Auto-expand the list so the user can see the new entry.
        if ( list.style.display === 'none' ) {
            list.style.display = '';
            var tog = wrap.querySelector( '#csdt-sh-history-toggle' );
            if ( tog ) { tog.innerHTML = 'Hide &#9650;'; }
        }

        list.querySelectorAll( '.csdt-sh-restore-btn' ).forEach( function ( b ) {
            var old = parseInt( b.getAttribute( 'data-index' ), 10 );
            b.setAttribute( 'data-index', old + 1 );
        } );

        var row = document.createElement( 'div' );
        row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 12px;background:#fff;';
        row.setAttribute( 'data-sh-idx', '0' );
        row.innerHTML =
            '<span style="color:#94a3b8;font-size:11px;white-space:nowrap;min-width:110px;line-height:1.4;">' + ts + ( timeStr ? '<br><span style="font-size:10px;color:#cbd5e1;">' + timeStr + '</span>' : '' ) + '</span>' +
            '<span style="flex:1;font-size:12px;color:#334155;">' + ( entry.label || 'Settings saved' ) + '</span>' +
            '<button type="button" class="csdt-sh-restore-btn" data-index="0" ' +
            'style="background:none;border:1px solid #94a3b8;color:#475569;font-size:11px;font-weight:600;padding:3px 10px;border-radius:4px;cursor:pointer;white-space:nowrap;">&#x21A9; Restore</button>';

        var firstRow = list.querySelector( ':first-child' );
        if ( firstRow ) { firstRow.style.borderTop = '1px solid #e2e8f0'; }

        list.insertBefore( row, list.firstChild );
        wireRestoreBtn( row.querySelector( '.csdt-sh-restore-btn' ) );
    }

    function wireHistoryToggle( wrap ) {
        var toggle = wrap ? wrap.querySelector( '#csdt-sh-history-toggle' ) : document.getElementById( 'csdt-sh-history-toggle' );
        var list   = wrap ? wrap.querySelector( '#csdt-sh-history-list' )   : document.getElementById( 'csdt-sh-history-list' );
        if ( ! toggle || ! list || toggle.dataset.wired ) { return; }
        toggle.dataset.wired = '1';
        toggle.addEventListener( 'click', function () {
            var collapsed = list.style.display === 'none';
            list.style.display = collapsed ? '' : 'none';
            toggle.innerHTML = collapsed ? 'Hide &#9650;' : 'Show &#9660;';
        } );
    }

    function csdtSecHeadersInit() {
        var btn = document.getElementById( 'csdt-sec-headers-save' );
        if ( ! btn ) { return; }
        var msg = document.getElementById( 'csdt-sec-headers-msg' );

        function flash( ok ) {
            if ( ! msg ) { return; }
            msg.textContent = ok ? '✓ Saved' : '❌ Error';
            msg.style.color = ok ? '#16a34a' : '#dc2626';
            msg.classList.add( 'visible' );
            setTimeout( function () { msg.classList.remove( 'visible' ); msg.style.color = ''; }, 10000 );
        }

        // "Set Externally" checkbox — updates its own card border/bg.
        var extCb = document.getElementById( 'csdt-sec-headers-ext' );
        if ( extCb && ! extCb.dataset.wired ) {
            extCb.dataset.wired = '1';
            extCb.addEventListener( 'change', function () {
                var lbl = extCb.closest( 'label' );
                if ( lbl ) {
                    lbl.style.borderColor = extCb.checked ? '#f97316' : '#e2e8f0';
                    lbl.style.background  = extCb.checked ? '#fff7ed' : '#f8fafc';
                }
            } );
        }

        // Master checkbox — dims/undims header cards.
        var masterCb = document.getElementById( 'csdt-sh-master' );
        if ( masterCb && ! masterCb.dataset.wired ) {
            masterCb.dataset.wired = '1';
            masterCb.addEventListener( 'change', function () {
                var cardsWrap = document.getElementById( 'csdt-sh-cards-wrap' );
                var lbl = masterCb.closest( 'label' );
                if ( cardsWrap ) {
                    cardsWrap.style.opacity       = masterCb.checked ? '1' : '.45';
                    cardsWrap.style.pointerEvents = masterCb.checked ? '' : 'none';
                }
                if ( lbl ) {
                    lbl.style.borderColor = masterCb.checked ? '#3b82f6' : '#e2e8f0';
                    lbl.style.background  = masterCb.checked ? '#eff6ff' : '#f8fafc';
                }
            } );
        }

        btn.addEventListener( 'click', function () {
            btn.disabled = true;
            var masterOn     = ! masterCb || masterCb.checked;
            var headersConfig = {};
            document.querySelectorAll( '.csdt-sh-toggle' ).forEach( function ( cb ) {
                var key      = cb.getAttribute( 'data-key' );
                var valInput = document.querySelector( '.csdt-sh-value[data-key="' + key + '"]' );
                // Store individual checkbox state independently of master so history labels
                // reflect only the header that actually changed, not master-switch side-effects.
                headersConfig[ key ] = { enabled: cb.checked, value: valInput ? valInput.value.trim() : '' };
            } );
            var fd = new FormData();
            fd.append( 'action',         'csdt_sec_headers_save' );
            fd.append( 'nonce',          csdtVulnScan.nonce );
            fd.append( 'ext_ack',        document.getElementById( 'csdt-sec-headers-ext' ).checked ? '1' : '0' );
            fd.append( 'master',         masterOn ? '1' : '0' );
            fd.append( 'headers_config', JSON.stringify( headersConfig ) );
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

        // Per-header card toggles — update border/bg/opacity on change.
        document.querySelectorAll( '.csdt-sh-toggle' ).forEach( function ( cb ) {
            cb.addEventListener( 'change', function () {
                var key  = cb.getAttribute( 'data-key' );
                var card = document.getElementById( 'csdt-sh-card-' + key );
                if ( ! card ) { return; }
                var wrap = card.querySelector( '.csdt-sh-value-wrap' );
                if ( wrap ) {
                    wrap.style.opacity       = cb.checked ? '1' : '.45';
                    wrap.style.pointerEvents = cb.checked ? '' : 'none';
                }
                card.style.borderColor = cb.checked ? '#93c5fd' : '#e2e8f0';
                card.style.background  = cb.checked ? '#f0f9ff' : '#fafafa';
            } );
        } );

        // Preset buttons — fill the value input on click.
        document.querySelectorAll( '.csdt-sh-preset' ).forEach( function ( preset ) {
            preset.addEventListener( 'click', function () {
                var key   = preset.getAttribute( 'data-key' );
                var value = preset.getAttribute( 'data-value' );
                var input = document.querySelector( '.csdt-sh-value[data-key="' + key + '"]' );
                if ( input ) { input.value = value; input.focus(); }
            } );
        } );

        // Permissions-Policy directive checkboxes — rebuild hidden value on change.
        function rebuildPermissionsPolicy() {
            var parts = [];
            document.querySelectorAll( '.csdt-pp-dir:checked' ).forEach( function ( cb ) {
                parts.push( cb.getAttribute( 'data-dir' ) + '=()' );
            } );
            var hidden = document.querySelector( '.csdt-sh-value[data-key="permissions-policy"]' );
            if ( hidden ) { hidden.value = parts.join( ', ' ); }
        }
        document.querySelectorAll( '.csdt-pp-dir' ).forEach( function ( cb ) {
            cb.addEventListener( 'change', rebuildPermissionsPolicy );
        } );

        document.querySelectorAll( '.csdt-sh-restore-btn' ).forEach( wireRestoreBtn );
        wireHistoryToggle( document.getElementById( 'csdt-sh-history-wrap' ) );
    }

    // ── Boot ────────────────────────────────────────────────────────────────
    if ( document.readyState === 'loading' ) {
        document.addEventListener( 'DOMContentLoaded', csdtSecHeadersInit );
    } else {
        csdtSecHeadersInit();
    }
    document.addEventListener( 'csdt:tab-shown', function ( e ) {
        if ( e.detail && e.detail.tab === 'security' ) csdtSecHeadersInit();
    } );
} )();
