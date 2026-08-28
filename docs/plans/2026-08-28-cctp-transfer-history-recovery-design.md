# CCTP Transfer History and Recovery

The bridge modal gains `Bridge` and `History` tabs. History is private to the
browser and scoped to the connected EVM wallet. Each CCTP transfer is persisted
to `localStorage` as soon as its source-chain burn transaction confirms. A
record contains a version, wallet, source chain and Circle domain, amount,
transfer mode, burn hash, creation/update timestamps, state, and optional mint
hash. Records are normalized on read, capped to a small recent-history limit,
and never contain private keys or signatures.

Transfer states are `awaiting_attestation`, `ready_to_mint`, `minting`,
`complete`, and `needs_attention`. The existing bridge orchestrator emits the
confirmed burn before polling Circle, updates the record as attestation and
mint phases advance, and clears no history after success. On modal open, UpOnly
checks incomplete records for the connected wallet. The newest pending transfer
automatically resumes Circle polling and relays the permissionless Injective
mint. A per-wallet lock prevents the automatic path and a user rescue click
from running the same transfer concurrently.

The History tab lists amount, route, time, state, and source/mint explorer
links. Pending rows expose `Check again` while Circle is still attesting and
`Rescue` when the message is ready or a prior mint attempt failed. Users can
also import a source-chain burn transaction hash plus its source network. Import
validates the hash, asks Circle for the canonical message, derives the recipient
from that message before associating it with the connected wallet, and only
then allows relay. Already-consumed messages are treated as complete rather
than errors.

Storage helpers, recovery orchestration, recipient validation, deduplication,
state transitions, and modal rendering receive unit coverage. Existing CCTP
polling remains five seconds, temporary Circle/network failures stay retryable,
and one failed history entry cannot block a fresh bridge.
