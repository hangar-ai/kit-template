"use strict";
// The kit as a whole. CI's kit-check also reads the manifest and everything for personal data;
// these are what only this kit can say. The tab itself is tested in Rust: native/tests/.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const KIT = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(...parts), "utf8");
const manifest = JSON.parse(read(KIT, "hangar-kit.json"));

test("the plugin is named like the kit, and at its version", () => {
  const plugin = JSON.parse(read(KIT, ".claude-plugin", "plugin.json"));
  assert.equal(plugin.name, manifest.id);
  assert.equal(plugin.version, manifest.version);
});

test("the kit is schema 2 and every tab's entry is its module: a .wasm file inside the kit", () => {
  assert.equal(manifest.schema, 2);
  assert.equal(manifest.hangar, ">=2.0.0");
  for (const tab of manifest.tabs) {
    assert.equal(tab.native, undefined, "schema 2 has no `native` field: the entry is the module");
    assert.match(tab.entry, /^[\w-]+(?:\/[\w-]+)*\.wasm$/, "entry names a .wasm file, with no dot or hidden part in its path");
    const file = path.resolve(KIT, tab.entry);
    assert.ok(file.startsWith(KIT + path.sep), `${tab.entry} is outside the kit`);
    assert.ok(fs.existsSync(file), `${tab.entry} is not here: run scripts/build-native.sh`);
    assert.ok(fs.statSync(file).size <= 64 * 1024 * 1024, "Hangar refuses a module of more than 64 MB");
  }
});

test("the module is one Hangar can start: built for wasm32-unknown-unknown, not for WASI", () => {
  // The same checks Hangar makes before it runs a module: what it imports and exports, and its ABI.
  const bytes = fs.readFileSync(path.join(KIT, manifest.tabs[0].entry));
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
