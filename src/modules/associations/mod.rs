//! Cartes associées (catalogue YGOrg, Q&A).

mod repository;
pub mod routes;

pub use repository::{
    list_our_card_ids_sharing_ygorg_qa_with, ygorg_en_catalog_fields_by_card_id,
    ygorg_internal_id_for_our_card, YgOrgEnCatalogFields,
};
pub use routes::{
    associations_catalog, associations_qa_related, AssociationCatalogEntry, QaRelatedQuery,
};
