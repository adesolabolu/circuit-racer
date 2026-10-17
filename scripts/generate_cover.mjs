import http from 'node:http';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 4173;
const DIST_DIR = path.resolve('dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.wav': 'audio/wav',
  '.wasm': 'application/wasm',
};

// 1. Simple static HTTP server for dist
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0].split('#')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.join(DIST_DIR, reqPath);
  if (!fsSync.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';

  const stream = fsSync.createReadStream(filePath);
  res.writeHead(200, { 'Content-Type': mime });
  stream.pipe(res);
});

await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
console.log(`Preview server running at http://127.0.0.1:${PORT}`);

// 2. Launch headless Chrome at 1600x1000 (16:10 aspect ratio)
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const USER_DATA = "C:\\Users\\HomePC\\AppData\\Local\\Temp\\chrome_cover_" + Date.now();

const chromeProc = spawn(CHROME_PATH, [
  '--headless=new',
  '--remote-debugging-port=9223',
  `--user-data-dir=${USER_DATA}`,
  '--window-size=1600,1000',
  '--disable-gpu',
  '--no-first-run',
  `http://127.0.0.1:${PORT}/`
], { stdio: 'ignore' });

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9223/json');
      const data = await res.json();
      const page = data.find((d) => d.type === 'page' && d.url.includes(String(PORT)));
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
  }
  throw new Error('Chrome did not respond on debug port');
}

try {
  const wsUrl = await getWsUrl();
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => (ws.onopen = r));

  let id = 1;
  const callbacks = new Map();

  function sendCmd(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      callbacks.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      callbacks.get(msg.id)(msg.result);
      callbacks.delete(msg.id);
    }
  };

  await sendCmd('Runtime.enable');
  await sendCmd('Page.enable');

  // Wait 4 seconds for full 3D diorama and title UI to render
  console.log('Waiting for full 3D diorama render at 1600x1000...');
  await new Promise((r) => setTimeout(r, 4000));

  console.log('Capturing 16:10 cover screenshot...');
  const screenshot = await sendCmd('Page.captureScreenshot', { format: 'png' });
  if (screenshot && screenshot.data) {
    const buffer = Buffer.from(screenshot.data, 'base64');
    await fs.writeFile('cover.png', buffer);
    await fs.writeFile('public/cover.png', buffer);
    await fs.writeFile('dist/cover.png', buffer);
    console.log(`Saved 16:10 cover.png (${buffer.length} bytes) to root, public/ and dist/`);
  }

  ws.close();
} catch (e) {
  console.error('Error generating cover.png:', e);
} finally {
  chromeProc.kill();
  server.close();
}
