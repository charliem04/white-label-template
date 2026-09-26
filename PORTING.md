# Port kit — what this is, where it came from, and what you still owe

> **How this repo differs from the kit as extracted** (ported on
> 2026-09-26 onto the existing white-label template):
>
> - **Skin kept, not replaced.** `app/globals.css` carries the
>   template's work-order skin (paper, warm ink, rubric red, Barlow
>   Condensed) mapped onto the kit's larger token set, plus one new
>   token, `--accent-ink`, for text on the action colour. The accent is
>   re-declared lighter inside dark grounds, where red fails contrast.
> - **Home page built, not scaffolding.** Hero, Services (from
>   `content/services.ts`), About and Testimonials bands, over the
>   kit's Gallery / Contact / CtaBand. Services gained an optional
>   `icon`.
> - **Contact form keeps the urgency dropdown** (`form.urgencyOptions`,
>   required) and the email subject leads with it.
> - **Cal.com supported** alongside Calendly in `lib/booking.ts` and
>   `INTEGRATIONS.frame`; the consent gate names the provider via
>   `schedulerName()`.
> - **No `studio/`.** `scripts/gallery.mjs` only compares the studio's
>   category list when `studio/` exists.
> - **Fixed on the way through:** an empty `urgentPhone` now drops the
>   urgent line everywhere (Footer, UtilityBar, CtaBand, CallCard,
>   Contact, and call tracking, which was logging every call as urgent);
>   `PageTransition`'s hardcoded gold now derives from the tokens; the
>   HubSpot custom-property tests filtered on the old `ctl_` prefix and
>   so asserted nothing; a real-looking name and phone number left in
>   the worker tests and comments were replaced; the home gallery band
>   hides when there are no featured photos.
>
> The rest of this document is the kit's own record, unchanged.

This directory is an extraction from a finished, deployed Next.js marketing
site. It is the **infrastructure** of that build with the client removed: the
build pipeline, the route registry, the motion system, the two Cloudflare
Workers, the CMS wiring and the security posture. It is not a design and it is
not content.

Everything here **builds and passes its own checks as extracted**. That is the
bar it was held to, and it is worth re-running before you change anything, so
that the first failure you see is yours:

```
cd site && npm install && npm run build
cd ../workers/lead-relay && npm install && npm test
```

Expected: 8 pages, CSP applied, 0 unresolved links, harden clean, 23 tests
passing.

---

## What came across, and in what state

### Tier 1 — lifted verbatim, no edits

These had no client in them to begin with. They are the bulk of the value.

**Build pipeline** (`site/scripts/`)

| File | What it does |
|---|---|
| `check.mjs` | Static checker for inherited-default frontend patterns. `--json`, `--strict`, `--only=`, `// deliberate-ignore <rule>` suppressions. Run with `npm run check`. |
| `harden.mjs` | Scans the shipped bytes for real secrets, stray `.env`/sourcemaps/`.git`/editor backups, and asserts the security headers are present. |
| `seo.mjs` | Post-build title ≤60 / description ≤160 invariants, checked against the rendered HTML rather than the source, so it cannot be fooled by how a title is assembled. |
| `routes.mjs` | Resolves every internal link in the built output against the files that exist, fails the build on a dead link, and writes `docs/ROUTE-MAP.md`. |
| `fonts.mjs` | Reads the content-hashed Fontsource filenames out of the built CSS and injects `<link rel="preload">`. Survives `npm update`. |
| `env-file.mjs` | Lets plain-Node build scripts read `.env.local` with Next's precedence. Kills the `export VAR=` vs PowerShell `$env:` split. |
| `preview-build.mjs`, `preview-headers.mjs` | Windows-safe preview pipeline; appends `X-Robots-Tag` to `out/_headers`. |

**Motion system** (`site/lib/motion.ts`, `site/lib/useScrollMotion.ts`)

One vocabulary — two curves, three durations, travel distances, stagger,
viewport thresholds — that every animated component reaches into. Nothing in
`components/` writes a duration of its own, which is what keeps thirty animated
bands reading as one system.

`useStillness()` is the reduced-motion gate, and the comment on it is the
important part: it returns `false` on the server and on the first client render
*on purpose*, because branching a render tree on `useReducedMotion()` directly
causes React error #418 on a static export, and React's recovery is to throw
away the server markup and re-render everything on the client. The one frame in
between is covered by CSS in `globals.css`, not by the hook.

**Motion and UI primitives** (`site/components/`)

`Reveal` / `RevealText` / `RevealGroup`, `Parallax`, `PinnedSteps`,
`BandTransition`, `DrawRule`, `PageTransition`, `SmoothScroll`, `Lightbox`,
`BeforeAfterSlider`, `Button`, `SectionHead`, `MoreLink`, `Breadcrumbs`,
`JsonLd`, `CookieConsent`, `Turnstile`, `StickyCTA`, `CallCard`, `UtilityBar`,
`Stars`, `Pending`, `Mark`, `Analytics`, `InteractionTracking`.

`PinnedSteps` is worth reading before you reach for a pinning library: it does
it with an oversized outer element and a `position: sticky` inner frame, so the
browser does the pinning natively and it survives resize, zoom, find-in-page and
back-button restoration with no recalculation.

**Other verbatim lifts:** `lib/consent.ts`, `lib/tracking.ts`, `lib/phone.ts`,
`tailwind.config.ts`, `next.config.mjs`, `postcss.config.mjs`, `tsconfig.json`,
`public/_headers`, `.nvmrc`.

`public/_headers` carries HSTS with a written-out reason for *not* setting
`includeSubDomains`, and cache tiers split by whether a URL's bytes are
content-hashed. Read that before you "tidy" it.

### Tier 2 — lifted and rewritten to remove the client

| File | What changed |
|---|---|
| `site/client.config.ts` | Every value is now a placeholder with a `TODO(client)`. The comments are the spec and were kept. Added `schemaType`; renamed `stormPhone` → `urgentPhone`; dropped the vertical-specific bands (metal, process, brands, storm). |
| `site/lib/routes.ts` | Generic five-item tree, most children `live: false`. Every function and all the rationale kept. |
| `site/scripts/csp.mjs` | The ~25 hardcoded origins became one `INTEGRATIONS` block at the top, sorted by *what the browser actually does with each one*. The drift check is unchanged and is the thing that earns its keep. |
| `site/scripts/gallery.mjs` | Unchanged logic. It already derived the category list rather than hardcoding it; the three lists it compares are now the placeholder ones. |
| `site/lib/booking.ts` | The Calendly-specific asset host and embed params became a `SCHEDULERS` table keyed by document origin. A scheduler not in the table still works; the table only adds what a specific provider needs. |
| `site/lib/preview.ts`, `components/PreviewBanner.tsx` | `REAL_SITE` now defaults to `""` and the banner drops the link rather than pointing at nothing. Banner copy moved to `PREVIEW_NOTE`. |
| `site/components/JsonLd.tsx` | `@type` reads `client.schemaType`. Empty values are pruned — a schema asserting an empty `telephone` is worse than one that stays quiet. |
| `site/content/types.ts` | Generic `GalleryCategory` union; `parish` → `region`. |
| `site/app/terms/`, `site/app/privacy/` | **Stubs.** The wiring (noindex from the route registry) is intact and correct. The prose was deliberately *not* carried over — see below. |
| `workers/*/wrangler.toml` | Real D1 database id, bucket names, origins and `RELAY_PUBLIC_ORIGIN` replaced with `TODO(client)` placeholders. `CRM_ADAPTER` commented out. |
| `docs/*.md` | Five runbooks de-branded: HubSpot setup, launch credentials, gallery CMS, Web3Forms, cutover. |

### Two bugs found and fixed during extraction

Both were latent in the original and only surfaced because the template's route
tree has non-live top-level entries where the original's did not:

- **`Nav` rendered every top-level item regardless of `live`.** `liveChildren()`
  filtered the dropdowns, but the top level came straight off `nav`. Fixed with
  a `liveNav` filter — same rule, one level up.
- **`Footer`'s second column was a hand-written array of hrefs.** It had already
  rotted twice in the original (a duplicate, then a missed launch), and the
  comments in it say so. It is now a projection of the registry filtered to
  live routes, with only the *ordering* hand-maintained.

Both were caught by `scripts/routes.mjs --check` failing the build. That is the
check doing precisely the job it exists for, on its first run in a new tree.

### Tier 3 — deliberately not carried over

Vertical content and the bands built around it: `content/services.ts` (the real
one), areas, team, reviews, case studies, financing, video, insurance, storm;
`Hero`, `MetalSpec`, `Process`, `Brands`, `About`, `Testimonials`,
`ServiceCards`, `OtherServices`, `StormStrip`, `StormRadar`, `StormWarnings`,
`FinanceProducts`, `PaymentEstimator`, `RoleCards`, `GoogleReviews`,
`ReviewColumns`, `CaseStudyArticle`, `BeforeAfter`.

Also left behind: `lib/nwsRadar.ts` (607 lines), `lib/radarBasemap.ts`,
`scripts/radar-basemap.mjs`, `lib/googleReviews.ts`. All four are good code and
none of them is general. The radar pair is worth reading for the technique —
bake the geography that never changes into committed SVG, fetch only the
volatile layer — which ports even though the code does not.

---

## What you owe before this ships

Ordered by how expensive the mistake is.

1. **Write the legal pages.** `app/privacy/page.tsx` carries, in a comment, the
   full list of processors *this template's own infrastructure* introduces —
   Web3Forms, the lead relay and whatever CRM it forwards to, R2 résumé storage,
   Turnstile, Plausible, call tracking, the booking iframe, and the localStorage
   consent flag. That list is portable and is exactly what a policy has to
   disclose. Every item switched on needs a line; every item switched off must
   not be mentioned. `app/terms/page.tsx` has the equivalent note.

   The careers page promises a résumé is deleted after twelve months and that
   only the business can reach it. Both promises are kept by infrastructure that
   lives outside this repo — the R2 lifecycle rule in
   `workers/careers-upload/scripts/set-retention.sh`, and a Cloudflare Access
   application in front of the relay's `/resume/` route. **If you have not set
   those up, delete the promise.**

2. **Fill in `client.config.ts`.** Search for `TODO(client)`. `npm run check`
   flags the placeholder `555` number and `office@example.com`, which is the
   checker working correctly — those warnings should disappear, not be
   suppressed.

3. **Re-skin `app/globals.css`.** The token block at the top is the only place
   colour is defined; `tailwind.config.ts` maps every utility onto it and should
   not need editing. Sample from the client's logo rather than a palette
   generator, and check `--ink-faint` against `--surface-alt` — that is the pair
   that fails contrast.

4. **Set `INTEGRATIONS` in `scripts/csp.mjs`.** It currently declares what the
   *shipped code* references: Web3Forms, Plausible, Turnstile, Sanity's CDN,
   Calendly. Remove what you are not using. Adding an integration without
   editing this block fails the build, which is the design.

5. **Provision the Workers.** Both `wrangler.toml` files are full of
   `TODO(client)`. The lead relay needs a D1 database created and its id pasted
   in; both need `ALLOWED_ORIGINS`. Read the Access notes in the relay's toml
   before deploying it on any hostname — `GET /resume/:leadId` has **no
   code-level auth by design**, and deploying it on a `*.workers.dev` address
   that Access does not cover leaves job applicants' CVs reachable by anyone
   holding the URL.

6. **Align the three category lists.** `content/types.ts`,
   `content/gallery.ts` and `studio/schemas/galleryCategories.ts`.
   `npm run gallery` fails the build if they disagree, so you will find out.

7. **Decide on the fonts.** `app/layout.tsx` imports and the `--font-*` stacks in
   `globals.css` must change together. `scripts/fonts.mjs` follows the imports
   automatically except for its `PRELOAD` pattern, which names the display face.

---

## Things worth keeping that are easy to throw away

- **`CTA_HREF`.** Every primary button points at `/contact/`, not at the
  scheduler. `client.bookingUrl` means one thing only: which calendar the embed
  on `/contact/` loads. In the original these were the same value, and the
  consequence was that the moment a scheduler URL existed, the nav, the hero,
  the sticky bar and every closing band handed the visitor to a third party
  mid-decision. Keep them separate.

- **Store-then-forward in the lead relay.** Write the row, answer the caller,
  forward afterwards, and let a cron sweep drain the failures. A CRM outage
  becomes a late delivery rather than a lost lead. The forward on the request
  path is *allowed* to fail quietly precisely because the sweep exists.

- **The contact form does not go through your code.** It posts straight to
  Web3Forms. The relay is a second copy, fired un-awaited with a `.catch()`. If
  your Worker is down, the email still arrives. Do not "improve" this by routing
  the form through the relay — the revenue path should not depend on code you
  maintain.

- **The careers Worker has no read path and must not grow one.** The thing that
  accepts anonymous uploads from the internet is the last thing that should also
  be able to serve them. Reading is the relay's job, behind Access.

- **`live: false` over deleting a route.** It is how a page ships: one flag
  reveals the nav item, adds the sitemap entry, drops the noindex and makes the
  breadcrumb resolve.

- **The drift checks.** `csp.mjs` on origins, `gallery.mjs` on categories,
  `routes.mjs` on links, `seo.mjs` on metadata, `harden.mjs` on secrets. Each one
  exists because a specific thing broke silently once. A check that only runs in
  production is a check nobody has run.

---

## Known gaps in this kit

Stated plainly rather than discovered later:

- **`app/page.tsx` is scaffolding**, not a home page. It renders the gallery
  band, the contact band and the closing CTA, and the comment in it describes
  the band order that worked. The hero and the argument bands are yours.
- **`content/services.ts` has one example service**, typed and complete, meant
  to be copied and then deleted.
- **No `/careers/` page is shipped**, though `CareersForm`, `content/careers.ts`
  and the upload Worker all are. The route is `live: false`; build the page and
  flip the flag.
- **No images.** `public/brand/` does not exist yet; every `src` in the config
  and the content skeletons points into it.
- **`studio/` ships schemas and config only** — no `dist/`, and its
  `sanity.config.ts` needs a real project id.
- **The 555 numbers and `example.com` are everywhere on purpose.** `npm run
  check` will tell you where.
