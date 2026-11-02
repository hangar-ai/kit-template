# Kit template

The smallest honest kit for [Hangar.AI](https://hangar.simnjs.fr): a tab on Hangar UI, a skill, tests
and a capture bench. It works as it is: its tab lists the workspace's panes. Click **Use this template**,
and replace what it does.

## What is here

```
hangar-kit.json        the kit: id, tab, permissions, its card for the gallery
.claude-plugin/        the Claude Code plugin; skills/ is what it brings
tabs/panes/
  index.html           the page: Hangar's files, then yours
  logic.js             what it shows, taking window.hangar as an argument so a test can fake it
  app.js               draws it with Hangar UI's classes
test/
  fake-hangar.js       a window.hangar over data in memory
  tab.test.js          the logic, on that fake
  kit.test.js          the kit as a whole
  hangar-ui.js         gets Hangar's own files, which some tests compare against
bench/                 the page in a sandboxed frame, as Hangar frames it, photographed
```

## Make it yours

1. **Rename it.** In `hangar-kit.json`, change `id` (`[a-z0-9-]`), `name`, `description`, `homepage`, and
   `gallery`. In `.claude-plugin/plugin.json`, give the plugin the same name as the id. Rename
   `skills/panes/` and rewrite what it says.
2. **Link it.** In Hangar, Settings › Kits, link this folder. A linked folder is read live: edit, reload the
   tab, see.
3. **Replace what it does.** Ask for the least you can in `permissions`, then write `logic.js` and `app.js`.
   Add what you call to `test/fake-hangar.js`.
4. **Drop what you do not need.** No skill? Delete `skills/` and `.claude-plugin/`: the kit is just a tab.

Follow [the rules a kit follows](https://github.com/hangar-ai/hangar/blob/main/docs/kit-ui.md#the-rules-a-kit-follows):
no colour of your own, a designed state for what is empty, loading, failing or denied, and a page that holds
at 320 px. [The kit contract](https://github.com/hangar-ai/hangar/blob/main/docs/kits.md) has everything else:
hooks, MCP servers, commands, the data folder.

## Test it

```sh
node --test
```

Node alone, with nothing to install. Without Hangar's files, the two tests that compare against them skip
and say so. `node test/hangar-ui.js --get` fetches them, into a folder git ignores.

```sh
node bench/capture.mjs
```

Photographs each state of `bench/states.js` at 320 px and wide, in light and dark, into `bench/captures/`.
Look at them before you publish.

CI calls [kit-check](https://github.com/hangar-ai/.github/blob/main/.github/workflows/kit-check.yml): it reads
the manifest, runs your tests, and refuses personal data, a colour of the tab's own, and anything a page loads
from outside the kit. Its manifest check restates Hangar's rules, and Hangar reads the manifest again itself.

## Publish it

Tag it `v` and the manifest's version. Then [propose it to the catalog](https://github.com/hangar-ai/catalog).
Before that, read your kit as the person enabling it will: the activation view shows its commands, hooks and
permissions verbatim, so keep each as small as the job allows.

Anyone can already install it from Settings › Kits with its GitHub link.
