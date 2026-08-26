# Compact Price Subscript Positioning

Compact token prices keep their existing plain-text representation, such as
`0.0₄899255`. UI price displays parse the Unicode zero count and render it as a
normal numeral inside a semantic `sub` element. This gives CSS direct control
over its size and baseline position without changing price data or copyable
fallback text.

The zero count renders at 52% of the surrounding price size and moves down by
35% of its own em box. Its upper half sits beside the neighboring digits while
its lower half extends below their baseline. The shared renderer is used for
market, estimated-liquidation, search, position-entry, live-mark, and position-
liquidation prices. Balances and ordinary dollar values remain unchanged.

Unit coverage verifies parsing, plain-price fallback, CSS positioning, and all
six price-renderer placements. The production build provides the final JSX and
CSS integration check.
