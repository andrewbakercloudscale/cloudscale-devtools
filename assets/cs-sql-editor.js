/**
 * CloudScale Code Block - SQL Editor
 *
 * Handles the SQL query editor, quick-query buttons, and results table.
 * Depends on csdtDevtoolsSqlEditor (nonce) localised by PHP.
 */
( function() {
    'use strict';

    var input    = document.getElementById( 'cs-sql-input' );
    var runBtn   = document.getElementById( 'cs-sql-run' );
    var clearBtn = document.getElementById( 'cs-sql-clear' );
    var results  = document.getElementById( 'cs-sql-results' );
    var status   = document.getElementById( 'cs-sql-status' );
    var meta     = document.getElementById( 'cs-sql-meta' );

    if ( ! input || ! runBtn ) {
        return;
    }

    var nonce = csdtDevtoolsSqlEditor.nonce;

    function escHtml( s ) {
        var d = document.createElement( 'div' );
        d.textContent = s;
        return d.innerHTML;
    }

    function run() {
        var sql = input.value.trim();
        if ( ! sql ) {
            return;
        }

        runBtn.disabled    = true;
        status.textContent = 'Running...';
        status.style.color = '#888';
        results.innerHTML  = '<div style="text-align:center;color:#888;padding:20px">⏳ Executing query...</div>';
        meta.textContent   = '';

        fetch( ajaxurl, {
            method:  'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body:    'action=csdt_devtools_sql_run&nonce=' + encodeURIComponent( nonce ) + '&sql=' + encodeURIComponent( sql )
        } )
        .then( function( r ) { return r.json(); } )
        .then( function( resp ) {
            runBtn.disabled = false;

            if ( ! resp.success ) {
                status.textContent = '✗ Error';
                status.style.color = '#c3372b';
                results.innerHTML  = '<div style="color:#c3372b;background:#fef0f0;border:1px solid #f5bcbb;padding:12px 14px;border-radius:4px;font-family:monospace;font-size:12px;white-space:pre-wrap">'
                    + escHtml( typeof resp.data === 'string' ? resp.data : JSON.stringify( resp.data ) )
                    + '</div>';
                return;
            }

            var d = resp.data;
            status.textContent = '✓ Success';
            status.style.color = '#1.7.35';
            meta.textContent   = d.count + ' row' + ( d.count !== 1 ? 's' : '' ) + ' in ' + d.elapsed + 'ms';

            if ( ! d.rows || d.rows.length === 0 ) {
                results.innerHTML = '<div style="text-align:center;color:#999;padding:20px">Query returned 0 rows</div>';
                return;
            }

            var cols = Object.keys( d.rows[ 0 ] );
            var html = '<table class="cs-sql-table"><thead><tr>';
            cols.forEach( function( c ) {
                html += '<th>' + escHtml( c ) + '</th>';
            } );
            html += '</tr></thead><tbody>';

            d.rows.forEach( function( row ) {
                html += '<tr>';
                cols.forEach( function( c ) {
                    var val = row[ c ];
                    if ( val === null ) {
                        val = '<span style="color:#999;font-style:italic">NULL</span>';
                    } else {
                        val = escHtml( String( val ) );
                        val = val.replace(
                            /(http:\/\/[^\s&lt;,;'"]+)/g,
                            '<span style="background:#fef0f0;color:#c3372b;padding:1px 3px;border-radius:2px">$1</span>'
                        );
                    }
                    html += '<td>' + val + '</td>';
                } );
                html += '</tr>';
            } );

            html += '</tbody></table>';
            results.innerHTML = html;
        } )
        .catch( function( e ) {
            runBtn.disabled    = false;
            status.textContent = '✗ Network error';
            status.style.color = '#c3372b';
            results.innerHTML  = '<div style="color:#c3372b;padding:12px">' + escHtml( e.message ) + '</div>';
        } );
    }

    runBtn.addEventListener( 'click', run );

    clearBtn.addEventListener( 'click', function() {
        input.value        = '';
        results.innerHTML  = '<div style="text-align:center;color:#999;padding:40px 0">Run a query to see results here</div>';
        status.textContent = '';
        meta.textContent   = '';
        input.focus();
    } );

    // Enter (plain) or Ctrl+Enter both run the query; Shift+Enter inserts a newline
    input.addEventListener( 'keydown', function( e ) {
        if ( e.key === 'Enter' && ! e.shiftKey ) {
            e.preventDefault();
            run();
        }
    } );

    document.querySelectorAll( '.cs-sql-quick' ).forEach( function( btn ) {
        btn.addEventListener( 'click', function() {
            input.value = this.getAttribute( 'data-sql' );
            run();
        } );
    } );

    // ── HTTP → HTTPS fix buttons ───────────────────────────────────────────
    function runHttpFix( dryRun ) {
        var dryBtn    = document.getElementById( 'cs-http-fix-dry' );
        var fixBtn    = document.getElementById( 'cs-http-fix-run' );
        var statusEl  = document.getElementById( 'cs-http-fix-status' );
        var outputEl  = document.getElementById( 'cs-http-fix-output' );
        if ( ! dryBtn || ! fixBtn ) { return; }

        dryBtn.disabled = fixBtn.disabled = true;
        statusEl.textContent = dryRun ? 'Running dry run…' : 'Running fix…';
        outputEl.style.display = 'none';

        var fd = new FormData();
        fd.append( 'action',   'csdt_sql_http_fix' );
        fd.append( 'nonce',    csdtDevtoolsSqlEditor.nonce );
        fd.append( 'dry_run',  dryRun ? '1' : '0' );

        fetch( ajaxurl, { method: 'POST', body: fd } )
            .then( function( r ) { return r.json(); } )
            .then( function( resp ) {
                dryBtn.disabled = fixBtn.disabled = false;
                if ( resp.success ) {
                    statusEl.textContent = dryRun ? '✓ Dry run complete' : '✓ Fix complete';
                    outputEl.textContent = resp.data.output || '(no output)';
                    outputEl.style.display = '';
                } else {
                    statusEl.textContent = '✗ ' + ( resp.data || 'Error' );
                }
            } )
            .catch( function() {
                dryBtn.disabled = fixBtn.disabled = false;
                statusEl.textContent = 'Request failed.';
            } );
    }

    var dryBtn = document.getElementById( 'cs-http-fix-dry' );
    var fixBtn = document.getElementById( 'cs-http-fix-run' );
    if ( dryBtn ) { dryBtn.addEventListener( 'click', function() { runHttpFix( true ); } ); }
    if ( fixBtn ) {
        fixBtn.addEventListener( 'click', function() {
            if ( confirm( 'This will replace ALL http:// references with https:// in the database. Are you sure?' ) ) {
                runHttpFix( false );
            }
        } );
    }
} )();
