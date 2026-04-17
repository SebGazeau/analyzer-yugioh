//! Votes communautaires Fidraulis GY + validation admin.

pub mod repository;
pub mod routes;
pub mod routes_admin;

pub use repository::{
    AdminQueueRow, insert_admin_validated, list_admin_vote_queue, list_validated_passcodes,
    load_validated_passcodes_set,
};
pub use routes::{
    get_fidraulis_gy_validated_passcodes, get_fidraulis_gy_vote_state, post_fidraulis_gy_vote,
};
pub use routes_admin::{get_admin_fidraulis_gy_queue_page, post_admin_fidraulis_gy_validate};
