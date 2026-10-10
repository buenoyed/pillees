import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const BASE = process.env.SITE ?? "http://127.0.0.1:5173";
const OUT = fileURLToPath(new URL("../public/shots/", import.meta.url));
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

await mkdir(OUT, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(BASE, { waitUntil: "networkidle0" });
await page.keyboard.press("Escape");
await wait(1800);
await page.evaluate(() => document.fonts.ready);

async function shot(name, full = false) {
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage: full });
  console.log("saved", name);
}

await shot("home");
await shot("home-full", true);

for (const view of ["capsules", "new", "pools", "protocol"]) {
  await page.evaluate((v) => (window.location.hash = v), view);
  await wait(900);
  await shot(view);
  await shot(`${view}-full`, true);
}

await page.evaluate(() => (window.location.hash = "board"));
await wait(900);
const opened = await page.evaluate(() => {
  const mascot = document.querySelector(".hero-pillee");
  if (mascot) mascot.style.visibility = "hidden";
  const row = document.querySelector(".rank-row");
  row?.click();
  return Boolean(row);
});
if (opened) {
  await wait(800);
  await shot("drawer");
}

await browser.close();
