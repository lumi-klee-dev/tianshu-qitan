const { spawn } = require('child_process');
const http = require('http');

async function run() {
  const chrome = spawn('google-chrome', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    'about:blank'
  ]);

  chrome.on('error', (err) => {
    console.error('Failed to start chrome:', err);
    process.exit(1);
  });

  // Wait for Chrome to be ready
  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      if (res.ok) {
        const data = await res.json();
        wsUrl = data.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!wsUrl) {
    console.error('Could not connect to Chrome debugging port');
    chrome.kill();
    process.exit(1);
  }

  console.log('Connected to Chrome via CDP');

  // Create a new tab
  const newTabRes = await fetch('http://127.0.0.1:9222/json/new', { method: 'PUT' });
  const tab = await newTabRes.json();
  const tabWs = new WebSocket(tab.webSocketDebuggerUrl);

  await new Promise(r => tabWs.onopen = r);

  let id = 1;
  const callbacks = {};
  const consoleMessages = [];
  const pageErrors = [];

  tabWs.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.id && callbacks[data.id]) {
      callbacks[data.id](data.result);
      delete callbacks[data.id];
    }
    if (data.method === 'Console.messageAdded') {
      consoleMessages.push(data.params.message);
    }
    if (data.method === 'Runtime.consoleAPICalled') {
      const text = data.params.args.map(a => a.value || a.description).join(' ');
      console.log(`[Browser Console ${data.params.type}]`, text);
      if (data.params.type === 'error') {
        pageErrors.push(text);
      }
    }
    if (data.method === 'Runtime.exceptionThrown') {
      const err = data.params.exceptionDetails;
      console.error('[Browser Exception]', err.text, err.exception ? err.exception.description : '');
      pageErrors.push(err.text);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const reqId = id++;
      callbacks[reqId] = resolve;
      tabWs.send(JSON.stringify({ id: reqId, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Console.enable');

  console.log('Navigating to index.html...');
  await send('Page.navigate', { url: 'file:///workspace/tianshu-agy-r11/index.html' });
  await new Promise(r => setTimeout(r, 1500));

  console.log('Testing Character Modal & Tabs...');
  // Open char modal
  await send('Runtime.evaluate', { expression: `document.getElementById('nav-char').click()` });
  await new Promise(r => setTimeout(r, 300));

  // Switch to 元神 tab
  await send('Runtime.evaluate', { expression: `
    const ysTab = Array.from(document.querySelectorAll('[data-ctab]')).find(e => e.textContent === '元神');
    if (ysTab) ysTab.click();
  ` });
  await new Promise(r => setTimeout(r, 300));

  // Click on 地灵 subtab
  await send('Runtime.evaluate', { expression: `
    const dlTab = Array.from(document.querySelectorAll('[data-ystab]')).find(e => e.textContent.includes('地灵'));
    if (dlTab) dlTab.click();
  ` });
  await new Promise(r => setTimeout(r, 300));

  // Try clicking an upgrade on 地灵
  await send('Runtime.evaluate', { expression: `
    const upBtn = document.querySelector('[data-dl-upgrade="xuan"]');
    if (upBtn) upBtn.click();
  ` });
  await new Promise(r => setTimeout(r, 300));

  // Click on 经脉 subtab
  await send('Runtime.evaluate', { expression: `
    const jmTab = Array.from(document.querySelectorAll('[data-ystab]')).find(e => e.textContent.includes('经脉'));
    if (jmTab) jmTab.click();
  ` });
  await new Promise(r => setTimeout(r, 300));

  // Switch meridians in 经脉
  await send('Runtime.evaluate', { expression: `
    const duTab = Array.from(document.querySelectorAll('[data-meridian-tab]')).find(e => e.textContent.includes('督脉'));
    if (duTab) duTab.click();
  ` });
  await new Promise(r => setTimeout(r, 300));

  // Test Pet Modal & Tabs
  console.log('Testing Pet Modal & Tabs...');
  await send('Runtime.evaluate', { expression: `
    document.querySelectorAll('[data-close]').forEach(c => c.click());
    document.getElementById('nav-pet').click();
  ` });
  await new Promise(r => setTimeout(r, 300));

  // Switch to 抗性 tab in pet modal
  await send('Runtime.evaluate', { expression: `
    const resTab = Array.from(document.querySelectorAll('[data-ptab]')).find(e => e.textContent === '抗性');
    if (resTab) resTab.click();
  ` });
  await new Promise(r => setTimeout(r, 300));

  // Switch to 图鉴 tab
  await send('Runtime.evaluate', { expression: `
    const codexTab = Array.from(document.querySelectorAll('[data-ptab]')).find(e => e.textContent === '图鉴');
    if (codexTab) codexTab.click();
  ` });
  await new Promise(r => setTimeout(r, 300));

  // Switch to 组合 tab
  await send('Runtime.evaluate', { expression: `
    const comboTab = Array.from(document.querySelectorAll('[data-ptab]')).find(e => e.textContent === '组合');
    if (comboTab) comboTab.click();
  ` });
  await new Promise(r => setTimeout(r, 300));

  // Test Rebirth Modal & Reset to 0 button
  console.log('Testing Rebirth Modal & Demo Reset...');
  await send('Runtime.evaluate', { expression: `
    document.querySelectorAll('[data-close]').forEach(c => c.click());
    document.getElementById('nav-rebirth').click();
  ` });
  await new Promise(r => setTimeout(r, 300));

  // Click ⚙ 演示：重置为未转
  await send('Runtime.evaluate', { expression: `
    const resetBtn = document.getElementById('rb-btn-demo-reset-rb');
    if (resetBtn) resetBtn.click();
  ` });
  await new Promise(r => setTimeout(r, 300));

  // Check state of hero after reset
  const checkHeroRes = await send('Runtime.evaluate', { expression: `
    JSON.stringify({
      rebirth: TSQ.UI.state.hero.rebirth,
      level: TSQ.UI.state.hero.level,
      alliance: TSQ.UI.state.hero.alliance
    })
  ` });
  const heroState = JSON.parse(checkHeroRes.result.value);
  console.log('Hero State after Reset to Unreborn:', heroState);

  tabWs.close();
  chrome.kill();

  if (pageErrors.length > 0) {
    console.error('FAILED: Browser encountered errors:', pageErrors);
    process.exit(1);
  } else {
    console.log('SUCCESS: All browser checks passed with 0 F12 errors!');
    process.exit(0);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

