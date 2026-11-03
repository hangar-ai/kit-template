//! `test/kit.test.js`, for the native tab: the kit as a whole. The Node tests still
//! run the page, the plugin and the manifest; these are what only the module can say.

use std::collections::BTreeSet;

use hangar_kit_sdk::testing::{self, Harness, StartExt};
use my_kit_tab::Panes;
use serde_json::{Value, json};

/// The permission a call or an event needs (docs/kits.md); none for what any tab
/// may do. A method that is not listed is named after its permission.
fn needs(name: &str) -> Option<&str> {
    match name {
        "panes.list" | "panes.changed" => Some("panes.read"),
        "theme" | "tab.params" | "tab.visibility" | "tab.setTitle" | "tab.setBadge"
        | "ui.toast" | "ui.confirm" | "ui.copy" => None,
        other => Some(other),
    }
}

#[test]
fn the_tab_asks_for_what_the_manifest_declares_and_nothing_else() {
    let manifest: Value = serde_json::from_str(include_str!("../../hangar-kit.json")).unwrap();
    let declared: BTreeSet<&str> = manifest["tabs"]
        .as_array()
        .unwrap()
        .iter()
        .find(|tab| tab["id"] == "panes")
        .expect("the manifest has a panes tab")["permissions"]
        .as_array()
        .unwrap()
        .iter()
        .map(|permission| permission.as_str().unwrap())
        .collect();

    // Everything the tab does in its life: it starts, and it reads again on an event.
    let mut tab = Harness::<Panes>::new(testing::start().grant(declared.iter().copied()));
    tab.event("panes.changed", json!({}));
    let used: BTreeSet<&str> = tab
        .calls()
        .iter()
        .map(|call| call.method.as_str())
        .chain(tab.subscriptions().events.iter().map(String::as_str))
        .filter_map(needs)
        .collect();

    assert_eq!(used, declared);
}
