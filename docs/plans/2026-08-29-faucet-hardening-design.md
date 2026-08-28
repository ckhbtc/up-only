# Faucet hardening design

## Goal

Keep automatic fresh-wallet onboarding available only through the UpOnly web
application while making the faucet wallet impossible to empty through the
public initialization endpoint.

## Controls

The `init-account` route will require an exact allowed `Origin`, matching host
and protocol, and a same-origin Fetch Metadata header. Express will trust only
the local reverse proxy so application rate limits use the real client IP. A
small per-IP sliding-window limit will reduce automated requests.

Origin and IP checks are deterrents, not absolute authentication. A non-browser
client can forge browser headers and rotate addresses. The hard boundary is a
persistent daily spend ceiling plus an on-chain minimum-reserve check. Faucet
operations will run serially so concurrent requests cannot race those checks or
reuse an EVM nonce. The spend reservation is persisted before broadcasting. If
persistence fails, the request fails closed.

Production defaults protect 5 INJ and permit at most 0.1 INJ of faucet spending
per UTC day. Both values, the allowed origins, the per-IP rate, and the state
file are configurable through environment variables. Existing wallet balance
checks and the per-wallet cooldown remain in place.

## Verification

Tests cover exact same-origin acceptance, hostile and missing origins, rate
limit rollover, daily-budget exhaustion, reserve enforcement, and persisted
usage. Deployment verification will exercise health, reject a direct request
without browser headers, and confirm the production process and logs are clean.
