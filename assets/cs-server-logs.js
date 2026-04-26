/**
 * CloudScale Devtools — Server Logs tab
 *
 * Handles source-selection, AJAX fetching, filtering, colour-coding,
 * and auto-refresh for the Server Logs admin tab.
 *
 * Depends on csdtServerLogs (ajaxUrl, nonce, sources) localised by PHP.
 */
( function () {
    'use strict';

    // ── DOM refs ─────────────────────────────────────────────────────────────
    var sourcesWrap = document.getElementById( 'cs-logs-sources' );
    var viewer      = document.getElementById( 'cs-logs-viewer' );
    var searchInput = document.getElementById( 'cs-logs-search' );
    var levelSel    = document.getElementById( 'cs-logs-level' );
    var linesSel    = document.getElementById( 'cs-logs-lines' );
    var refreshBtn  = document.getElementById( 'cs-logs-refresh' );
    var statusMsg   = document.getElementById( 'cs-logs-status' );
    var autoChk     = document.getElementById( 'cs-logs-tail' );

    if ( ! sourcesWrap || ! viewer ) { return; }

    // ── State ─────────────────────────────────────────────────────────────────
    var activeSource  = null;   // currently selected source key
    var cachedLines   = {};     // key → raw string[]
    var sourceStatus  = {};     // key → 'ok' | 'not_found' | 'permission_denied' | 'empty' | 'error'
    var autoTimer     = null;

    // ── Helpers ───────────────────────────────────────────────────────────────
    function esc( s ) {
        return String( s )
            .replace( /&/g, '&amp;' )
            .replace( /</g, '&lt;' )
            .replace( />/g, '&gt;' )
            .replace( /"/g, '&quot;' );
    }

    /** Classify a raw log line to a CSS level class. */
    function lineLevel( text ) {
        var t = text.toLowerCase();
        if ( /\b(emerg|emergency)\b/.test( t ) )  return 'level-emerg';
        if ( /\b(alert)\b/.test( t ) )             return 'level-alert';
        if ( /\b(crit|critical)\b/.test( t ) )     return 'level-crit';
        if ( /\b(error|err)\b/.test( t ) )         return 'level-error';
        if ( /\b(warn|warning)\b/.test( t ) )      return 'level-warn';
        if ( /\b(notice)\b/.test( t ) )            return 'level-notice';
        if ( /\b(info)\b/.test( t ) )              return 'level-info';
        if ( /\b(debug)\b/.test( t ) )             return 'level-debug';
        return 'level-default';
    }

    /** True if line passes the current level filter. */
    function matchesLevel( cls, filter ) {
        if ( ! filter ) { return true; }
        var order = [ 'level-emerg', 'level-alert', 'level-crit', 'level-error',
                      'level-warn', 'level-notice', 'level-info', 'level-debug' ];
        var map = {
            emerg:  [ 'level-emerg' ],
            alert:  [ 'level-emerg', 'level-alert' ],
            crit:   [ 'level-emerg', 'level-alert', 'level-crit' ],
            error:  [ 'level-emerg', 'level-alert', 'level-crit', 'level-error' ],
            warn:   [ 'level-warn' ],
            notice: [ 'level-notice' ],
            info:   [ 'level-info' ],
            debug:  [ 'level-debug' ],
        };
        var allowed = map[ filter ];
        if ( ! allowed ) { return true; }
        return allowed.indexOf( cls ) !== -1;
    }

    /** Render cached lines with current filter settings. */
    function renderLines( key ) {
        var lines  = cachedLines[ key ] || [];
        var search = searchInput  ? searchInput.value.trim().toLowerCase() : '';
        var level  = levelSel     ? levelSel.value : '';

        if ( lines.length === 0 ) {
            var st = sourceStatus[ key ] || 'empty';
            var msg = st === 'not_found'         ? '📁 File not found on this server.'
                    : st === 'permission_denied' ? '🔒 Permission denied — this file is not readable by the web server user (www-data). System logs are typically root-owned; this is normal.'
                    : st === 'empty'             ? '✅ Log file exists but is empty.'
                    : '⚠ Could not read the log file.';
            viewer.innerHTML = '<div class="cs-logs-placeholder">' + esc( msg ) + '</div>';
            return;
        }

        var html = '';
        var shown = 0;
        for ( var i = 0; i < lines.length; i++ ) {
            var line = lines[ i ];
            if ( ! line ) { continue; }
            var cls = lineLevel( line );
            if ( ! matchesLevel( cls, level ) ) { continue; }
            if ( search && line.toLowerCase().indexOf( search ) === -1 ) { continue; }
            html += '<div class="cs-log-line ' + cls + '">' + esc( line ) + '</div>';
            shown++;
        }

        if ( shown === 0 ) {
            viewer.innerHTML = '<div class="cs-logs-placeholder">🔍 No lines match the current filters.</div>';
        } else {
            viewer.innerHTML = html;
            // Scroll to bottom so most-recent entries are visible.
            viewer.scrollTop = viewer.scrollHeight;
        }
    }

    /** Set status chip text. */
    function setStatus( text, ok ) {
        if ( ! statusMsg ) { return; }
        statusMsg.textContent = text;
        statusMsg.style.color = ok ? '#22c55e' : '#888';
    }

    /** Mark a source button with its availability status. */
    function applyStatusClass( btn, status ) {
        btn.classList.remove( 'status-ok', 'status-not-found', 'status-permission-denied', 'status-empty', 'status-error' );
        btn.classList.add( 'status-' + ( status || 'error' ).replace( /_/g, '-' ) );
        btn.title = status === 'ok'                 ? 'Readable'
                  : status === 'not_found'          ? 'Not found on this server'
                  : status === 'permission_denied'  ? 'Permission denied'
                  : status === 'empty'              ? 'File is empty'
                  : 'Unavailable';
    }

    // ── Load status for all sources ───────────────────────────────────────────
    function loadStatuses() {
        var fd = new FormData();
        fd.append( 'action', 'csdt_devtools_server_logs_status' );
        fd.append( 'nonce',  csdtServerLogs.nonce );

        fetch( csdtServerLogs.ajaxUrl, { method: 'POST', body: fd } )
            .then( function ( r ) { return r.json(); } )
            .then( function ( resp ) {
                if ( ! resp.success ) { return; }
                var data = resp.data;
                var btns = sourcesWrap.querySelectorAll( '.cs-log-src-btn' );
                btns.forEach( function ( btn ) {
                    var key = btn.dataset.source;
                    if ( data[ key ] ) {
                        sourceStatus[ key ] = data[ key ].status;
                        applyStatusClass( btn, data[ key ].status );
                    }
                } );
            } )
            .catch( function () {} );
    }

    // ── Fetch a source ────────────────────────────────────────────────────────
    function fetchSource( key, silent ) {
        if ( ! key ) { return; }
        var lines = linesSel ? linesSel.value : '300';

        if ( ! silent ) {
            setStatus( 'Loading…', false );
            viewer.innerHTML = '<div class="cs-logs-placeholder">Loading…</div>';
        }

        var fd = new FormData();
        fd.append( 'action', 'csdt_devtools_server_logs_fetch' );
        fd.append( 'nonce',  csdtServerLogs.nonce );
        fd.append( 'source', key );
        fd.append( 'lines',  lines );

        fetch( csdtServerLogs.ajaxUrl, { method: 'POST', body: fd } )
            .then( function ( r ) { return r.json(); } )
            .then( function ( resp ) {
                if ( ! resp.success ) {
                    setStatus( 'Error loading log', false );
                    viewer.innerHTML = '<div class="cs-logs-placeholder">⚠ Failed to load log entries.</div>';
                    return;
                }
                var d = resp.data;
                sourceStatus[ key ] = d.status;

                // Update the button status indicator.
                var btn = sourcesWrap.querySelector( '[data-source="' + key + '"]' );
                if ( btn ) { applyStatusClass( btn, d.status ); }

                cachedLines[ key ] = d.lines || [];
                setStatus( d.count + ' lines · ' + d.path, true );
                renderLines( key );
            } )
            .catch( function () {
                setStatus( 'Network error', false );
                viewer.innerHTML = '<div class="cs-logs-placeholder">⚠ Network error.</div>';
            } );
    }

    // ── Source button clicks ──────────────────────────────────────────────────
    sourcesWrap.addEventListener( 'click', function ( e ) {
        var btn = e.target.closest( '.cs-log-src-btn' );
        if ( ! btn ) { return; }
        var key = btn.dataset.source;

        // Update active state.
        sourcesWrap.querySelectorAll( '.cs-log-src-btn' ).forEach( function ( b ) {
            b.classList.remove( 'active' );
        } );
        btn.classList.add( 'active' );
        activeSource = key;

        fetchSource( key, false );
    } );

    // ── Refresh button ────────────────────────────────────────────────────────
    if ( refreshBtn ) {
        refreshBtn.addEventListener( 'click', function () {
            if ( activeSource ) {
                delete cachedLines[ activeSource ];
                fetchSource( activeSource, false );
            }
        } );
    }

    // ── Search / level / lines filters ───────────────────────────────────────
    function onFilterChange() {
        if ( activeSource ) { renderLines( activeSource ); }
    }

    if ( searchInput ) { searchInput.addEventListener( 'input',  onFilterChange ); }
    if ( levelSel )    { levelSel.addEventListener(   'change', onFilterChange ); }
    if ( linesSel )    {
        linesSel.addEventListener( 'change', function () {
            if ( activeSource ) {
                delete cachedLines[ activeSource ];
                fetchSource( activeSource, false );
            }
        } );
    }

    // ── Auto-refresh ──────────────────────────────────────────────────────────
    if ( autoChk ) {
        autoChk.addEventListener( 'change', function () {
            clearInterval( autoTimer );
            if ( autoChk.checked && activeSource ) {
                autoTimer = setInterval( function () {
                    if ( activeSource ) {
                        delete cachedLines[ activeSource ];
                        fetchSource( activeSource, true );
                    }
                }, 30000 );
            }
        } );
    }

    // ── Fix mu-plugins permissions ────────────────────────────────────────────
    var fixPermBtn     = document.getElementById( 'cs-logs-fix-perm-btn' );
    var permWarning    = document.getElementById( 'cs-logs-perm-warning' );

    if ( fixPermBtn ) {
        fixPermBtn.addEventListener( 'click', function () {
            fixPermBtn.disabled = true;
            fixPermBtn.textContent = '…';

            var fd = new FormData();
            fd.append( 'action', 'csdt_devtools_logs_fix_mu_perms' );
            fd.append( 'nonce',  csdtServerLogs.nonce );

            fetch( csdtServerLogs.ajaxUrl, { method: 'POST', body: fd } )
                .then( function ( r ) { return r.json(); } )
                .then( function ( resp ) {
                    if ( resp.success ) {
                        if ( permWarning ) { permWarning.style.display = 'none'; }
                        var setupBtn = document.getElementById( 'cs-logs-php-setup-btn' );
                        if ( setupBtn ) {
                            setupBtn.disabled = false;
                            setupBtn.removeAttribute( 'title' );
                        }
                    } else {
                        fixPermBtn.disabled = false;
                        fixPermBtn.textContent = '🔧 Fix Permissions';
                        phpSetupShowError( resp.data && resp.data.message ? resp.data.message : 'Permission fix failed.' );
                    }
                } )
                .catch( function () {
                    fixPermBtn.disabled = false;
                    fixPermBtn.textContent = '🔧 Fix Permissions';
                    phpSetupShowError( 'Request failed — check your connection.' );
                } );
        } );
    }

    // ── PHP error log setup ───────────────────────────────────────────────────
    var phpSetupBtn     = document.getElementById( 'cs-logs-php-setup-btn' );
    var phpSetupBanner  = document.getElementById( 'cs-logs-php-setup' );
    var phpSetupErrEl   = null; // created on first error

    function phpSetupShowError( msg ) {
        if ( ! phpSetupBanner ) { return; }
        if ( ! phpSetupErrEl ) {
            phpSetupErrEl = document.createElement( 'p' );
            phpSetupErrEl.style.cssText = 'margin:8px 0 0;font-size:12px;color:#b45309;font-weight:600;';
            phpSetupBanner.appendChild( phpSetupErrEl );
        }
        phpSetupErrEl.textContent = msg;
    }

    if ( phpSetupBtn ) {
        phpSetupBtn.addEventListener( 'click', function () {
            phpSetupBtn.disabled = true;
            phpSetupBtn.textContent = '…';
            if ( phpSetupErrEl ) { phpSetupErrEl.textContent = ''; }

            var fd = new FormData();
            fd.append( 'action', 'csdt_devtools_logs_setup_php' );
            fd.append( 'nonce',  csdtServerLogs.nonce );

            fetch( csdtServerLogs.ajaxUrl, { method: 'POST', body: fd } )
                .then( function ( r ) { return r.json(); } )
                .then( function ( resp ) {
                    if ( resp.success ) {
                        if ( phpSetupBanner ) { phpSetupBanner.style.display = 'none'; }
                        rebuildSourceButtons( resp.data.sources );
                        loadStatuses();
                    } else {
                        phpSetupShowError( 'Setup failed: ' + ( resp.data && resp.data.message ? resp.data.message : ( resp.data || 'unknown error' ) ) );
                        phpSetupBtn.disabled = false;
                        phpSetupBtn.textContent = '⚡ Enable';
                    }
                } )
                .catch( function () {
                    phpSetupShowError( 'Request failed — check your connection.' );
                    phpSetupBtn.disabled = false;
                    phpSetupBtn.textContent = '⚡ Enable';
                } );
        } );
    }

    // ── Rebuild source buttons from a sources map ─────────────────────────────
    function rebuildSourceButtons( sources ) {
        if ( ! sourcesWrap || ! sources ) { return; }
        sourcesWrap.innerHTML = '';
        Object.keys( sources ).forEach( function ( key ) {
            var btn = document.createElement( 'button' );
            btn.className = 'cs-btn-secondary cs-log-src-btn';
            btn.dataset.source = key;
            btn.textContent = sources[ key ].label;
            sourcesWrap.appendChild( btn );
        } );
        if ( ! sourcesWrap.children.length ) {
            sourcesWrap.innerHTML = '<span style="color:#888;font-size:13px;">No log paths detected on this server.</span>';
        }
    }

    // ── Custom log paths ──────────────────────────────────────────────────────
    var customList  = document.getElementById( 'cs-logs-custom-list' );
    var addBtn      = document.getElementById( 'cs-logs-custom-add' );
    var saveBtn     = document.getElementById( 'cs-logs-custom-save' );
    var savedMsg    = document.getElementById( 'cs-logs-custom-saved' );

    function addCustomRow( label, path ) {
        var row = document.createElement( 'div' );
        row.className = 'cs-logs-custom-row';
        row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:6px;';
        row.innerHTML =
            '<input type="text" class="cs-text-input cs-logs-custom-label" placeholder="Label" value="' + esc( label || '' ) + '" style="width:140px;flex-shrink:0;">' +
            '<input type="text" class="cs-text-input cs-logs-custom-path" placeholder="/path/to/file.log" value="' + esc( path || '' ) + '" style="flex:1;min-width:0;">' +
            '<button type="button" class="cs-btn-secondary cs-btn-sm cs-logs-custom-remove" style="color:#dc2626;border-color:#fca5a5;flex-shrink:0;">✕</button>';
        customList.appendChild( row );
    }

    if ( addBtn ) {
        addBtn.addEventListener( 'click', function () { addCustomRow( '', '' ); } );
    }

    if ( customList ) {
        customList.addEventListener( 'click', function ( e ) {
            var btn = e.target.closest( '.cs-logs-custom-remove' );
            if ( btn ) { btn.closest( '.cs-logs-custom-row' ).remove(); }
        } );
    }

    if ( saveBtn ) {
        saveBtn.addEventListener( 'click', function () {
            saveBtn.disabled = true;
            var paths = [];
            var rows = customList ? customList.querySelectorAll( '.cs-logs-custom-row' ) : [];
            rows.forEach( function ( row ) {
                var l = row.querySelector( '.cs-logs-custom-label' );
                var p = row.querySelector( '.cs-logs-custom-path' );
                if ( l && p && l.value.trim() && p.value.trim() ) {
                    paths.push( { label: l.value.trim(), path: p.value.trim() } );
                }
            } );

            var fd = new FormData();
            fd.append( 'action', 'csdt_devtools_logs_custom_save' );
            fd.append( 'nonce',  csdtServerLogs.nonce );
            fd.append( 'paths',  JSON.stringify( paths ) );

            fetch( csdtServerLogs.ajaxUrl, { method: 'POST', body: fd } )
                .then( function ( r ) { return r.json(); } )
                .then( function ( resp ) {
                    saveBtn.disabled = false;
                    if ( resp.success ) {
                        rebuildSourceButtons( resp.data.sources );
                        loadStatuses();
                    }
                    if ( savedMsg ) {
                        savedMsg.textContent = resp.success ? '✅ Saved' : '❌ Error';
                        savedMsg.style.color = resp.success ? '' : '#e53e3e';
                        savedMsg.classList.add( 'visible' );
                        setTimeout( function () { savedMsg.classList.remove( 'visible' ); savedMsg.style.color = ''; }, 2500 );
                    }
                } )
                .catch( function () {
                    saveBtn.disabled = false;
                    if ( savedMsg ) {
                        savedMsg.textContent = '❌ Error';
                        savedMsg.style.color = '#e53e3e';
                        savedMsg.classList.add( 'visible' );
                        setTimeout( function () { savedMsg.classList.remove( 'visible' ); savedMsg.style.color = ''; }, 2500 );
                    }
                } );
        } );
    }

    // ── Init: load source statuses on page open ───────────────────────────────
    loadStatuses();

} )();
