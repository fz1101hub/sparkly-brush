const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
let origin = process.env.BRUSHLINGS_TEST_URL || 'http://127.0.0.1:8081';
let activeServer;
let activeBrowser;
const themes = [['adventure', 'Avventura'], ['arcade', 'Arcade'], ['cosmos', 'Cosmo'], ['garden', 'Giardino'], ['bubbles', 'Bolle'], ['underwater', 'Sottomarino']];
const out = path.resolve(process.env.BRUSHLINGS_TEST_ARTIFACTS || 'test-results/themes');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(out + '/result.json', JSON.stringify({ status: 'running' }));

async function contrastIssues(page) {
  return page.evaluate(() => {
    const parse = s => (s.match(/[\d.]+/g) || []).map(Number);
    const mix = (a, b) => a.slice(0, 3).map((v, i) => v * (a[3] ?? 1) + b[i] * (1 - (a[3] ?? 1)));
    const lum = c => { const x = c.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return x[0] * .2126 + x[1] * .7152 + x[2] * .0722; };
    const result = [];
    for (const el of document.querySelectorAll('div,span,button,a')) {
      const text = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
      if (!/[A-Za-zÀ-ÿ0-9]/.test(text)) continue;
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || s.visibility === 'hidden' || s.fontFamily.includes('Material') || el.closest('[aria-disabled="true"]')) continue;
      let bg = [255,255,255], ancestors = [], node = el;
      while (node) { ancestors.push(node); node = node.parentElement; }
      for (const a of ancestors.reverse()) bg = mix(parse(getComputedStyle(a).backgroundColor), bg);
      const fg = mix(parse(s.color), bg), light = [lum(fg), lum(bg)].sort((a,b) => b-a), ratio = (light[0]+.05)/(light[1]+.05);
      const large = parseFloat(s.fontSize) >= 24 || (parseInt(s.fontWeight) >= 700 && parseFloat(s.fontSize) >= 18.66);
      if (ratio + .01 < (large ? 3 : 4.5)) result.push({text, ratio: +ratio.toFixed(2), color:s.color, background:bg});
    }
    return result;
  });
}

(async () => {
  if (process.env.BRUSHLINGS_TEST_BUILD_DIR) {
    const root = path.resolve(process.env.BRUSHLINGS_TEST_BUILD_DIR);
    activeServer = http.createServer(async (req,res) => {
      try {
        const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        let file = path.resolve(root, '.' + pathname);
        if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
        if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file,'index.html');
        if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
        const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.webp':'image/webp', '.png':'image/png', '.ttf':'font/ttf', '.ico':'image/x-icon' };
        res.setHeader('Content-Type',mime[path.extname(file)] || 'application/octet-stream');
        res.end(await fs.promises.readFile(file));
      } catch { res.writeHead(404).end(); }
    });
    await new Promise(resolve => activeServer.listen(0,'127.0.0.1',resolve));
    origin = 'http://127.0.0.1:' + activeServer.address().port;
  }
  const browser = activeBrowser = await chromium.launch({ executablePath: process.env.BRUSHLINGS_CHROMIUM_PATH || undefined, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce', timezoneId: 'Europe/Rome' });
  page.setDefaultTimeout(15000);
  const errors = [], failures = [], checked = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('requestfailed', request => errors.push(request.url() + ': ' + request.failure()?.errorText));
  // Exercise denied wake-lock permission consistently, including on developer browsers.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: {
      request: () => Promise.reject(new DOMException('Wake Lock permission request denied', 'NotAllowedError')),
    } });
  });
  await page.clock.install({ time: new Date('2026-10-15T08:00:00+02:00') });
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Scegli il tuo compagno', exact: true }).click();
  await page.getByText('Parti con Bloopi', { exact: true }).click();
  await page.getByRole('button', { name: 'Scegli il tema' }).waitFor();
  // Opening the hardware test screen creates its own validation journal; it is not game progress.
  const gameSnapshot = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('sparkly-brush.') && key !== 'sparkly-brush.hardware-validation.v1')));
  for (const [id, name] of themes) {
    await page.goto(origin + '/settings', { waitUntil: 'networkidle' });
    const choice = page.getByRole('radio', { name: new RegExp('^' + name + '\\.') });
    await choice.click();
    await page.waitForFunction(id => document.documentElement.dataset.theme === id, id);
    assert.equal(await choice.getAttribute('aria-checked'), 'true');
    if (id !== 'adventure') assert.equal(await page.evaluate(() => localStorage.getItem('brushlings.appearance.v1')), id);
    await page.goto(origin, { waitUntil: 'networkidle' });
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), id);
    assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('sparkly-brush.') && key !== 'sparkly-brush.hardware-validation.v1'))), gameSnapshot);
    const button = page.getByRole('button', { name: 'Inizia una sessione manuale di due minuti' });
    const box = await button.boundingBox();
    assert.ok(box && box.y >= 0 && box.y + box.height < 770, id + ': start button visible above tab bar');
    assert.equal(await page.evaluate(() => [...document.images].every(img => img.complete && img.naturalWidth > 0)), true, id + ': all images loaded');
    await page.screenshot({ path: out + '/home-' + id + '.png' });
    for (const route of ['/', '/collection', '/explore', '/history', '/device', '/parent', '/settings', '/habitat', '/missions', '/rewards', '/backup', '/hardware-test']) {
      if (route !== '/') await page.goto(origin + route, { waitUntil: 'networkidle' });
      const issues = await contrastIssues(page);
      if (issues.length) failures.push({ theme: id, route, issues });
      checked.push(id + route);
    }
    console.log('Verified theme, persistence, progress isolation and routes:', name);
  }
  fs.writeFileSync(out + '/contrast.json', JSON.stringify(failures, null, 2));
  console.log('Contrast checks:', failures.length ? failures.length + ' screens need fixes (see contrast.json)' : 'PASS');
  assert.equal(failures.length, 0, 'Text contrast issues must be fixed before session verification');

  // A failed local write must leave both the visible and persisted theme unchanged.
  await page.goto(origin + '/settings', { waitUntil: 'networkidle' });
  await page.evaluate(() => { window.__setItem = Storage.prototype.setItem; Storage.prototype.setItem = function(k,v) { if (k === 'brushlings.appearance.v1') throw Error('Simulated full storage'); return window.__setItem.call(this,k,v); }; });
  await page.getByRole('radio', { name: /^Arcade\./ }).click();
  await page.getByText(/Non riesco a salvare il tema/).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'underwater');
  assert.equal(await page.evaluate(() => localStorage.getItem('brushlings.appearance.v1')), 'underwater');
  await page.evaluate(() => { Storage.prototype.setItem = window.__setItem; });

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Inizia una sessione manuale di due minuti' }).click();
  await page.getByRole('button', { name: 'Termina sessione' }).waitFor();
  await page.clock.fastForward(31000);
  await page.getByText('Alto a sinistra', { exact: true }).waitFor();
  await page.screenshot({ path: out + '/session-underwater.png' });
  // Profile changes are blocked while a timer is running, including via settings.
  await page.getByRole('button', { name: /^Profilo attivo:/ }).click();
  await page.getByText('Termina e salva la sessione prima di cambiare profilo.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('textbox', { name: 'Nome del nuovo profilo' }).isEditable(), false);
  await page.getByRole('button', { name: 'Torna indietro', exact: true }).click();
  await page.getByRole('button', { name: 'Metti in pausa', exact: true }).click();
  await page.getByText('La tua sessione ti aspetta', { exact: true }).waitFor();
  const checkpoint = await page.evaluate(() => JSON.parse(localStorage.getItem('sparkly-brush.manual-session.v1')));
  assert.ok(checkpoint.elapsedSeconds >= 31 && checkpoint.elapsedSeconds < 45, 'Pause must preserve actual brushing time');
  await page.clock.fastForward(120000);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Riprendi sessione', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('sparkly-brush.manual-session.v1')).elapsedSeconds), checkpoint.elapsedSeconds);
  await page.screenshot({ path: out + '/session-recovery.png' });
  await page.getByRole('button', { name: 'Riprendi sessione', exact: true }).click();
  await page.clock.fastForward((121 - checkpoint.elapsedSeconds) * 1000);
  await page.getByText('Fantastico lavoro!', { exact: true }).waitFor();
  await page.clock.runFor(500);
  await page.screenshot({ path: out + '/result-underwater.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Fantastico!', exact: true }).click();
  const after = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('sparkly-brush.') && key !== 'sparkly-brush.hardware-validation.v1')));
  assert.notDeepEqual(after, gameSnapshot, 'Completed brushing must persist progress');
  await page.reload({ waitUntil: 'networkidle' });
  assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('sparkly-brush.') && key !== 'sparkly-brush.hardware-validation.v1'))), after);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'underwater');

  // Preference writes are durable and report failure without changing the selected value.
  await page.goto(origin + '/settings', { waitUntil: 'networkidle' });
  await page.getByRole('textbox', { name: 'Nome del profilo attivo' }).fill('Alex');
  await page.getByRole('button', { name: 'Salva nome', exact: true }).click();
  await page.getByRole('radio', { name: 'Alex · attivo', exact: true }).waitFor();
  await page.getByRole('switch', { name: 'Suoni', exact: true }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('sparkly-brush.preferences.v1')).soundsEnabled === false);
  await page.evaluate(() => { window.__setItem = Storage.prototype.setItem; Storage.prototype.setItem = function(k,v) { if (k === 'sparkly-brush.preferences.v1') throw Error('Simulated full storage'); return window.__setItem.call(this,k,v); }; });
  await page.getByRole('switch', { name: 'Musica', exact: true }).click();
  await page.getByText(/Non riesco a salvare la preferenza/).waitFor();
  assert.equal(await page.getByRole('switch', { name: 'Musica', exact: true }).getAttribute('aria-checked'), 'false');
  await page.evaluate(() => { Storage.prototype.setItem = window.__setItem; });
  const primaryProgress = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('sparkly-brush.') && key !== 'sparkly-brush.hardware-validation.v1')));

  await page.getByRole('textbox', { name: 'Nome del nuovo profilo' }).fill('Emma');
  await page.getByRole('button', { name: 'Crea profilo', exact: true }).click();
  await page.getByRole('button', { name: 'Parti con Bloopi', exact: true }).click();
  await page.getByRole('button', { name: /^Profilo attivo: Emma/ }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'adventure');
  assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('sparkly-brush.') && key !== 'sparkly-brush.hardware-validation.v1'))), primaryProgress);
  await page.getByRole('button', { name: /^Profilo attivo:/ }).click();
  assert.equal(await page.getByRole('switch', { name: 'Suoni', exact: true }).getAttribute('aria-checked'), 'true');
  await page.getByRole('radio', { name: /^Giardino\./ }).click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'garden');
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Inizia una sessione manuale di due minuti' }).click();
  await page.getByRole('button', { name: 'Termina sessione' }).waitFor();
  await page.clock.fastForward(121000);
  await page.getByText('Fantastico lavoro!', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Fantastico!', exact: true }).click();
  assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('sparkly-brush.') && key !== 'sparkly-brush.hardware-validation.v1'))), primaryProgress);
  const childProgress = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('brushlings.profile.'))));
  assert.ok(Object.keys(childProgress).length > 3, 'Child progress must have its own persisted records');
  await page.getByRole('button', { name: /^Profilo attivo:/ }).click();
  await page.getByRole('radio', { name: 'Alex', exact: true }).click();
  await page.getByRole('button', { name: /^Profilo attivo: Alex/ }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'underwater');
  assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('sparkly-brush.') && key !== 'sparkly-brush.hardware-validation.v1'))), primaryProgress);
  assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('brushlings.profile.')))), childProgress);
  await page.screenshot({ path: out + '/family-primary-restored.png' });

  await page.setViewportSize({ width: 320, height: 740 });
  assert.ok((await page.getByRole('button', { name: 'Inizia una sessione manuale di due minuti' }).boundingBox()).width > 0);
  await page.screenshot({ path: out + '/home-small.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  // Stress the web layout at twice the text size; native OS scaling is checked separately on devices.
  for (const route of ['/', '/settings', '/collection', '/parent']) {
    await page.goto(origin + route, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      for (const element of document.querySelectorAll('div,span,button,a,input')) {
        if (![...element.childNodes].some(node => node.nodeType === 3 && node.textContent.trim()) && element.tagName !== 'INPUT') continue;
        const style = getComputedStyle(element);
        if (style.fontFamily.includes('Material')) continue;
        element.style.fontSize = parseFloat(style.fontSize) * 2 + 'px';
        if (style.lineHeight !== 'normal') element.style.lineHeight = parseFloat(style.lineHeight) * 2 + 'px';
      }
    });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, route + ': enlarged text must not cause horizontal page overflow');
    await page.screenshot({ path: out + '/large-text-' + (route === '/' ? 'home' : route.slice(1)) + '.png', fullPage: true });
  }
  assert.deepEqual(errors, []);
  const report = { themes: 6, routes: checked.length, persistentSelection: true, gameIsolation: true, saveFailure: true, manualSession: true, progressAfterReload: true, recoveryAfterReload: true, activeProfileGuard: true, profileIsolation: true, preferenceFailure: true, enlargedText: true, smallScreen: true, reducedMotion: true, errors };
  fs.writeFileSync(out + '/result.json', JSON.stringify(report, null, 2));
  console.log('PASS', JSON.stringify(report));
  const gallery = await browser.newPage({ viewport: { width: 1500, height: 650 }, deviceScaleFactor: 1 });
  const cards = themes.map(([id,name]) => '<article><h2>' + name + '</h2><img src="data:image/png;base64,' + fs.readFileSync(out + '/home-' + id + '.png').toString('base64') + '" /></article>').join('');
  await gallery.setContent('<!doctype html><html lang="it"><meta charset="utf-8"><style>body{margin:0;padding:24px;background:#eff1f4;font-family:Arial,sans-serif;color:#17213c}h1{margin:0 0 8px;font-size:26px}p{margin:0 0 20px;color:#586478}main{display:grid;grid-template-columns:repeat(6,1fr);gap:18px}h2{font-size:17px;margin:0 0 10px}img{display:block;width:100%;border-radius:18px;box-shadow:0 4px 18px #17213c18}</style><h1>Brushlings · I sei temi ordinari</h1><p>Schermate reali dell’app · Home verificata su dispositivo mobile nel browser</p><main>' + cards + '</main></html>');
  await gallery.screenshot({ path: out + '/themes-overview.png', fullPage: true });
  await browser.close();
  activeServer?.close();
})().catch(async e => { console.error(e); fs.writeFileSync(out + '/result.json', JSON.stringify({ status: 'failed', message: e.message }, null, 2)); await activeBrowser?.close(); activeServer?.close(); process.exitCode = 1; });
