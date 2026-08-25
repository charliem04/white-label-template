# Go-Live Checklist — touch every item before a client site ships

Workflow per client: `git clone` → new repo → work through this list top
to bottom → `npm run deploy`.

## 1. `client.config.ts` — every `TODO(client)` field
- [ ] `businessName`, `legalName`, `tagline`, `subheadline`
- [ ] `siteUrl` (the real production domain, https, no trailing slash)
- [ ] `metaTitle`, `metaDescription`
- [ ] `phone`, `phoneHref` (E.164), `email`
- [ ] `address`, `hours`
- [ ] `mapEmbedSrc` (Google Maps → Share → Embed → copy the iframe `src`)
- [ ] `calLink` (client's Cal.com "username/event" — or `""` to hide booking)
- [ ] `socials` (empty string hides a link)
- [ ] `services` — icons, titles, descriptions
- [ ] `about` — heading, body paragraphs, stats (or `[]`)
- [ ] `testimonials` — REAL reviews only (or `[]` to hide the section)
- [ ] `badges` — real license number(s)
- [ ] `copy` — skim; defaults usually fine

## 2. Images — `/public`
- [ ] Replace `placeholder/logo.svg` (or add real logo + update `logoPath`)
- [ ] Replace hero image slot in `components/Hero.tsx` with a real
      job-site photo/video (see the TODO comment there) + write alt text
- [ ] Replace `placeholder/about.svg` reference + write alt text in
      `components/About.tsx`
- [ ] Create a real 1200×630 OG image, update `ogImagePath`

## 3. Environment — `.env.local` (copy from `.env.example`)
- [ ] `NEXT_PUBLIC_FORM_ENDPOINT` — Formspree URL or Cloudflare Worker.
      Unset = form silently succeeds in demo mode. DO NOT SHIP UNSET.
- [ ] `NEXT_PUBLIC_LEAD_WEBHOOK_URL` — only for Speed-to-Lead clients
- [ ] `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` — or leave empty for no analytics
- [ ] Mirror these in Cloudflare Pages → Settings → Environment variables

## 4. Legal — ⚠️ both pages ship with REPLACE BEFORE LAUNCH banners
- [ ] `app/terms/page.tsx` — review/replace text, set effective date,
      remove the warning banner block
- [ ] `app/privacy/page.tsx` — same, and confirm disclosures match what
      actually runs (analytics on/off, lead webhook on/off)

## 5. Brand
- [ ] `app/globals.css` — set the `--brand*` color tokens
- [ ] Fonts: self-host in `/public/fonts` + `@font-face` if the brand
      needs a webfont; otherwise keep system stacks

## 6. Verify before DNS cutover
- [ ] `npm run build` clean
- [ ] Form submits end-to-end (check inbox AND lead webhook if enabled)
- [ ] Cal.com embed loads and books a test slot
- [ ] Cookie banner: decline → no analytics request in Network tab;
      accept → script loads
- [ ] Lighthouse mobile ≥ 90 performance
- [ ] Rich Results Test on the LocalBusiness JSON-LD
- [ ] tel:/sms: links work from a real phone
- [ ] Grep the repo for `TODO(client)` — must return zero results

## Deploy
```bash
npm run build            # emits ./out (static export)
npx wrangler pages deploy out
```
Then Cloudflare Pages → Custom domains → attach the client domain, and
submit the sitemap (`{siteUrl}/sitemap.xml`) in Google Search Console.
