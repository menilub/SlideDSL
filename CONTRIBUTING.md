# Contributing to SlideDSL

Thanks for your interest in contributing! Contributions of all kinds are welcome —
bug reports, fixes, new validation rules, documentation, and ideas.

> **How decisions are made:** This is a maintainer-led project. Anyone may open a pull
> request, but every PR is reviewed and merged at the discretion of the maintainer
> ([@menilub](https://github.com/menilub)). Please don't be discouraged if a change
> needs discussion before it lands.

## Ways to contribute

- **Report a bug** — open an issue describing what you did, what you expected, and what
  happened. A minimal `.sdl` snippet that reproduces the problem is hugely helpful.
- **Suggest an enhancement** — open an issue describing the use case before writing code,
  so we can agree on the approach.
- **Submit a fix or feature** — see the pull request workflow below.

## Prerequisites

- **Node.js 22.6 or newer.** The project runs TypeScript directly using Node's native
  type-stripping (`--experimental-strip-types`), so no separate build/compile step is
  required.
- `npm` (bundled with Node).

## Getting started

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/<your-username>/SlideDSL.git
cd SlideDSL

# 2. Install dev dependencies
npm install

# 3. Run the test suite
npm test

# 4. Run the validator against a SlideDSL file
npm run validate -- path/to/your-file.sdl
```

## Pull request workflow

1. Create a topic branch off `main`:
   ```bash
   git checkout -b fix/short-description
   ```
2. Make your change. Keep PRs focused — one logical change per PR is easiest to review.
3. **Run `npm test`** and make sure everything passes. Add or update tests for any
   behavior you change.
4. Commit with a clear, descriptive message.
5. Push to your fork and open a pull request against `menilub/SlideDSL:main`.
6. Fill out the PR template. The maintainer will be auto-requested as a reviewer.

## Project layout

| Path | What lives here |
|------|-----------------|
| `src/parser/` | Tokenizing and parsing SlideDSL source into structured data. |
| `src/validators/` | Structural, semantic, and lint validation rules. |
| `src/reporters/` | Output formatting (human-readable, JSON). |
| `src/cli.ts` | Command-line entry point. |
| `tests/` | Tests mirroring `src/` (`tests/parser/`, `tests/validators/`). |
| `docs/` | Specifications and design documents. |

## Coding conventions

- Match the style of the surrounding code. The project is **TypeScript with ES modules**
  (`"type": "module"`); use `import`/`export`, not `require`.
- Prefer small, focused functions with descriptive, verb-based names.
- When you add or change a validation rule, add a corresponding test under `tests/`.
- No formatter/linter is configured yet — keep diffs clean and consistent with nearby code.
