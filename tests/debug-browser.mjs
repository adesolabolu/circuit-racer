import { spawn } from 'node:child_process';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const USER_DATA = "C:\\Users\\HomePC\\AppData\\Local\\Temp\\chrome_debug_" + Date.now();

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
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('[BROWSER CONSOLE]', msg.params.type, msg.params.args.map(a => a.value || a.description));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails);
    }
  };

  await sendCmd('Runtime.enable');
  await sendCmd('Page.enable');

  await new Promise(r => setTimeout(r, 4000));

  const docState = await sendCmd('Runtime.evaluate', {
    expression: `({
      url: window.location.href,
      readyState: document.readyState,
      titleOverlay: Boolean(document.getElementById('title-screen-overlay')),
      hudRoot: Boolean(document.getElementById('hud-root')),
      canvasContainerChildren: document.getElementById('canvas-container')?.children?.length,
    })`,
    returnByValue: true,
  });
  console.log('Doc state:', docState?.result?.value);

  ws.close();
} catch (e) {
  console.error('Error:', e);
} finally {
  chromeProc.kill();
}
