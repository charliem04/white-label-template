# Go-Live Checklist — touch every item before a client site ships

Workflow per client: `git clone` → new repo → work through this list top
to bottom → `cd site && npm run deploy`. The longer reasoning behind each
item is in [PORTING.md](./PORTING.md) under "What you owe before this
ships", and the runbooks are in [`docs/`](./docs).

## 1. `site/client.config.ts` — every `TODO(client)` field
- [ ] Identity: `businessName`, `legalName`, `tagline` + `taglineEmphasis`,
      `subheadline`, `logoAlt`, `schemaType` (most specific schema.org type
      that genuinely fits — else `LocalBusiness`)
- [ ] `siteUrl` (real production domain, https, no trailing slash)
- [ ] `metaTitle` ≤ 60 chars, `metaDescription` ≤ 160 — `npm run build`
      fails past either
- [ ] `phone`, `phoneHref` (E.164), `smsHref`, `email`
- [ ] `urgentPhone` / `urgentPhoneHref` — or `""` for both to drop every
      urgent-line affordance
- [ ] `address`, `hours`, `hoursShort`, `mapEmbedSrc`
- [ ] `bookingUrl` — the Cal.com (`https://cal.com/<user>/<event>`) or
      Calendly page embedded on `/contact/`, or `""` to hide the band. It
      is NOT where the buttons go; they go to `/contact/`
- [ ] `tracking.dniScriptUrl` — call tracking, or `""`
- [ ] `socials` (empty string hides a link)
- [ ] `form.serviceOptions`, `form.urgencyOptions` — the two dropdowns on
      the work-order sheet; match the jobs the client actually takes
- [ ] `about` — heading, body, photo + alt, `stats` (real figures or `[]`),
      `towns`
- [ ] `testimonials` — REAL quotes only, or `[]` (hides the band)
- [ ] `badges` — real licence number(s), or `[]`
- [ ] `copy` — every heading, lede, CTA and the closing band

## 2. Content — `site/content/*.ts`
- [ ] `services.ts` — one entry per service page; copy the example, then
      delete it. Adds the nav dropdown, sitemap entry and home line
- [ ] `contact.ts`, `careers.ts` — page copy
- [ ] `lib/routes.ts` — flip `live: true` only on pages that exist

## 3. Images — `site/public/brand/`
- [ ] Logo, 1200×630 OG image (JPG — most crawlers ignore SVG), hero,
      about, contact and service photos. Every placeholder SVG there says
      what it is standing in for
- [ ] Real alt text for each, in the config/content that references it

## 4. Brand — `site/app/globals.css`
- [ ] The token block at the top, sampled from the client's logo. Check
      `--ink-faint` on `--surface-alt` and `--accent-ink` on `--accent`
- [ ] The dark-ground accent block right after it — re-check its contrast
- [ ] Fonts: `app/layout.tsx` imports, the `--font-*` stacks and the
      `PRELOAD` pattern in `scripts/fonts.mjs` change together

## 5. Environment — `site/.env.local` (copy from `.env.example`)
- [ ] `NEXT_PUBLIC_WEB3FORMS_KEY` — REQUIRED. Unset, the form refuses and
      tells the visitor to phone. Runbook: `docs/WEB3FORMS-SETUP.md`
- [ ] `NEXT_PUBLIC_LEAD_WEBHOOK_URL` — the lead relay's `/lead`, optional
- [ ] `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` — or empty for no analytics
- [ ] Careers / Turnstile keys, only if `/careers/` goes live
- [ ] Mirror every value in Cloudflare Pages → Settings → Environment
      variables (Production AND Preview)

## 6. Integrations — `site/scripts/csp.mjs`
- [ ] `INTEGRATIONS`: remove what this client does not use (the unused
      scheduler, Plausible, Turnstile, Sanity's CDN) and add the site's
      own origin to `linkOnly`. The build fails on an undeclared origin

## 7. Workers — only the ones this client uses
- [ ] `workers/lead-relay/wrangler.toml` — D1 id, `ALLOWED_ORIGINS`,
      `RELAY_PUBLIC_ORIGIN`, `CRM_ADAPTER`. Read the Access notes before
      deploying: `/resume/` has no code-level auth by design
- [ ] `workers/careers-upload/wrangler.toml` — bucket, `ALLOWED_ORIGINS`,
      Turnstile secret, retention (`npm run retention`)

## 8. Legal — both pages are stubs
- [ ] `app/privacy/page.tsx` — one line per processor actually switched on
      (the list is in the file's comment); none for the ones switched off
- [ ] `app/terms/page.tsx` — written for this client, reviewed by their
      attorney
- [ ] If the résumé retention rule or the Access app is not set up, delete
      the careers page's promise about them

## 9. Verify before DNS cutover (`docs/CUTOVER.md` is the full sequence)
- [ ] `cd site && npm run build` — all five gates green
- [ ] `cd workers/lead-relay && npm test` — 23 passing (Node 22.6+)
- [ ] `npm run check` — no `placeholder-identity` warnings left
- [ ] Grep the repo for `TODO(client)` — zero results
- [ ] Form end-to-end: email arrives, subject leads with the urgency; the
      relay row exists if enabled
- [ ] Booking embed loads behind the consent gate and books a test slot
- [ ] Cookie banner: decline → no analytics request; accept → loads
- [ ] tel:/sms: links from a real phone; Lighthouse mobile; Rich Results
      Test on the JSON-LD

## Deploy
```bash
cd site
npm run build            # emits ./out (static export)
npx wrangler pages deploy out --project-name <client-site>
```
Then Cloudflare Pages → Custom domains → attach the client domain, and
submit `{siteUrl}/sitemap.xml` in Google Search Console.
