'use strict';
const helpLib = require('REPO_BASE/shared-help-docs/help-lib.js');

helpLib.run({
    baseUrl:    process.env.WP_BASE_URL,
    cookies:    process.env.WP_COOKIES,
    restUser:   process.env.WP_REST_USER,
    restPass:   process.env.WP_REST_PASS,
    docsDir:    process.env.WP_DOCS_DIR,

    pluginName: 'CloudScale Code Block',
    pluginDesc: 'Syntax highlighted code blocks with auto language detection, clipboard copy, dark/light mode toggle, a code block migrator from other plugins, and a read-only SQL query tool. Works as a Gutenberg block and as a [cs_code] shortcode.',
    pageTitle:  'Help & Documentation — Code Block',
    pageSlug:   'code-block-help',
    adminUrl:   `${process.env.WP_BASE_URL}/wp-admin/tools.php?page=cloudscale-code-sql`,

    sections: [
        { id: 'code-block',  label: 'Code Block Overview',  file: 'panel-code-block.png'  },
        { id: 'sql-tool',    label: 'SQL Query Tool',        file: 'panel-sql-tool.png'    },
        { id: 'migrator',    label: 'Code Block Migrator',   file: 'panel-migrator.png'    },
    ],

    docs: {
        'code-block': `
<p>The <strong>CloudScale Code Block</strong> is a Gutenberg block and shortcode for displaying syntax-highlighted code in your posts and pages.</p>
<ul>
<li><strong>Auto language detection</strong> — the plugin detects the programming language from the code content and applies appropriate syntax highlighting automatically.</li>
<li><strong>Manual language selection</strong> — override the auto-detected language from the block toolbar dropdown.</li>
<li><strong>Copy to clipboard</strong> — a copy button appears on hover, letting readers copy the full code snippet with one click.</li>
<li><strong>Dark / Light mode toggle</strong> — readers can switch the code block theme between dark and light to match their preference. The setting is remembered via localStorage.</li>
<li><strong>Line numbers</strong> — optionally display line numbers alongside the code.</li>
<li><strong>Shortcode usage:</strong> <code>[cs_code lang="php"]your code here[/cs_code]</code></li>
</ul>`,

        'sql-tool': `
<p>The <strong>SQL Query Tool</strong> lets you run read-only SQL SELECT queries against your WordPress database directly from the admin — without needing phpMyAdmin or SSH access.</p>
<ul>
<li>Only <code>SELECT</code> statements are allowed — the tool blocks any query that could modify data (<code>INSERT</code>, <code>UPDATE</code>, <code>DELETE</code>, <code>DROP</code>, etc.).</li>
<li>Results are displayed in a formatted table with column headers.</li>
<li>Row count and query execution time are shown below the results.</li>
<li>Useful for quick data lookups, verifying plugin data, and debugging without leaving WordPress admin.</li>
</ul>
<p><strong>Note:</strong> this tool is only accessible to WordPress administrators.</p>`,

        'migrator': `
<p>The <strong>Code Block Migrator</strong> converts code blocks from other WordPress plugins (such as Crayon Syntax Highlighter, SyntaxHighlighter Evolved, and others) to CloudScale Code Blocks in one operation.</p>
<ul>
<li><strong>Scan</strong> — finds all posts and pages containing shortcodes or HTML from supported legacy plugins.</li>
<li><strong>Preview</strong> — shows what will be converted before making any changes.</li>
<li><strong>Convert</strong> — replaces the old shortcodes/HTML with <code>[cs_code]</code> shortcodes, preserving the code content and language attribute where possible.</li>
</ul>
<p>Always take a backup before running the migrator.</p>`,
    },
}).catch(err => { console.error('ERROR:', err.message); process.exit(1); });
