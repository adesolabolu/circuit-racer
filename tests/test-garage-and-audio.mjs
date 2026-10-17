import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const USER_DATA = "C:\\Users\\HomePC\\AppData\\Local\\Temp\\chrome_test_garage_" + Date.now();

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
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('BROWSER EXCEPTION:', JSON.stringify(msg.params.exceptionDetails, null, 2));
    }
  };

  await sendCmd('Runtime.enable');
  await sendCmd('Page.enable');

  // Wait 3 seconds for Three.js & Rapier to load
  console.log('Waiting for game scene to mount...');
  await new Promise(r => setTimeout(r, 3000));

  // 1. Open Garage
  console.log('Clicking GARAGE button on TitleScreen...');
  await sendCmd('Runtime.evaluate', {
    expression: `document.getElementById('btn-open-garage').click();`
  });

  await new Promise(r => setTimeout(r, 800));

  // Verify Garage is visible
  const garageState = await sendCmd('Runtime.evaluate', {
    expression: `({
      modalPresent: Boolean(document.getElementById('garage-modal-root')),
      chassisCards: document.querySelectorAll('.chassis-card').length,
      coins: document.getElementById('garage-coins')?.textContent,
    })`,
    returnByValue: true,
  });
  console.log('Garage Modal status:', garageState?.result?.value);

  // Take Garage screenshot
  const garageShot = await sendCmd('Page.captureScreenshot', { format: 'png' });
  if (garageShot?.data) {
    await fs.writeFile('tests/garage_screenshot.png', Buffer.from(garageShot.data, 'base64'));
    console.log('Saved tests/garage_screenshot.png');
  }

  // 2. Select Underglow & Performance tab
  console.log('Switching to Performance & LEDs tab...');
  await sendCmd('Runtime.evaluate', {
    expression: `document.getElementById('tab-upgrades').click();`
  });
  await new Promise(r => setTimeout(r, 500));

  // Click Pink underglow
  console.log('Selecting Cyber Pink underglow...');
  await sendCmd('Runtime.evaluate', {
    expression: `document.querySelector('.underglow-swatch[data-color="#ff007f"]')?.click();`
  });
  await new Promise(r => setTimeout(r, 300));

  // Click Core Motor KV Upgrade
  console.log('Buying Motor KV upgrade...');
  await sendCmd('Runtime.evaluate', {
    expression: `document.querySelector('.btn-upgrade[data-upgrade="motorKv"]')?.click();`
  });
  await new Promise(r => setTimeout(r, 500));

  const afterUpgradeState = await sendCmd('Runtime.evaluate', {
    expression: `({
      coins: document.getElementById('garage-coins')?.textContent,
      motorLvl: document.querySelector('.upgrade-card .upgrade-level-num')?.textContent,
    })`,
    returnByValue: true,
  });
  console.log('After upgrade status:', afterUpgradeState?.result?.value);

  // 3. Close Garage cleanly (No freeze!)
  console.log('Closing Garage with BACK TO WORKBENCH button...');
  await sendCmd('Runtime.evaluate', {
    expression: `document.getElementById('btn-garage-close').click();`
  });
  await new Promise(r => setTimeout(r, 600));

  const afterCloseState = await sendCmd('Runtime.evaluate', {
    expression: `({
      garageClosed: !document.getElementById('garage-modal-root'),
      titlePresent: Boolean(document.getElementById('title-screen-overlay')),
      titleCoins: document.getElementById('title-coin-count')?.textContent,
    })`,
    returnByValue: true,
  });
  console.log('After Garage close status (Clean return to Title):', afterCloseState?.result?.value);

  // 4. Start Race and Verify Driving Audio & Music
  console.log('Starting race from Title Screen...');
  await sendCmd('Runtime.evaluate', {
    expression: `document.getElementById('btn-start-race').click();`
  });

  // Wait 2.5 seconds for countdown to finish
  await new Promise(r => setTimeout(r, 2600));

  // Accelerate with W
  console.log('Holding W key to accelerate...');
  await sendCmd('Runtime.evaluate', {
    expression: `window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w' }));`
  });

  await new Promise(r => setTimeout(r, 3000));

  // Check HUD telemetry & audio diagnostic
  const racingState = await sendCmd('Runtime.evaluate', {
    expression: `({
      speedKmh: document.getElementById('hud-speed-val')?.textContent,
      timer: document.getElementById('hud-timer-val')?.textContent,
      coins: document.getElementById('hud-coins-val')?.textContent,
      camDebug: window.__debugCamera ? window.__debugCamera() : null,
    })`,
    returnByValue: true,
  });
  console.log('Racing Telemetry status:', racingState?.result?.value);

  const raceShot = await sendCmd('Page.captureScreenshot', { format: 'png' });
  if (raceShot?.data) {
    await fs.writeFile('tests/driving_after_garage_screenshot.png', Buffer.from(raceShot.data, 'base64'));
    console.log('Saved tests/driving_after_garage_screenshot.png');
  }

  ws.close();
} catch (e) {
  console.error('Test execution error:', e);
} finally {
  chromeProc.kill();
}
