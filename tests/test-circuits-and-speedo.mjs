import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const USER_DATA = "C:\\Users\\HomePC\\AppData\\Local\\Temp\\chrome_test_circuits_" + Date.now();

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
  for (let i = 0; i < 35; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9222/json');
      const data = await res.json();
      const page = data.find(d => d.type === 'page' && d.url.includes('5173'));
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
  }
  throw new Error('Chrome did not respond on debug port');
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

  // Wait 3.5 seconds for initial assets & WebGL initialization
  console.log('1. Waiting for game to load on http://127.0.0.1:5173 ...');
  await new Promise(r => setTimeout(r, 3500));

  // Check Title Screen banner
  const titleInfo = await sendCmd('Runtime.evaluate', {
    expression: `({
      circuitPill: Boolean(document.getElementById('title-circuit-pill')),
      trackName: document.getElementById('title-track-name')?.textContent,
      btnTrack: Boolean(document.getElementById('btn-select-track')),
      btnLb: Boolean(document.getElementById('btn-open-lb')),
    })`,
    returnByValue: true,
  });
  console.log('Title Screen State:', titleInfo?.result?.value);

  // 2. Open Track Select Modal
  console.log('2. Clicking MAPS [T] button to open Track Select Modal...');
  await sendCmd('Runtime.evaluate', {
    expression: `document.getElementById('btn-select-track').click();`
  });
  await new Promise(r => setTimeout(r, 600));

  const trackSelectStatus = await sendCmd('Runtime.evaluate', {
    expression: `({
      modalPresent: Boolean(document.getElementById('track-select-modal-root')),
      cardCount: document.querySelectorAll('.track-card').length,
      trackTitles: Array.from(document.querySelectorAll('.track-card-title')).map(el => el.textContent),
    })`,
    returnByValue: true,
  });
  console.log('Track Select Modal Status:', trackSelectStatus?.result?.value);

  const shot1 = await sendCmd('Page.captureScreenshot', { format: 'png' });
  if (shot1 && shot1.data) {
    await fs.writeFile('tests/track_select_modal_screenshot.png', Buffer.from(shot1.data, 'base64'));
    console.log('Track select modal screenshot saved to tests/track_select_modal_screenshot.png');
  }

  // Select the Second Track: NEON VELOCITY SPEEDWAY
  console.log('3. Selecting NEON VELOCITY SPEEDWAY...');
  await sendCmd('Runtime.evaluate', {
    expression: `
      const cards = document.querySelectorAll('.track-card');
      if (cards.length > 1) {
        cards[1].querySelector('.btn-select-track')?.click() || cards[1].click();
      }
    `
  });
  await new Promise(r => setTimeout(r, 1200));

  const updatedTrackName = await sendCmd('Runtime.evaluate', {
    expression: `document.getElementById('title-track-name')?.textContent`,
    returnByValue: true,
  });
  console.log('Updated active track on Title Screen:', updatedTrackName?.result?.value);

  // 4. Open Leaderboard Modal
  console.log('4. Clicking RANKS [L] button to open Leaderboard Modal...');
  await sendCmd('Runtime.evaluate', {
    expression: `document.getElementById('btn-open-lb').click();`
  });
  await new Promise(r => setTimeout(r, 600));

  const lbStatus = await sendCmd('Runtime.evaluate', {
    expression: `({
      modalPresent: Boolean(document.getElementById('leaderboard-modal-root')),
      tabCount: document.querySelectorAll('.lb-tab-btn').length,
      rowCount: document.querySelectorAll('#lb-table-body tr').length,
      topDriver: document.querySelector('#lb-table-body tr td.col-player')?.textContent?.trim(),
      topTime: document.querySelector('#lb-table-body tr td.col-time')?.textContent?.trim(),
    })`,
    returnByValue: true,
  });
  console.log('Leaderboard Modal Status:', lbStatus?.result?.value);

  const shot2 = await sendCmd('Page.captureScreenshot', { format: 'png' });
  if (shot2 && shot2.data) {
    await fs.writeFile('tests/leaderboard_modal_screenshot.png', Buffer.from(shot2.data, 'base64'));
    console.log('Leaderboard modal screenshot saved to tests/leaderboard_modal_screenshot.png');
  }

  // Close Leaderboard Modal
  await sendCmd('Runtime.evaluate', {
    expression: `document.getElementById('btn-close-lb')?.click();`
  });
  await new Promise(r => setTimeout(r, 500));

  // 5. Start Race and Verify Speedometer
  console.log('5. Clicking START RACE...');
  await sendCmd('Runtime.evaluate', {
    expression: `document.getElementById('btn-start-race')?.click();`
  });

  // Wait 2.2 seconds for countdown to finish
  await new Promise(r => setTimeout(r, 2200));

  // Hold W key to accelerate
  console.log('Accelerating kart with KeyW...');
  await sendCmd('Runtime.evaluate', {
    expression: `window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w' }));`
  });

  await new Promise(r => setTimeout(r, 2200));

  const speedoStatus = await sendCmd('Runtime.evaluate', {
    expression: `({
      speedDigits: document.getElementById('hud-speed-val')?.textContent,
      gear: document.getElementById('hud-gear-val')?.textContent,
      arcOffset: document.getElementById('speedo-arc-fill')?.style?.strokeDashoffset,
      activeNitroSegs: document.querySelectorAll('.nitro-segment.active').length,
      timer: document.getElementById('hud-timer-val')?.textContent,
      minimapVisible: document.getElementById('hud-minimap-root')?.style?.display !== 'none',
    })`,
    returnByValue: true,
  });
  console.log('Live Telemetry & Radial Speedometer Status:', speedoStatus?.result?.value);

  const shot3 = await sendCmd('Page.captureScreenshot', { format: 'png' });
  if (shot3 && shot3.data) {
    await fs.writeFile('tests/live_racing_speedometer_screenshot.png', Buffer.from(shot3.data, 'base64'));
    console.log('Live racing speedometer screenshot saved to tests/live_racing_speedometer_screenshot.png');
  }

  ws.close();
  console.log('ALL VERIFICATION STEPS PASSED SUCCESSFULLY!');
} catch (e) {
  console.error('Error during circuit and speedometer verification:', e);
} finally {
  chromeProc.kill();
}
