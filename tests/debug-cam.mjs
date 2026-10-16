import { spawn } from 'node:child_process';

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
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('CONSOLE:', msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' '));
    }
  };

  await sendCmd('Runtime.enable');
  await sendCmd('Page.enable');

  console.log('Waiting for initCircuitRacer to complete...');
  for (let i = 0; i < 40; i++) {
    const isReady = await sendCmd('Runtime.evaluate', {
      expression: 'typeof window.__debugCamera === "function"',
      returnByValue: true
    });
    if (isReady?.result?.value) {
      console.log('window.__debugCamera is ready!');
      break;
    }
    await new Promise(r => setTimeout(r, 200));
  }

  // Pre-race debug info
  let debugInfo = await sendCmd('Runtime.evaluate', {
    expression: 'window.__debugCamera()',
    returnByValue: true
  });
  console.log('PRE-RACE CAMERA:', debugInfo?.result?.value);

  // Click start race
  await sendCmd('Runtime.evaluate', { expression: `document.getElementById('btn-start-race').click();` });
  await new Promise(r => setTimeout(r, 2500));

  // During-race debug info
  debugInfo = await sendCmd('Runtime.evaluate', {
    expression: 'window.__debugCamera()',
    returnByValue: true
  });
  console.log('DURING-RACE CAMERA:', debugInfo?.result?.value);

  ws.close();
} catch (e) {
  console.error('Error:', e);
} finally {
  chromeProc.kill();
}
