//! `test/tab.test.js`'s first two cases: what the tab shows, as plain functions.

use hangar_kit_sdk::api::{KitError, Pane};
use hangar_kit_sdk::ui::Status;
use my_kit_tab::logic::{View, view_of, view_of_error};

fn pane(name: &str, state: Option<&str>) -> Pane {
    Pane {
        name: name.into(),
        agent: "claude".into(),
        role: None,
        state: state.map(Into::into),
        can_send: true,
    }
}

#[test]
fn each_pane_becomes_a_row_with_a_shape_for_its_state() {
    let View::List(rows) = view_of(&[
        pane("Ava", Some("working")),
        pane("Zoe", Some("waiting")),
        pane("Iris", Some("yours")),
        pane("Bob", Some("idle")),
        pane("Sam", None),
    ]) else {
        panic!("five panes are a list");
    };
    let shapes: Vec<Status> = rows.iter().map(|row| row.status).collect();
    assert_eq!(
        shapes,
        [
            Status::Running,
            Status::Waiting,
            Status::Success,
            Status::Neutral,
            Status::Neutral
        ]
    );
    assert_eq!(rows[4].state, "unknown");
}

#[test]
fn no_pane_is_a_designed_state_and_so_is_a_refusal() {
    assert_eq!(view_of(&[]), View::Empty);
    assert_eq!(
        view_of_error(&KitError::new(KitError::DENIED, "no")),
        View::Denied
    );
    assert_eq!(
        view_of_error(&KitError::new(KitError::UNAVAILABLE, "gone")),
        View::Error("gone".into())
    );
}
