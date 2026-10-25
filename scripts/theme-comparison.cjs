// Puts the app's Home and session screenshots of each theme next to the approved boards
// (from PR #10). Run after the axe audit, which writes the screenshots. A passing audit is not a
// visual approval: this page makes the remaining differences visible to a person.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("@playwright/test");

const root = path.resolve(__dirname, "..");
const shots = path.resolve(process.env.THEME_SHOTS_DIR || path.join(root, "artifacts/playwright/themes"));
const themes = ["adventure", "arcade", "cosmos", "garden", "bubbles", "underwater"];
const sizes = { ac: [1536, 1024], def: [1774, 887], i: [1536, 1024] };
const style =
  "<style>body{margin:0;padding:24px;background:#eceef3;color:#13203c;font:15px Arial,sans-serif}h1{font-size:26px;margin:0 0 8px}h2{font-size:19px;margin:0 0 14px}p{line-height:1.5;margin:0 0 18px}main{display:grid;grid-template-columns:repeat(4,260px);gap:18px;align-items:start}.reference{position:relative;overflow:hidden;border-radius:16px}.reference img{position:absolute;max-width:none}img{display:block;width:260px;border-radius:16px}section{margin-bottom:34px}h3{font-size:14px;margin:0 0 10px}</style>";

async function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "assets/approved/references.json"), "utf8"));
  const sheets = {};
  for (const [key, board] of Object.entries(manifest.boards)) {
    const data = fs.readFileSync(path.join(root, "assets/approved", board.file));
    assert.equal(crypto.createHash("sha256").update(data).digest("hex"), board.sha256, "Approved board pixels must remain unchanged");
    // Copied next to the page once, instead of being embedded in every section.
    fs.mkdirSync(shots, { recursive: true });
    fs.copyFileSync(path.join(root, "assets/approved", board.file), path.join(shots, `board-${key}.png`));
    sheets[key] = `board-${key}.png`;
  }
  const sections = [];
  for (const id of themes) {
    const home = path.join(shots, `home-${id}.png`);
    const session = path.join(shots, `session-${id}.png`);
    if (!fs.existsSync(home) || !fs.existsSync(session)) continue;
    const reference = manifest.screens[id];
    const source = (kind) => {
      const [x, y, w, h] = reference[kind];
      const [sw, sh] = sizes[reference.board];
      const scale = 260 / w;
      return `<div class="reference" style="width:260px;height:${h * scale}px"><img alt="" src="${sheets[reference.board]}" style="left:-${x * scale}px;top:-${y * scale}px;width:${sw * scale}px;height:${sh * scale}px" /></div>`;
    };
    const actual = (file) => `<img alt="" src="${path.basename(file)}" />`;
    sections.push(
      `<section><h2>${reference.letter} · ${id}</h2><main><article><h3>Home · approvata</h3>${source("home")}</article><article><h3>Home · app</h3>${actual(home)}</article><article><h3>Sessione · approvata</h3>${source("session")}</article><article><h3>Sessione · app</h3>${actual(session)}</article></main></section>`,
    );
  }
  if (!sections.length) {
    console.log(`No theme screenshots in ${shots}: nothing to compare.`);
    return;
  }
  const html = `<!doctype html><html lang="it"><meta charset="utf-8">${style}<h1>Brushlings · originali approvati e app</h1><p>Livello, monete e tempo nell’app vengono dai dati reali, non dalle tavole.</p>${sections.join("")}</html>`;
  const page = path.join(shots, "approved-comparison.html");
  fs.writeFileSync(page, html);
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const review = await browser.newPage({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 1 });
  await review.goto(`file://${page}`);
  await review.evaluate(() => Promise.all([...document.images].map((image) => image.decode())));
  await review.screenshot({ path: path.join(shots, "approved-comparison.png"), fullPage: true });
  await browser.close();
  console.log(`Comparison of ${sections.length} themes written to ${shots}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
