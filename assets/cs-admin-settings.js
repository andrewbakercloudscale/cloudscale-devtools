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
                if ( savedMsg ) {
                    savedMsg.textContent = resp.success ? '✅ Saved' : '❌ Error';
                    savedMsg.style.color = resp.success ? '' : '#e53e3e';
                    savedMsg.classList.add( 'visible' );
                    setTimeout( function() { savedMsg.classList.remove( 'visible' ); savedMsg.style.color = ''; }, 2500 );
                }
            } )
            .catch( function() {
                saveBtn.disabled    = false;
                saveBtn.textContent = '💾 Save Settings';
                if ( savedMsg ) {
                    savedMsg.textContent = '❌ Error';
                    savedMsg.style.color = '#e53e3e';
                    savedMsg.classList.add( 'visible' );
                    setTimeout( function() { savedMsg.classList.remove( 'visible' ); savedMsg.style.color = ''; }, 2500 );
                }
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

// Scroll the active tab into view after page load.
( function () {
    var bar    = document.getElementById( 'cs-tab-bar' );
    var active = bar && bar.querySelector( '.cs-tab.active' );
    if ( active ) { active.scrollIntoView( { block: 'nearest', inline: 'center' } ); }
} )();

// Modal open/close event delegation — handles data-cs-modal-open, data-cs-modal-close,
// data-cs-modal-backdrop (backdrop click), and data-cs-copy-from (clipboard copy).
( function () {
    'use strict';

    function handleModalAction( t, preventDefault ) {
        // Open modal
        var opener = t.closest( '[data-cs-modal-open]' );
        if ( opener ) {
            var m = document.getElementById( opener.dataset.csModalOpen );
            if ( m ) { m.style.display = 'flex'; if ( preventDefault ) { preventDefault(); } }
            return true;
        }

        // Close modal via button
        var closer = t.closest( '[data-cs-modal-close]' );
        if ( closer ) {
            var m = document.getElementById( closer.dataset.csModalClose );
            if ( m ) { m.style.display = 'none'; if ( preventDefault ) { preventDefault(); } }
            return true;
        }

        // Backdrop click — close when the backdrop element itself is clicked
        if ( t.dataset && t.dataset.csModalBackdrop === 'true' ) {
            t.style.display = 'none';
            if ( preventDefault ) { preventDefault(); }
            return true;
        }

        return false;
    }

    document.addEventListener( 'click', function ( e ) {
        if ( handleModalAction( e.target, null ) ) { return; }

        // Clipboard copy from a named element
        var copyBtn = e.target.closest( '[data-cs-copy-from]' );
        if ( copyBtn ) {
            var src = document.getElementById( copyBtn.dataset.csCopyFrom );
            if ( ! src ) { return; }
            var text = src.textContent;
            var orig = copyBtn.textContent;
            navigator.clipboard.writeText( text ).then( function () {
                copyBtn.textContent = 'Copied!';
                setTimeout( function () { copyBtn.textContent = orig; }, 2000 );
            } );
        }
    } );

    // iOS Safari: click events can be swallowed inside overflow:hidden containers.
    // Use touchend as a fallback, detecting taps vs scrolls via movement threshold.
    var touchStartX = 0, touchStartY = 0;
    document.addEventListener( 'touchstart', function ( e ) {
        touchStartX = e.changedTouches[ 0 ].clientX;
        touchStartY = e.changedTouches[ 0 ].clientY;
    }, { passive: true } );

    document.addEventListener( 'touchend', function ( e ) {
        var dx = Math.abs( e.changedTouches[ 0 ].clientX - touchStartX );
        var dy = Math.abs( e.changedTouches[ 0 ].clientY - touchStartY );
        if ( dx > 10 || dy > 10 ) { return; } // scroll, not a tap
        handleModalAction( e.target, function () { e.preventDefault(); } );
    }, { passive: false } );

} )();
