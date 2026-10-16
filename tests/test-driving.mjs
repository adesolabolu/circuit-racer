import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const USER_DATA = "C:\\Users\\HomePC\\AppData\\Local\\Temp\\chrome_test_" + Date.now();

const chromeProc = spawn(CHROME_PATH, [
  '--headless=new',
  '--remote-debugging-port=9222',
  `--user-data-dir=${USER_DATA}`,
  '--window-size=1280,720',
  '--disable-gpu',
  '--no-first-run',
  'http://localhost:5173'
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
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('EXCEPTION:', JSON.stringify(msg.params.exceptionDetails, null, 2));
    }
  };

  await sendCmd('Runtime.enable');
  await sendCmd('Page.enable');

  // Wait 3 seconds for load
  await new Promise(r => setTimeout(r, 3000));

  // Click START RACE
  console.log('Clicking START RACE button...');
  await sendCmd('Runtime.evaluate', {
    expression: `document.getElementById('btn-start-race').click();`
  });

  // Wait 2.5 seconds for countdown to finish and race to start
  await new Promise(r => setTimeout(r, 2500));

  // Press W key to accelerate for 1.5 seconds
  await sendCmd('Runtime.evaluate', {
    expression: `
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w' }));
    `
  });

  await new Promise(r => setTimeout(r, 3500));

  const screenshot = await sendCmd('Page.captureScreenshot', { format: 'png' });
  if (screenshot && screenshot.data) {
    const buffer = Buffer.from(screenshot.data, 'base64');
    await fs.writeFile('tests/race_screenshot.png', buffer);
    console.log('RACE SCREENSHOT SAVED to tests/race_screenshot.png');
  }

  const hudStatus = await sendCmd('Runtime.evaluate', {
    expression: `({
      speed: document.getElementById('hud-speed-val')?.textContent,
      timer: document.getElementById('hud-timer-val')?.textContent,
      lap: document.getElementById('hud-lap-num')?.textContent,
      coins: document.getElementById('hud-coins-val')?.textContent,
    })`,
    returnByValue: true,
  });
  console.log('HUD STATUS DURING RACE:', hudStatus?.result?.value);

  ws.close();
} catch (e) {
  console.error('Error:', e);
} finally {
  chromeProc.kill();
}
