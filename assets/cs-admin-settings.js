/**
 * CloudScale Code Block - Admin Settings Save
 *
 * Handles the AJAX save for the Code Block Settings panel.
 * Depends on csdtDevtoolsAdminSettings (nonce) localised by PHP.
 */
( function() {
    'use strict';

    var saveBtn   = document.getElementById( 'cs-settings-save' );
    var selPair   = document.getElementById( 'cs-settings-pair' );
    var selTheme  = document.getElementById( 'cs-settings-theme' );
    var savedMsg  = document.getElementById( 'cs-settings-saved' );

    if ( ! saveBtn ) {
        return;
    }

    saveBtn.addEventListener( 'click', function() {
        saveBtn.disabled    = true;
        saveBtn.textContent = 'Saving...';

        var fd = new FormData();
        fd.append( 'action',     'csdt_devtools_save_theme_setting' );
        fd.append( 'nonce',      csdtDevtoolsAdminSettings.nonce );
        fd.append( 'theme',      selTheme.value );
        fd.append( 'theme_pair', selPair.value );

        fetch( ajaxurl, { method: 'POST', body: fd } )
            .then( function( r ) { return r.json(); } )
            .then( function( resp ) {
                saveBtn.disabled    = false;
                saveBtn.textContent = '💾 Save Settings';
                if ( resp.success ) {
                    savedMsg.classList.add( 'visible' );
                    setTimeout( function() { savedMsg.classList.remove( 'visible' ); }, 2000 );
                }
            } )
            .catch( function( e ) {
                saveBtn.disabled    = false;
                saveBtn.textContent = '💾 Save Settings';
                console.error( 'cs-code-block: settings save failed', e );
            } );
    } );
} )();

( function () {
    'use strict';

    var copyAllBtn = document.getElementById( 'cs-copy-all-btn' );
    if ( ! copyAllBtn ) { return; }

    function fallbackCopy( text ) {
        var ta = document.createElement( 'textarea' );
        ta.value = text;
        ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
        document.body.appendChild( ta );
        ta.select();
        try { document.execCommand( 'copy' ); } catch ( e ) {}
        document.body.removeChild( ta );
    }

    function resetBtn() {
        copyAllBtn.innerHTML = '&#128203; Copy All';
        copyAllBtn.classList.remove( 'copied' );
    }

    function markCopied() {
        copyAllBtn.textContent = 'Copied!';
        copyAllBtn.classList.add( 'copied' );
        setTimeout( resetBtn, 2000 );
    }

    copyAllBtn.addEventListener( 'click', function () {
        var active = document.querySelector( '.cs-tab-content.active' );
        var text   = active ? ( active.innerText || active.textContent || '' ) : '';
        text = text.replace( /\n{3,}/g, '\n\n' ).trim();

        if ( navigator.clipboard && navigator.clipboard.writeText ) {
            navigator.clipboard.writeText( text )
                .then( markCopied )
                .catch( function () { fallbackCopy( text ); markCopied(); } );
        } else {
            fallbackCopy( text );
            markCopied();
        }
    } );
} )();
