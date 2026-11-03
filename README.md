# Kit template

The smallest honest kit for [Hangar.AI](https://hangar.simnjs.fr), and the way to start a native one: a
tab written in Rust and compiled to WebAssembly, a skill, tests and a capture bench. It works as it is:
its tab lists the workspace's panes. Click **Use this template**, and replace what it does.

A native tab describes its page as widgets, and Hangar draws them itself, in the person's theme: no
browser engine runs for it. It calls the same methods under the same permissions as a page does.
[The contract](https://github.com/hangar-ai/hangar/blob/feat/native-rust/docs/native/kits-native.md) is
in Hangar's repository, on the SDK's branch until it is released; this page is how to start.

## What is here

```
hangar-kit.json         the kit: id, tab, permissions, its card for the gallery
.claude-plugin/         the Claude Code plugin; skills/ is what it brings
native/                 the tab, in Rust
  Cargo.toml            a cdylib (the module) and an rlib (its tests), on hangar-kit-sdk
  Cargo.lock            committed, so that a build is the same build tomorrow
  src/lib.rs            the Kit: state, messages, init, update, view, subscriptions, its strings
  src/logic.rs          what it shows, as plain functions of what Hangar answered
  tests/                logic.rs, tab.rs on the SDK's harness, kit.rs (its calls against the manifest)
tabs/panes.wasm         the module: built, committed, and what the native Hangar runs
tabs/panes/             the same tab as a page, which is what Hangar 1.x opens
scripts/build-native.sh builds the module; --check fails when the committed one is stale
rust-toolchain.toml     the compiler, so that the same source builds the same module everywhere
test/                   Node tests: the kit, the module, the page
bench/                  the tab photographed: capture-native.mjs, and the page's capture.mjs
```

**Both kinds of tab, in one manifest.** It stays at `"schema": 1`, keeps the page as `entry` and names
the module in `native`. Hangar 1.x ignores the field and opens the page; the native Hangar opens the
module, and the page only when the module cannot load (the tab's bar says so). A kit that needs
nothing older than the native Hangar can drop the page and its tests and photographs, and name the
module as its `entry` under `"schema": 2`: the contract says how.

## Make it yours

1. **Rename it.** In `hangar-kit.json`, change `id` (`[a-z0-9-]`), `name`, `description`, `homepage`, and
   `gallery`. In `.claude-plugin/plugin.json`, give the plugin the same name as the id. Rename
   `skills/panes/` and rewrite what it says. Rename the crate in `native/Cargo.toml` and in
   `scripts/build-native.sh`, whose first two lines name it and the tab. The tab's id names the module
   (`tabs/<tab>.wasm`): it is in the manifest, in that script and in `native/tests/kit.rs`.
2. **Replace what it does.** Ask for the least you can in `permissions`, then write `logic.rs` and
   `lib.rs`. `kit.rs` fails when the tab asks for what the manifest does not declare, or declares
   what it never uses.
3. **Drop what you do not need.** No skill? Delete `skills/` and `.claude-plugin/`: the kit is just a
   tab. Nothing older than the native Hangar? See above.

## Write the tab

`lib.rs` is commented, and is the example: it is a `Kit`, the shape of an iced program.

- **State and messages.** One struct and one enum. `init` makes the state and makes the first calls,
  `update` answers a message, `view` draws the state and nothing else, `subscriptions` says which of
  Hangar's events it listens to.
- **Calls are tasks.** `cx.call(api::PanesList {}, Message::Panes)` goes out when `update` returns, and
  the answer comes back later as a message. Nothing waits, so a call that takes two minutes holds
  nothing. Answers can arrive out of order: `asked` in `lib.rs` is how a stale one is told.
- **Every state is drawn.** `loading`, `empty`, `denied`, `failed` and the list are what a person
  sees: a refusal (`KitError::DENIED`) is an ordinary state of a tab, never a panic.
- **Every string goes through `Strings`, in English and French**, following Hangar's language.
- **No colour, and one primary action.** A widget says what it is (`dim`, a `glyph` of a `Status`),
  and Hangar draws it. See
  [the rules a kit follows](https://github.com/hangar-ai/hangar/blob/main/docs/kit-ui.md#the-rules-a-kit-follows);
  [the contract](https://github.com/hangar-ai/hangar/blob/feat/native-rust/docs/native/kits-native.md)
  lists the widgets, calls, events and limits. For a bigger tab (a form, a table, a note kept in the
  data folder), read
  [hello-native](https://github.com/hangar-ai/hangar/tree/feat/native-rust/examples/kits/hello-native).
  The kit's plugin parts (hooks, MCP servers, commands) are as they are for any kit:
  [the kit contract](https://github.com/hangar-ai/hangar/blob/main/docs/kits.md).

## Build it

```sh
rustup toolchain install            # once: the compiler rust-toolchain.toml pins, and the wasm32 target
scripts/build-native.sh             # writes tabs/panes.wasm
```

Hangar runs the `.wasm` a kit ships and never builds one, so a kit installed by cloning works as it is:
**commit the module in the commit that changes the source.** It is about 380 KB. The first build
fetches the SDK from GitHub (`Cargo.lock` pins the commit).

- **`wasm32-unknown-unknown`, never WASI, never wasm-bindgen.** Hangar links no WASI and refuses a
  module that imports it. The Node tests check what the module imports and exports.
- **The same bytes everywhere.** The script keeps your folders' names out of the file (panic
  messages hold paths), and the toolchain is pinned, so `scripts/build-native.sh --check` can say
  whether the committed module is what the source builds. CI runs it. To move to a newer compiler,
  change the version in `rust-toolchain.toml`, run the script, and commit both.

## Test it

```sh
cargo test --manifest-path native/Cargo.toml    # the tab, on the host: no Hangar, no WebAssembly
node --test                                     # the kit, the module and the page: Node alone
```

`Harness` runs the tab's own runtime. Start it with what Hangar would give it, answer its calls by
hand, use its widgets, read its page:

```rust
let mut tab = Harness::<Panes>::new(testing::start().grant(["panes.read"]));
tab.reply_to("panes.list", Ok(json!([{ "name": "Ava", "agent": "claude", "role": null, "state": "idle", "canSend": true }])));
assert!(tab.shows("Ava"));
tab.event("panes.changed", json!({}));
assert_eq!(tab.methods(), vec!["panes.list"]);
```

Beside `reply_to`, `reply` and `event`: `press`, `type_into`, `choose`, `toggle`, `shortcut`, `draw`,
`timer`, `elapse`, and `texts`, `calls`, `subscriptions`, `take_operations`. `testing::start()` takes
`.grant([…])`, `.param(…)`, `.locale("fr")`, `.utc_offset(…)`. Write a case for each state, for what
a refusal does, and for what the tab sends.

The Node tests cover what only a file can say: the plugin, the manifest and its `native` field, the
module's imports, and the page. Without Hangar's files, the two tests that compare against them skip
and say so. `node test/hangar-ui.js --get` fetches them, into a folder git ignores.

CI calls [kit-check](https://github.com/hangar-ai/.github/blob/main/.github/workflows/kit-check.yml): it reads
the manifest, runs your tests, and refuses personal data, a colour of the tab's own, and anything a page loads
from outside the kit. Its manifest check restates Hangar's rules, and Hangar reads the manifest again itself.
A second job runs `cargo test` and `scripts/build-native.sh --check`.

## Try it in Hangar

In the native Hangar, Settings › Kits, link this folder. A linked folder is read live: build, then
reload the tab from its bar, and see. Without the app, the preview window of Hangar's kit host runs
the module in a pretend Hangar (two panes, a data folder in memory, every permission granted):

```sh
cargo run -p hangar-kit-host --example preview -- path/to/this/kit/tabs/panes.wasm    # --light, --fr
```

from a checkout of [hangar-ai/hangar](https://github.com/hangar-ai/hangar) on the SDK's branch.

```sh
HANGAR_DIR=~/dev/hangar node bench/capture-native.mjs
```

photographs it there, in light and dark, in English and French, into `bench/captures/`. The pretend
Hangar always answers with three panes, so it shows the list only: the empty, denied and failed
states are read in the tests. `node bench/capture.mjs` photographs the page's states, at 320 px and
wide, for Hangar 1.x. Look at them before you publish.

## Publish it

Tag it `v` and the manifest's version, with the module built from that source and committed: the tag
is what an install pins. Then [propose it to the catalog](https://github.com/hangar-ai/catalog). Before
that, read your kit as the person enabling it will: the activation view shows its commands, hooks and
permissions verbatim, so keep each as small as the job allows.

Anyone can already install it from Settings › Kits with its GitHub link.
