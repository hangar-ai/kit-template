#!/bin/sh
# Builds the tab to WebAssembly and puts it where the manifest's `native` says.
#
#   scripts/build-native.sh           builds, and writes tabs/panes.wasm
#   scripts/build-native.sh --check   builds, and fails when tabs/panes.wasm is not what the source builds
#
# Hangar runs the .wasm a kit ships and never builds one, so commit the module in the commit that
# changes the source. Run from anywhere. Needs rustup (rust-toolchain.toml says which compiler and
# adds the wasm32-unknown-unknown target).
set -eu

# Rename these with the kit: the crate's `name` in native/Cargo.toml (dashes as underscores), and the
# tab's id, which names the module.
crate=my_kit_tab
tab=panes

cd "$(dirname "$0")/.."
built="native/target/wasm32-unknown-unknown/release/$crate.wasm"
module="tabs/$tab.wasm"

# The same source must give the same bytes on every machine, or --check could not tell a stale module
# from a fresh one. A panic message holds the path of the file it comes from: these keep your folders'
# names (your user name, with them) out of a file you publish. Fields are separated by \037, so a
# folder with a space in its name is fine.
sysroot=$(rustc --print sysroot)
CARGO_ENCODED_RUSTFLAGS=$(printf '%s\037%s\037%s' \
  "--remap-path-prefix=$(pwd)=." \
  "--remap-path-prefix=${CARGO_HOME:-$HOME/.cargo}=/cargo" \
  "--remap-path-prefix=$sysroot=/rust")
export CARGO_ENCODED_RUSTFLAGS

cargo build --manifest-path native/Cargo.toml --release --target wasm32-unknown-unknown --locked

if [ "${1:-}" = "--check" ]; then
  if cmp -s "$built" "$module"; then
    echo "$module is what the source builds."
  else
    echo "$module is stale: run scripts/build-native.sh and commit it." >&2
    exit 1
  fi
else
  cp "$built" "$module"
  echo "$module ($(wc -c <"$module") bytes)"
fi
