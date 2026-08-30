# Clickable Success Toast Design

## Goal

Make a successful transaction toast one clear explorer action without displaying the transaction hash.

## Behavior

When a success status includes a transaction hash, render the complete toast as a link to that transaction in the Injective explorer. The toast displays only the success message. It opens in a new tab and includes an explicit accessible label.

Success statuses without a transaction hash remain plain notifications. Loading, warning, and error statuses keep their existing behavior.

## Styling

The linked toast retains the current success colors, border, shadow, position, and typography. It removes default anchor decoration, shows a pointer cursor, and gets a small hover/focus lift so the interaction is visible without changing the app's visual language.
