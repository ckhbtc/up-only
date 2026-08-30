# Revoke Autosign Modal Design

## Goal

Make the revoke-autosign progress state visually consistent with the existing Authorize Wallet modal.

## Approach

The authorization setup and revoke progress state share one CSS modal shell. Both use the same centered overlay, 420 pixel panel width, white card surface, square three-pixel border, ten-pixel offset shadow, heading typography, body spacing, and full-width gradient action area.

The revoke flow remains non-cancellable after submission. It therefore omits the authorization modal's dismiss button while the wallet operation is active. Other trading transaction progress states retain their existing animated ribbon treatment.

## Revoke Content

- Title: `Revoke Autosign`
- Supporting copy explains that the wallet request removes UpOnly's trading authorization.
- The action area shows the existing `Revoking autosign...` status with a pulsing activity marker.
