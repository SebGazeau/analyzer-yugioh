# Mistakes log (Rust)

## Pattern
- What happened:
- Why it happened (Rust concept):
- How to detect it next time:
- Fix pattern (short):
- Micro-drill (repeat 3 times):

## Pattern
- What happened: Used a trait (`FromStr`) as a field type and mismatched normalization case in string parsing.
- Why it happened (Rust concept): Traits are not concrete types; parsing needs a stable normalized representation before matching.
- How to detect it next time: If a type in a struct/enum isn't a concrete data type, it's likely wrong; ensure the match input has the same case/format as match arms.
- Fix pattern (short): Store invalid input as `String` and normalize once (e.g. lowercase + remove spaces) before matching.
- Micro-drill (repeat 3 times): Write `normalize(s: &str) -> String`, then `TryFrom<&str>` for an enum with 5 variants.

## Recurring themes
- Borrow checker confusion:
- Error handling:
- Lifetimes:
- Traits/generics: