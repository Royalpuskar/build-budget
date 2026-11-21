# Build Budget

Compare asset sizes and enforce total and per-asset byte budgets.

**Status:** implemented browser-local research prototype. Automated tests can be reproduced with the command below. The existing Pages site previously passed smoke checks. The growth-budget update is locally tested; its latest deployment and browser behavior have not been verified.

## Website

Live website: https://royalpuskar.github.io/build-budget/

## Problem and approach

Build maintainers can review additions and size increases independently from total size. Deleting a large obsolete asset can reduce net size while hiding substantial growth in a retained asset; the optional growth budget exposes that tradeoff. It runs the same pure JavaScript engine in the browser and Node tests. All input is provided by the user or the included synthetic fixture; no external facts are inferred.

## Implemented features

- Editable scenario with a synthetic example and reset control.
- Deterministic analysis, summary metrics, filterable result table, and JSON report export.
- Input validation, explicit errors, and invalidation of outdated reports after edits.
- Keyboard-accessible controls, responsive layout, and large-screen CSS.
- Zero runtime dependencies and no external API calls.

## Install and run

Requirements: Python 3 for a static local server, Node.js 22 or later for tests.

```sh
git clone https://github.com/Royalpuskar/build-budget.git
cd build-budget
python3 -m http.server 8000
```

Open http://localhost:8000. Do not open index.html through a file URL; ES modules require a server.

```sh
node --test test.mjs
```

## Example and schema

The complete example in `sample.mjs` defines the supported input shape:

```json
{
  "budget": 1000,
  "assetLimit": 700,
  "before": [
    {
      "path": "app.js",
      "bytes": 400
    }
  ],
  "after": [
    {
      "path": "app.js",
      "bytes": 800
    },
    {
      "path": "style.css",
      "bytes": 300
    }
  ]
}
```

Edit one value and select **Run analysis**. **Reset example** restores the fixture. **Export report** downloads the current result; it never publishes it.

Input is capped at 200,000 serialized characters, arrays processed by the engine at 500 elements, and numeric magnitudes at 1e12. Domain constraints are checked inside `engine.mjs`; unsupported structures return an error.

## Gross growth policy and byte accounting

Optional `growthBudget` limits the sum of added-asset bytes and positive size increases in retained assets. Deletions and shrinkage do not offset it. Omitting this field preserves the original total/per-asset policy. Every byte count and budget must now be a nonnegative integer at most 1e12; fractional byte inputs are rejected.

```json
{"budget":1000,"assetLimit":1000,"growthBudget":100,
"before":[{"path":"old","bytes":900},{"path":"app","bytes":100}],
"after":[{"path":"app","bytes":300}]}
```

Expected result: total size 300 bytes, net change −700 bytes, positive growth 200 bytes. Total and per-asset limits pass, but the growth budget fails by 100 bytes.

Rows explicitly classify paths as added, removed, grown, shrunk, or unchanged, including zero-byte additions/removals. Paths are exact case-sensitive identities; no rename inference or normalization occurs. A rename therefore counts as removal plus addition.

`accounting` provides added, removed, grown, and shrunk byte totals. The identity `netChangeBytes = addedBytes + grownBytes - removedBytes - shrunkBytes` makes the comparison auditable. `violations` gives each failed policy's actual size, limit, and excess, plus the path for asset failures. Equality with any budget passes. Removed assets are not checked against the current per-asset limit.

## Architecture and request flow

`index.html` loads `app.mjs`, which parses scenario JSON and calls `run` from `engine.mjs`. The engine returns `metrics` and `rows`; the UI renders values with `textContent`, never user-supplied HTML. Editing invalidates the prior report. Export creates a local Blob download.

There is no application authentication, credential store, session cookie, or token lifecycle. GitHub Pages serves public static files. The app does not collect passwords or API keys, contact third-party APIs, persist inputs, or send scenario data over the network. GitHub hosting can still receive ordinary page request metadata. Reloading discards edits.

## Limitations

Input byte counts are supplied build measurements; the tool does not build projects or measure network compression.

The interface shares a portfolio design system, while this repository has its own domain engine, fixture, and tests. No accuracy, novelty, production-readiness, or 4K visual-test claim is made. Large-screen CSS is not a substitute for device testing.

## Validation

Nine local Node tests pass for this update. They cover deletion-masked growth, zero-byte file identities, exact budget boundaries, omitted policy compatibility, simultaneous violations, input validation, and deterministic behavior. A bounded exhaustive check verifies byte-conservation identities across all 81 pairs of two-asset snapshots where each asset is absent, zero bytes, or two bytes. These fixture results are not production benchmarks. Mobile, laptop, and 3840×2160 browser checks have not been performed for this update.

`test.mjs` checks domain outcomes and edge cases, deterministic behavior, input preservation, malformed roots, and size limits. GitHub Actions runs the same suite. Review the tests themselves to see exactly what is covered; passing these checks does not establish security or exhaustive correctness.

## Roadmap

- Add more independently reviewed domain fixtures and explicit schema documentation.
- Add domain-specific form controls alongside the JSON editor.
- Expand accessibility and mobile browser testing.
- Revisit the documented domain limitations before production use.

## Contribution and license

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [LICENSE](LICENSE).

© 2026 Puskar (Royalpuskar). All rights reserved except permissions granted by the MIT license. Preserve applicable third-party notices.

