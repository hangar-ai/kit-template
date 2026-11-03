"use strict";
// The kit as a whole. CI's kit-check also reads the manifest, the pages and everything for personal
// data; these are what only this kit can say.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { hangarFile, HANGAR_FILES_MISSING } = require("./hangar-ui.js");

const KIT = path.join(__dirname, "..");
const TAB = path.join(KIT, "tabs", "panes");
const read = (...parts) => fs.readFileSync(path.join(...parts), "utf8");
const manifest = JSON.parse(read(KIT, "hangar-kit.json"));

test("the plugin is named like the kit, and at its version", () => {
  const plugin = JSON.parse(read(KIT, ".claude-plugin", "plugin.json"));
  assert.equal(plugin.name, manifest.id);
  assert.equal(plugin.version, manifest.version);
});

test("every tab keeps its page and names its module: a .wasm file inside the kit", () => {
  // Schema 1 and an HTML `entry` are what Hangar 1.x opens; `native` is what the native Hangar opens.
  assert.equal(manifest.schema, 1);
  for (const tab of manifest.tabs) {
    assert.match(tab.entry, /\.html$/);
    assert.match(tab.native, /^[\w-]+(?:\/[\w-]+)*\.wasm$/, "native names a .wasm file, with no dot or hidden part in its path");
    const file = path.resolve(KIT, tab.native);
    assert.ok(file.startsWith(KIT + path.sep), `${tab.native} is outside the kit`);
    assert.ok(fs.existsSync(file), `${tab.native} is not here: run scripts/build-native.sh`);
    assert.ok(fs.statSync(file).size <= 64 * 1024 * 1024, "Hangar refuses a module of more than 64 MB");
  }
});

test("the module is one Hangar can start: built for wasm32-unknown-unknown, not for WASI", () => {
  // The same checks Hangar makes before it runs a module: what it imports and exports, and its ABI.
  const bytes = fs.readFileSync(path.join(KIT, manifest.tabs[0].native));
  const module = new WebAssembly.Module(bytes);
  const imports = WebAssembly.Module.imports(module).map(({ module: from, name }) => `${from}.${name}`);
  for (const name of imports) assert.ok(["hangar.log", "hangar.now"].includes(name), `${name}: a module may import nothing else, no WASI and no wasm-bindgen`);
  const exports = WebAssembly.Module.exports(module).map(({ name }) => name);
  for (const name of ["memory", "hangar_abi_version", "hangar_alloc", "hangar_init", "hangar_update", "hangar_view"]) {
    assert.ok(exports.includes(name), `the module does not export ${name}`);
  }
  const { exports: tab } = new WebAssembly.Instance(module, { hangar: { log() {}, now: () => 0n } });
  assert.equal(tab.hangar_abi_version(), 1);
});

test("the page calls what the tab asks for, and nothing else", () => {
  const needs = { "panes.list": "panes.read", "panes.changed": "panes.read" };
  const used = new Set();
  for (const name of ["logic.js", "app.js"]) {
    const text = read(TAB, name);
    for (const [, method] of text.matchAll(/hangar\.(?:call|on)\("([\w.]+)"/g)) used.add(needs[method] ?? method);
  }
  assert.deepEqual([...used].sort(), [...manifest.tabs[0].permissions].sort());
});

test("every class the page names is one of Hangar UI's", (t) => {
  const sheet = hangarFile("kit.css");
  if (!sheet) return t.skip(HANGAR_FILES_MISSING);
  const known = fs.readFileSync(sheet, "utf8");
  for (const [used] of read(TAB, "app.js").matchAll(/\bkit-[a-z]+(?:(?:__|--|-)[a-z]+)*\b/g)) {
    assert.ok(known.includes(`.${used}`), `${used} is not in kit.css`);
  }
  for (const name of ["running", "waiting", "success", "neutral"]) assert.ok(known.includes(`.kit-glyph--${name}`), name);
  for (const name of ["lock", "alert"]) assert.ok(known.includes(`.kit-icon--${name}`), name);
});

test("what the tab uses is in Hangar's docs", (t) => {
  const docs = hangarFile("kits.md");
  if (!docs) return t.skip(HANGAR_FILES_MISSING);
  const text = fs.readFileSync(docs, "utf8");
  for (const name of ["panes.list", "panes.read", "panes.changed"]) assert.ok(text.includes(`\`${name}\``), name);
});
