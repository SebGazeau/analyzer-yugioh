#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Quantity(pub(crate) u8);

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum QuantityError {
    #[error("quantity must be between 1 and 3: {0}")]
    OutOfRange(i64),
}

impl TryFrom<u8> for Quantity {
    type Error = QuantityError;
    fn try_from(value: u8) -> Result<Self, Self::Error> {
        from_int(value as i64)
    }
}

impl TryFrom<i64> for Quantity {
    type Error = QuantityError;

    fn try_from(value: i64) -> Result<Self, Self::Error> {
        from_int(value)
    }
}
impl Quantity {
    pub fn as_u8(&self) -> u8 {
        self.0
    }
}
fn from_int(i: i64) -> Result<Quantity, QuantityError> {
    (1..=3)
        .contains(&i)
        .then_some(Quantity(i as u8))
        .ok_or(QuantityError::OutOfRange(i))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_quantity_try_from() {
        assert_eq!(Quantity::try_from(1_u8), Ok(Quantity(1)));
        assert_eq!(Quantity::try_from(2_i64), Ok(Quantity(2)));
        assert_eq!(Quantity::try_from(3_i64), Ok(Quantity(3)));
        assert_eq!(Quantity::try_from(4_i64), Err(QuantityError::OutOfRange(4)));
        assert_eq!(Quantity::try_from(0_i64), Err(QuantityError::OutOfRange(0)));
        assert_eq!(
            Quantity::try_from(-1_i64),
            Err(QuantityError::OutOfRange(-1))
        );
    }
}
