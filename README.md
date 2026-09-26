# White-label site template

A statically-exported Next.js marketing site with the build pipeline,
integrations and Cloudflare infrastructure already wired up.

```
site/      the Next.js app (static export → Cloudflare Pages)
workers/   two Cloudflare Workers: lead relay + résumé upload
docs/      runbooks for the integrations
```

**Requirements:** Node 20+ for the site (Cloudflare Pages reads
`site/.nvmrc`). **Node 22.6+ for the workers' tests** — `npm test` runs
the TypeScript directly with `node --test`, which needs Node's built-in
type stripping.

**No Sanity studio ships in this repo yet.** The gallery builds from the
committed `site/content/gallery.generated.json`; `npm run gallery`
compares the category lists in `content/types.ts` and
`content/gallery.ts`, and adds the studio's list to that comparison
automatically once a `studio/` folder exists. `docs/GALLERY-CMS.md` is
the runbook for when it does.

## Quick start

```bash
cd site
cp .env.example .env.local     # every value is optional to start
npm install
npm run dev
```

Then work through the list in [PORTING.md](./PORTING.md) — it says what
was extracted, what was deliberately left behind, and what you owe
before a site built from this can ship.

## The build is the point

`npm run build` is seven steps, and five of them can fail the build:

```
gallery → next build → csp → fonts → seo → routes --check → harden
```

- **gallery** — fetches the CMS, fails on a photo with no alt text or a
  category the site cannot render
- **csp** — generates the Content-Security-Policy and fails if any
  origin in the output is not accounted for
- **fonts** — injects the preload for the display face
- **seo** — fails on a title over 60 characters or a missing description
- **routes** — fails on an internal link to a page that does not exist
- **harden** — fails if a secret, a sourcemap or a stray `.env` shipped

Plus `npm run check`, which is not in the build: a static checker for
inherited-default frontend patterns. Advisory by default, `--strict` to
make it fail.

## Per-client surface

In rough order of how long each takes:

| What | Where |
|---|---|
| Business facts and copy | `site/client.config.ts` |
| Colours and type | `site/app/globals.css` (token block at the top) |
| Which pages exist | `site/lib/routes.ts` (`live` flags) |
| Long-form content | `site/content/*.ts`, behind `site/lib/content.ts` |
| Third-party origins | `INTEGRATIONS` in `site/scripts/csp.mjs` |
| Endpoints and keys | `site/.env.local` |
| Worker config | `workers/*/wrangler.toml` |
| Images | `site/public/brand/` |

`tailwind.config.ts` maps every colour utility onto the CSS variables in
`globals.css`, so it should not need editing per client.

## Shipped but not mounted

Some code has no importer on purpose — it is kit, ready for the page
that needs it, not dead code:

- **Motion and UI primitives:** `BandTransition`, `BeforeAfterSlider`,
  `DrawRule`, `Mark`, `Pending`, `PinnedSteps`, `Stars` in
  `site/components/`.
- **Careers:** `CareersForm`, `Turnstile`, `lib/submitApplication.ts` and
  `content/careers.ts`, waiting on a `/careers/` page (`live: false` in
  `lib/routes.ts`). `workers/careers-upload` is its back end.
