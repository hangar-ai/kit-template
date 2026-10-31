#!/usr/bin/env node
// Photographs the tab in every state, at the panel's narrowest and wide, in light and dark, with a
// browser already on the machine. One browser at a time, with a throwaway profile. No dependency.
//
//   node test/hangar-ui.js --get     once: the page needs Hangar UI
//   node bench/capture.mjs           writes bench/captures/
//
// HANGAR_UI_DIR names another folder holding Hangar UI, and BROWSER another browser.

import { execFile } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const here = path.dirname(fileURLToPath(import.meta.url));
const kit = path.join(here, "..");
const ui = process.env.HANGAR_UI_DIR ? path.resolve(process.env.HANGAR_UI_DIR) : path.join(kit, ".hangar-ui");
const out = path.join(here, "captures");
const STATES = ["list", "empty", "denied", "error"];
const WIDTHS = { 320: 320, wide: 980 };
const SCHEMES = ["light", "dark"];
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json" };

if (!fs.existsSync(path.join(ui, "kit.css"))) {
  console.error("Hangar UI is not here: run `node test/hangar-ui.js --get`, or set HANGAR_UI_DIR.");
  process.exit(1);
}
const browser =
  process.env.BROWSER ??
  [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
  ].find((file) => fs.existsSync(file));
if (!browser) {
  console.error("No browser found: set BROWSER.");
  process.exit(1);
}

// What Hangar's scheme does: the kit's files, Hangar's under /_hangar/, readable from an opaque origin.
const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://localhost").pathname;
  const file = url.startsWith("/_hangar/")
    ? path.join(ui, url.slice("/_hangar/".length))
    : url.startsWith("/kit/")
      ? path.join(kit, url.slice("/kit/".length))
      : path.join(here, url.slice(1));
  const inside = [ui, kit].some((root) => path.resolve(file).startsWith(path.resolve(root) + path.sep));
  if (!inside || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream", "access-control-allow-origin": "*" });
  response.end(fs.readFileSync(file));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();

fs.mkdirSync(out, { recursive: true });
const run = promisify(execFile);
for (const state of STATES) {
  for (const scheme of SCHEMES) {
    for (const [label, width] of Object.entries(WIDTHS)) {
      const name = `${state}-${scheme}-${label}.png`;
      const profile = fs.mkdtempSync(path.join(os.tmpdir(), "bench-"));
      try {
        await run(browser, [
          "--headless=new",
          "--disable-gpu",
          "--hide-scrollbars",
          "--no-first-run",
          "--force-device-scale-factor=2",
          `--user-data-dir=${profile}`,
          `--window-size=${width},420`,
          "--virtual-time-budget=3000",
          `--screenshot=${path.join(out, name)}`,
          `http://127.0.0.1:${port}/index.html?state=${state}&scheme=${scheme}&width=${width}`,
        ]);
      } finally {
        fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      }
      console.log(name);
    }
  }
}
server.close();
