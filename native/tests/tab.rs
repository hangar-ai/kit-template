//! `test/tab.test.js`, on the harness: the tab started as Hangar would start it,
//! its calls answered by hand, its page read as a person would read it.
//!
//! The recorded answers below are what `panes.list` says in docs/kits.md.

use hangar_kit_sdk::api::KitError;
use hangar_kit_sdk::testing::{self, Harness, StartExt};
use hangar_kit_sdk::ui::{Element, Status};
use my_kit_tab::Panes;
use serde_json::{Value, json};

fn pane(name: &str, state: Value) -> Value {
    json!({ "name": name, "agent": "claude", "role": null, "state": state, "canSend": true })
}

fn started() -> Harness<Panes> {
    Harness::<Panes>::new(testing::start().grant(["panes.read"]))
}

/// The glyphs of the page, in order: the shape of each row's state, and its word.
fn glyphs(tab: &Harness<Panes>) -> Vec<(Status, String)> {
    let mut found = Vec::new();
    tab.view().root.for_each(&mut |element| {
        if let Element::Glyph(glyph) = element {
            found.push((glyph.status, glyph.label.clone()));
        }
    });
    found
}

#[test]
fn it_says_it_is_loading_shows_the_panes_and_reads_again_when_they_change() {
    let mut tab = started();
    assert!(tab.shows("Reading the panes…"));
    assert_eq!(tab.methods(), vec!["panes.list"]);

    tab.reply_to("panes.list", Ok(json!([pane("Ava", json!("idle"))])));
    assert!(tab.shows("Ava"));
    assert!(tab.shows("claude, Idle"));
    assert_eq!(glyphs(&tab), [(Status::Neutral, "Idle".to_string())]);

    // The workspace's panes changed: it asks again, and shows the new answer.
    tab.event("panes.changed", json!({}));
    assert_eq!(tab.methods(), vec!["panes.list"]);
    tab.reply_to("panes.list", Ok(json!([])));
    assert!(tab.shows("No pane yet"));
    assert!(!tab.shows("Ava"));
}

#[test]
fn denied_by_hangar_the_tab_says_so() {
    let mut tab = started();
    tab.reply_to(
        "panes.list",
        Err(KitError::new(
            KitError::DENIED,
            "this tab was not granted panes.list",
        )),
    );
    assert!(tab.shows("This tab may not read the panes"));
    assert!(tab.shows("Accept panes.read for this kit in Settings › Kits."));
}

#[test]
fn another_failure_is_drawn_in_hangars_words() {
    let mut tab = started();
    tab.reply_to(
        "panes.list",
        Err(KitError::new(
            KitError::UNAVAILABLE,
            "The workspace's folder is gone.",
        )),
    );
    assert!(tab.shows("The panes could not be read"));
    assert!(tab.shows("The workspace's folder is gone."));
}

#[test]
fn an_older_answer_arriving_late_does_not_replace_a_newer_one() {
    let mut tab = started();
    tab.event("panes.changed", json!({}));
    let (old, new) = (tab.calls()[0].id, tab.calls()[1].id);

    tab.reply(new, Ok(json!([pane("New", json!("idle"))])));
    tab.reply(old, Ok(json!([pane("Old", json!("idle"))])));
    assert!(tab.shows("New"));
    assert!(!tab.shows("Old"));
}

#[test]
fn every_state_has_its_shape_and_its_word() {
    let mut tab = started();
    tab.reply_to(
        "panes.list",
        Ok(json!([
            pane("Ava", json!("working")),
            pane("Zoe", json!("waiting")),
            pane("Iris", json!("yours")),
            pane("Sam", Value::Null),
        ])),
    );
    assert_eq!(
        glyphs(&tab),
        [
            (Status::Running, "Working".to_string()),
            (Status::Waiting, "Waiting for an answer".to_string()),
            (Status::Success, "Your turn".to_string()),
            (Status::Neutral, "State unknown".to_string()),
        ]
    );
}

#[test]
fn it_speaks_french_when_hangar_does_and_follows_it() {
    let mut tab = Harness::<Panes>::new(testing::start().grant(["panes.read"]).locale("fr"));
    assert!(tab.shows("Lecture des panneaux…"));
    tab.reply_to("panes.list", Ok(json!([])));
    assert!(tab.shows("Aucun panneau"));
    assert!(tab.shows("Panneaux"));

    // The language changes while the tab is open: the theme event says so.
    tab.event("theme", json!({ "scheme": "dark", "locale": "en" }));
    assert!(tab.shows("No pane yet"));
}
