#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SearchQuery {
    inner: String,
}

impl SearchQuery {
    pub fn new(s: impl AsRef<str>) -> Result<Self, SearchQueryError> {
        let s = s.as_ref().trim();
        (s.len() >= 4)
            .then_some(Self {
                inner: s.to_string(),
            })
            .ok_or(SearchQueryError::TooShort(s.len()))
    }
    pub fn as_str(&self) -> &str {
        &self.inner
    }

    pub fn query(&self) -> &str {
        &self.inner
    }
}

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum SearchQueryError {
    #[error("query is too short {0}")]
    TooShort(usize),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new() {
        assert_eq!(
            SearchQuery::new("abcd"),
            Ok(SearchQuery {
                inner: "abcd".to_string()
            })
        );
        assert_eq!(SearchQuery::new(""), Err(SearchQueryError::TooShort(0)));
        assert_eq!(
            SearchQuery::new("abcd "),
            Ok(SearchQuery {
                inner: "abcd".to_string()
            })
        );
        assert_eq!(
            SearchQuery::new(" abcd"),
            Ok(SearchQuery {
                inner: "abcd".to_string()
            })
        );
        assert_eq!(
            SearchQuery::new("abcd "),
            Ok(SearchQuery {
                inner: "abcd".to_string()
            })
        );
        assert_eq!(
            SearchQuery::new(" abcd "),
            Ok(SearchQuery {
                inner: "abcd".to_string()
            })
        );
        assert_eq!(SearchQuery::new("xy"), Err(SearchQueryError::TooShort(2)));
        assert_eq!(SearchQuery::new(" xy "), Err(SearchQueryError::TooShort(2)));
    }
}
