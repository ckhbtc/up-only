# Position Strip Trackpad Scrolling

The positions page keeps five cards per pager page and preserves the existing
card width. The card viewport is a horizontal scroll container at every
breakpoint, so narrower desktop windows can reach a partially clipped fifth
card with native trackpad gestures. Horizontal overscroll is contained within
the strip, and proximity snapping keeps cards easy to align without forcing a
large jump during precise trackpad movement.

The existing pager continues to move between groups of five when more than five
positions exist. A CSS regression test verifies that desktop scrolling cannot
silently regress to `overflow: hidden`.
