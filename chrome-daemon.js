const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseDir = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
const remoteProfile = path.join(baseDir, 'RemoteProfile');
const activePortFile = path.join(baseDir, 'DevToolsActivePort');

if (!fs.existsSync(remoteProfile)) {
    fs.mkdirSync(remoteProfile, { recursive: true });
}

console.log('Starting persistent Chrome on port 9222...');
const chrome = spawn(chromePath, [
    '--remote-debugging-port=9222',
    `--user-data-dir=${remoteProfile}`,
    '--no-first-run',
    '--no-default-browser-check',
    'http://127.0.0.1:3000/'
]);

chrome.on('exit', (code) => {
    console.log('Chrome exited with code:', code);
    process.exit(code || 0);
});

// Poll until port 9222 is listening, then write DevToolsActivePort
let connected = false;
const checkInterval = setInterval(() => {
    http.get('http://127.0.0.1:9222/json/version', (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(raw);
                const wsUrl = json.webSocketDebuggerUrl;
                const wsPath = wsUrl.replace('ws://127.0.0.1:9222', '');
                fs.writeFileSync(activePortFile, '9222\n' + wsPath, 'utf8');
                console.log('DevToolsActivePort written successfully:\n', fs.readFileSync(activePortFile, 'utf8'));
                connected = true;
                clearInterval(checkInterval);
            } catch (err) {
                console.error('Error parsing JSON version:', err);
            }
        });
    }).on('error', () => {
        // Still starting up, keep polling
    });
}, 500);
