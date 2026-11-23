/**
 * Automated Verification Script
 * Validates file structure, security, responsive meta tags, code rules, and HTTP endpoints.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✓ PASS: ${message}`);
        passed++;
    } else {
        console.error(`  ✗ FAIL: ${message}`);
        failed++;
    }
}

async function checkUrl(pathname) {
    return new Promise((resolve) => {
        http.get(`http://127.0.0.1:3000${pathname}`, (res) => {
            resolve(res.statusCode === 200);
        }).on('error', () => resolve(false));
    });
}

async function runTests() {
    console.log('\n======================================================');
    console.log('SMART COLLEGE COMPLAINT SYSTEM - AUTOMATED VERIFICATION');
    console.log('======================================================\n');

    // 1. FILE & DIRECTORY STRUCTURE
    console.log('1. ARCHITECTURE & CLEANUP AUDIT:');
    const copyFiles = fs.readdirSync(ROOT).filter(f => f.includes(' - Copy'));
    assert(copyFiles.length === 0, `No "- Copy" files exist in workspace (Found: ${copyFiles.length})`);

    const javaInRoot = fs.readdirSync(ROOT).filter(f => f.endsWith('.java'));
    assert(javaInRoot.length === 0, `No Java files in root workspace (Found: ${javaInRoot.length})`);

    assert(fs.existsSync(path.join(ROOT, 'legacy-java', 'README.md')), 'legacy-java/README.md exists');
    const legacyReadme = fs.readFileSync(path.join(ROOT, 'legacy-java', 'README.md'), 'utf8');
    assert(legacyReadme.includes('PASSWORD') && legacyReadme.includes('Laxmi@123'), 'legacy-java/README.md warns regarding rotating exposed database password');

    const actualFiles = fs.readdirSync(ROOT);
    assert(actualFiles.includes('signup.html'), 'signup.html exists with correct lowercase casing');
    assert(!actualFiles.includes('Signup.html'), 'Legacy Signup.html (uppercase) removed/renamed');

    assert(fs.existsSync(path.join(ROOT, 'firestore.rules')), 'firestore.rules exists');
    assert(fs.existsSync(path.join(ROOT, 'storage.rules')), 'storage.rules exists');

    // 2. HTTP SERVER AVAILABILITY
    console.log('\n2. HTTP SERVER ENDPOINTS:');
    const pages = [
        '/index.html',
        '/signup.html',
        '/authority-login.html',
        '/dashboard.html',
        '/complaint.html',
        '/authority-dashboard.html',
        '/admin-dashboard.html',
        '/notifications.html',
        '/seed.html',
        '/style.css',
        '/js/firebase-config.js',
        '/js/auth.js',
        '/js/utils.js'
    ];

    for (const page of pages) {
        const ok = await checkUrl(page);
        assert(ok, `Endpoint ${page} responds with HTTP 200 OK`);
    }

    // 3. RESPONSIVE VIEWPORT & ACCESSIBILITY AUDIT
    console.log('\n3. VIEWPORT META & ACCESSIBILITY AUDIT:');
    const htmlFiles = [
        'index.html',
        'signup.html',
        'authority-login.html',
        'dashboard.html',
        'complaint.html',
        'authority-dashboard.html',
        'admin-dashboard.html',
        'notifications.html',
        'seed.html'
    ];

    for (const f of htmlFiles) {
        const content = fs.readFileSync(path.join(ROOT, f), 'utf8');
        assert(content.includes('<meta name="viewport" content="width=device-width, initial-scale=1.0">'), `${f} contains responsive viewport meta tag`);
    }

    // 4. CODE QUALITY & BUG AUDIT
    console.log('\n4. FUNCTIONAL BUGS & DEAD CODE AUDIT:');
    for (const f of htmlFiles) {
        const content = fs.readFileSync(path.join(ROOT, f), 'utf8');
        // No prompt() or confirm()
        assert(!content.includes('prompt('), `${f} has NO native prompt() calls`);
    }

    const notifContent = fs.readFileSync(path.join(ROOT, 'notifications.html'), 'utf8');
    assert(!notifContent.includes('.reverse()'), 'notifications.html does NOT mutate array with .reverse()');
    const backBtnMatches = notifContent.match(/class=["'][^"']*btn-back[^"']*["']/g) || [];
    assert(backBtnMatches.length === 1, `notifications.html has exactly ONE Back button (Found: ${backBtnMatches.length})`);

    // 5. SECURITY & XSS SANITIZATION AUDIT
    console.log('\n5. SECURITY & XSS SANITIZATION AUDIT:');
    const utilsContent = fs.readFileSync(path.join(ROOT, 'js', 'utils.js'), 'utf8');
    assert(utilsContent.includes('export function escapeHTML'), 'js/utils.js exports escapeHTML function');

    // Category mapping test
    const mapStr = utilsContent.substring(utilsContent.indexOf('CATEGORY_AUTHORITY_MAP'), utilsContent.indexOf('COMPLAINT_TYPES'));
    assert(mapStr.includes('"Hostel": "Warden"'), 'Category Hostel maps to Warden');
    assert(mapStr.includes('"Classroom": "TG"'), 'Category Classroom maps to TG');
    assert(mapStr.includes('"Faculty": "HOD"'), 'Category Faculty maps to HOD');
    assert(mapStr.includes('"Lab": "HOD"'), 'Category Lab maps to HOD');
    assert(mapStr.includes('"Academic": "HOD"'), 'Category Academic maps to HOD');
    assert(mapStr.includes('"Infrastructure": "HOD"'), 'Category Infrastructure maps to HOD');
    assert(mapStr.includes('"Safety": "Dean"'), 'Category Safety maps to Dean');
    assert(mapStr.includes('"Library": "Admin"'), 'Category Library maps to Admin');
    assert(mapStr.includes('"WiFi": "Admin"'), 'Category WiFi maps to Admin');
    assert(mapStr.includes('"Canteen": "Admin"'), 'Category Canteen maps to Admin');
    assert(mapStr.includes('"Transport": "Admin"'), 'Category Transport maps to Admin');
    assert(mapStr.includes('"Other": "Admin"'), 'Category Other maps to Admin');

    // 6. CSS AUDIT
    console.log('\n6. CSS & DESIGN SYSTEM AUDIT:');
    const cssContent = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
    assert(cssContent.includes('background-size: cover'), 'style.css uses background-size: cover for oct.png');
    assert(!cssContent.includes('!important'), 'style.css avoids unnecessary !important overrides');
    assert(cssContent.includes('@media (max-width: 640px)'), 'style.css includes responsive mobile media queries');

    console.log('\n======================================================');
    console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('======================================================\n');

    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
