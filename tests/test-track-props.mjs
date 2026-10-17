import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const USER_DATA = "C:\\Users\\HomePC\\AppData\\Local\\Temp\\chrome_test_props_" + Date.now();

const chromeProc = spawn(CHROME_PATH, [
  '--headless=new',
  '--remote-debugging-port=9222',
  `--user-data-dir=${USER_DATA}`,
  '--window-size=1280,720',
  '--disable-gpu',
  '--no-first-run',
  'http://127.0.0.1:5173'
], { stdio: 'ignore' });

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9222/json');
      const data = await res.json();
      const page = data.find(d => d.type === 'page' && d.url.includes('5173'));
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
  }
  throw new Error('Chrome did not respond');
}

try {
  const wsUrl = await getWsUrl();
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.onopen = r);

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

  // Wait 3 seconds for Three.js & Rapier to load
  await new Promise(r => setTimeout(r, 3000));

  // Click START RACE
  console.log('Clicking START RACE button...');
  await sendCmd('Runtime.evaluate', {
    expression: `document.getElementById('btn-start-race').click();`
  });

  // Wait 2.5 seconds for countdown to finish and race to start
  await new Promise(r => setTimeout(r, 2500));

  // Hold W key to accelerate for 6 seconds into Sector 1 and approach the first Boost Pad
  await sendCmd('Runtime.evaluate', {
    expression: `
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w' }));
    `
  });

  await new Promise(r => setTimeout(r, 4500));

  const screenshot1 = await sendCmd('Page.captureScreenshot', { format: 'png' });
  if (screenshot1 && screenshot1.data) {
    await fs.writeFile('tests/track_sector1_screenshot.png', Buffer.from(screenshot1.data, 'base64'));
    console.log('Saved tests/track_sector1_screenshot.png');
  }

  // Drive another 6 seconds towards Sector 2 / 3
  await new Promise(r => setTimeout(r, 5500));

  const screenshot2 = await sendCmd('Page.captureScreenshot', { format: 'png' });
  if (screenshot2 && screenshot2.data) {
    await fs.writeFile('tests/track_sector2_screenshot.png', Buffer.from(screenshot2.data, 'base64'));
    console.log('Saved tests/track_sector2_screenshot.png');
  }

  ws.close();
} catch (e) {
  console.error('Error:', e);
} finally {
  chromeProc.kill();
}
