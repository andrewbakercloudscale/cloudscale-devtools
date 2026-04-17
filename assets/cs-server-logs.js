/**
 * CloudScale DevTools — Server Logs tab
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

    // ── Init: load source statuses on page open ───────────────────────────────
    loadStatuses();

} )();
