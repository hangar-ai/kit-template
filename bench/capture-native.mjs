#!/usr/bin/env node
// Photographs the native tab, in light and dark, in English and French, in the preview window that
// ships with Hangar's kit host: the module (tabs/panes.wasm) in a pretend Hangar. No dependency.
//
//   HANGAR_DIR=~/dev/hangar node bench/capture-native.mjs     writes bench/captures/native-*.png
//
// HANGAR_DIR is a checkout of github.com/hangar-ai/hangar, on the branch the SDK comes from; the
// first run builds the preview there (the kit host and iced: a few minutes). HANGAR_PREVIEW names a
// preview already built instead. The window needs a display.
//
// What it cannot show: the pretend Hangar answers `panes.list` with three panes and grants every
// permission, whatever the tab asks. So this photographs the list only, at the preview's width of
// 360 points. The empty, loading, denied and failed states are drawn from the same code and are read
// in the tests (`cargo test --manifest-path native/Cargo.toml`); bench/capture.mjs photographs the
// page's, which is what Hangar 1.x opens.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const here = path.dirname(fileURLToPath(import.meta.url));
const kit = path.join(here, "..");
const out = path.join(here, "captures");
const manifest = JSON.parse(fs.readFileSync(path.join(kit, "hangar-kit.json"), "utf8"));
const module = path.join(kit, manifest.tabs[0].native);
const SCHEMES = ["dark", "light"];
const LOCALES = ["en", "fr"];

if (!fs.existsSync(module)) {
  console.error(`${module} is not here: run scripts/build-native.sh.`);
  process.exit(1);
}
const dir = process.env.HANGAR_DIR && path.resolve(process.env.HANGAR_DIR.replace(/^~(?=\/)/, os.homedir()));
const prebuilt = process.env.HANGAR_PREVIEW && path.resolve(process.env.HANGAR_PREVIEW);
if (!prebuilt && !(dir && fs.existsSync(path.join(dir, "Cargo.toml")))) {
  console.error("Where is Hangar? Set HANGAR_DIR to a checkout of hangar-ai/hangar, or HANGAR_PREVIEW to a built preview.");
  process.exit(1);
}
const [program, ...args] = prebuilt
  ? [prebuilt]
  : ["cargo", "run", "--quiet", "--manifest-path", path.join(dir, "Cargo.toml"), "-p", "hangar-kit-host", "--example", "preview", "--"];

fs.mkdirSync(out, { recursive: true });
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "bench-native-"));
try {
  for (const scheme of SCHEMES) {
    for (const locale of LOCALES) {
      const name = `native-list-${scheme}-${locale}.png`;
      const raw = path.join(scratch, "page.rgba");
      const flags = [...(scheme === "light" ? ["--light"] : []), ...(locale === "fr" ? ["--fr"] : [])];
      // The preview takes its own picture two seconds in, writes it and quits.
      const run = spawnSync(program, [...args, module, ...flags], {
        // From Hangar's folder, so that its toolchain is the one cargo finds, not this kit's.
        cwd: prebuilt ? kit : dir,
        env: { ...process.env, HANGAR_PREVIEW_SHOT: raw },
        stdio: ["ignore", "ignore", "inherit"],
      });
      if (run.status !== 0 || !fs.existsSync(raw)) {
        console.error(`${name}: the preview did not take its picture${run.error ? ` (${run.error.message})` : ""}.`);
        process.exit(1);
      }
      fs.writeFileSync(path.join(out, name), png(fs.readFileSync(raw)));
      fs.rmSync(raw);
      console.log(name);
    }
  }
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}

// The preview writes "<width> <height>\n" and then the window's RGBA, row by row.
function png(shot) {
  const end = shot.indexOf(10);
  const [width, height] = shot.subarray(0, end).toString().split(" ").map(Number);
  const rgba = shot.subarray(end + 1);
  const rows = Buffer.alloc((width * 4 + 1) * height); // each row starts with its filter byte: 0, none
  for (let y = 0; y < height; y++) rgba.copy(rows, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8 bits, RGBA, the one method, no filtering scheme, no interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const frame = Buffer.alloc(8 + data.length + 4);
  frame.writeUInt32BE(data.length, 0);
  body.copy(frame, 4);
  frame.writeUInt32BE(crc32(body), 8 + data.length);
  return frame;
}

function crc32(bytes) {
  let crc = ~0;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}
