import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const USER_DATA = "C:\\Users\\HomePC\\AppData\\Local\\Temp\\chrome_modal_" + Date.now();

const chromeProc = spawn(CHROME_PATH, [
  '--headless=new',
  '--remote-debugging-port=9223',
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
      const res = await fetch('http://127.0.0.1:9223/json');
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
    const data = JSON.parse(event.data);
    if (data.id && callbacks.has(data.id)) {
      callbacks.get(data.id)(data.result);
      callbacks.delete(data.id);
    }
  };

  // Wait 1.5s for page load
  await new Promise(r => setTimeout(r, 1500));

  // Trigger ResultsModal in page
  console.log('Rendering ResultsModal in page...');
  await sendCmd('Runtime.evaluate', {
    expression: `
      import('/src/ui/ResultsModal.js').then(m => {
        m.createResultsModal({
          totalTime: 94.25,
          bestLap: 29.80,
          chipsCollected: 8,
          chipsBonus: 80,
          completionBonus: 50,
          cleanRunBonus: 100,
          totalEarned: 230,
          walletBalance: 480,
          scoreResult: { rank: 3, best: 2460, improved: true },
          onRaceAgain: () => console.log('Race again clicked'),
          onGarage: () => console.log('Garage clicked'),
          onMainMenu: () => console.log('Main menu clicked'),
        });
      });
    `,
    awaitPromise: true,
  });

  await new Promise(r => setTimeout(r, 600));

  const screenshot = await sendCmd('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile('tests/results_screenshot.png', Buffer.from(screenshot.data, 'base64'));
  console.log('RESULTS MODAL SCREENSHOT SAVED to tests/results_screenshot.png');

  ws.close();
} catch (err) {
  console.error('Error during modal test:', err);
} finally {
  chromeProc.kill();
  try {
    await fs.rm(USER_DATA, { recursive: true, force: true });
  } catch {}
}
