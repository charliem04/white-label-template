# Cutover runbook — moving example.com to the new site

`README-DEPLOY.md` covers Pages setup and the pre-launch verification list,
and it covers them well. This file is the part it does not: the DNS mechanics,
the email-survival check, the order of operations, and how to get back if
something goes wrong.

The old example.com is live and DNS still points at it. Nothing in sections
T-14 through T-48h touches it.

---

## The two failure modes this runbook exists to prevent

**1. Company email stops.** Moving nameservers to Cloudflare replaces the
authoritative zone. Anything not recreated in Cloudflare first — MX, SPF,
DKIM, DMARC, vendor CNAMEs — simply ceases to resolve. Mail silently stops
arriving and nobody notices for hours. This is the single most likely way to
make a launch day go badly.

**2. Ranking thrown away.** The old site has URLs indexed by Google and linked
from Facebook. Every one that has no equivalent here returns 404 the moment
DNS moves. `public/_redirects` currently holds **one real rule**. Building the
rest requires crawling the old site, which is only possible while it is still
up.

Both are cheap to prevent and expensive to fix. Everything below is ordered
around them.

---

## T-14 days

- [ ] **Crawl example.com.** Screaming Frog's free tier covers 500 URLs, which
      is more than enough. Export every URL it finds. If the old Search
      Console is accessible, pull the top pages by clicks as well — those are
      the ones whose redirects actually matter.
- [ ] **Fill in `public/_redirects`** from that crawl, mapping each old URL to
      its nearest equivalent. The file's header documents the format. One rule
      per line, 301.
- [ ] **Export the full DNS zone** from the current host. Every record type,
      not just A and CNAME. Save it somewhere durable.
- [ ] **Start the attorney review.** At minimum: terms, privacy, and the
      application questions in `content/careers.ts`.
      Add anything on the site that describes REGULATED ACTIVITY, and read
      it hard. This is the item most likely to be skipped and the most
      expensive to get wrong. Two examples from the build this template
      came from: describing what the business does with an insurance claim
      can cross into public adjusting, which is licensed in most US states;
      anything a finance band implies
      about credit terms is regulated separately again. Whatever the
      vertical is, find its equivalent, and budget days — reviews are not
      same-day.
- [ ] **Decide `www` vs apex** as the canonical hostname, and set `siteUrl` in
      `client.config.ts` to match.

## T-7 days

- [ ] Cloudflare Pages project connected — **root directory `client-site`**,
      build `npm run build`, output `out`, production branch `main`.
- [ ] All environment variables set for **Production and Preview both**
      (`docs/LAUNCH-CREDENTIALS.md` §4).
- [ ] `wrangler d1 create client-leads`, real `database_id` pasted into
      `workers/lead-relay/wrangler.toml`, `npm run schema`, secrets set,
      deployed.
- [ ] careers-upload Worker resolved per the decision taken — if it stays:
      `TURNSTILE_SECRET`, `NOTIFY_WEBHOOK`, `RELAY_INGEST_SECRET`,
      `IP_HASH_SALT`, deployed, **and `npm run retention` run against the real
      bucket**. Without that lifecycle rule the twelve-month retention the
      privacy policy promises is not true.
- [ ] **Remove `https://client-preview.pages.dev` from `ALLOWED_ORIGINS`** in
      both `workers/lead-relay/wrangler.toml` and
      `workers/careers-upload/wrangler.toml`, and redeploy both. It is there
      so the terminal preview can post to them before production exists;
      afterwards it is a third origin allowed to submit to the real relay for
      no reason. Do this after the preview verification below, not before, or
      the verification is what breaks.
- [ ] Confirm `ALLOW_INSECURE_NO_CAPTCHA` is absent from the deployed Worker
      config. It belongs to `[env.dev.vars]` only. It is the one value where a
      copy-paste turns a gated endpoint into an open one.
- [ ] Confirm the R2 bucket is private — no custom domain, no r2.dev URL.
- [ ] Full preview verification per `README-DEPLOY.md` §3, including the check
      most people skip: **submit the contact form with a deliberately wrong
      key and confirm the visitor sees the failure and the phone number, not a
      false success.**

## T-48 hours

- [ ] **Lower TTLs to 300s** on the existing DNS records at the current host.
      This is what makes rollback fast, and it has to happen before the move,
      not during it.
- [ ] **Recreate every non-web record in Cloudflare DNS** — MX, SPF, DKIM,
      DMARC, vendor CNAMEs — from the T-14 export.
- [ ] Verify them against the export, record by record, before going further.
- [ ] Final `npm run build` clean, `npm run check` at 0 errors,
      `grep -rn "TODO(client)"` returning nothing.

## Cutover

- [ ] Pages → Custom domains → add the domain.
- [ ] Move the nameservers.
- [ ] Cloudflare SSL/TLS mode → **Full (strict)**.
- [ ] Set the apex ↔ www redirect for whichever hostname lost the canonical
      decision.
- [ ] **Send and receive a test email on the domain.** Do not declare success
      before this passes.
- [ ] Turn on HSTS in the Cloudflare dashboard. It is deliberately not set in
      `_headers` — committing to it before the domain is fully served over
      HTTPS is hard to undo. Leave `includeSubDomains` and `preload` off for
      the reasons documented at length in `public/_headers`.
- [ ] Add the **WAF rate-limiting rules** on both Worker routes.

## T+1 day

- [ ] Submit `{siteUrl}/sitemap.xml` in Google Search Console.
- [ ] Spot-check the old site's top URLs — they should 301, not 404.
- [ ] Update the website URL on the Google Business Profile. Confirm the name,
      address and phone there match the site exactly; if call tracking was
      adopted, the GBP number must stay the real one.
- [ ] Rich Results Test on the LocalBusiness, `Service`, `FAQPage` and
      `BreadcrumbList` JSON-LD.
- [ ] Lighthouse mobile ≥ 90.
- [ ] Both phone numbers and the text link, from an actual phone.
- [ ] Cookie banner: decline → no Plausible request in the Network tab;
      accept → the script loads.
- [ ] **Real end-to-end lead test.** Submit the contact form and, if the
      careers path is live, a real application. Then confirm both landed:

      curl -H "Authorization: Bearer $EXPORT_TOKEN" https://<relay>/export.csv

      Two rows. The application should also have an object in R2.

## T+7 days

- [ ] Check the Google Places billing against the budget alert. This is the
      only thing on the site that bills per visitor, and launch week is when
      you find out what that costs.
- [ ] Check Search Console for crawl errors and 404s the redirect map missed.
- [ ] Confirm the retry sweep is delivering to the CRM — anything stuck reads
      `crm_status='failed'` with the CRM's own error text in `crm_error`:

      SELECT id, kind, name, crm_attempts, crm_error
        FROM leads WHERE crm_status = 'failed' ORDER BY received_at;

---

## Rollback

Keep the old host paid up for **at least 30 days**. Rollback is moving the
nameservers back, which is why TTLs come down at T-48h — with 300s TTLs the
internet catches up in minutes rather than a day.

Rollback restores the old site and the old DNS zone together. It does not
restore anything captured in the meantime, so if leads have already arrived
through the new forms, export them first:

```bash
curl -H "Authorization: Bearer $EXPORT_TOKEN" https://<relay>/export.csv -o leads.csv
```

---

## After it is done

- Hand over: walk the client's gallery editor through the gallery studio at
  `<hostname>.sanity.studio`, where leads arrive, and how to pull the CSV. A
  short screen recording is worth more here than a document.
- Schedule a recurring `export.csv` pull as a backup. Gallery content is
  already safe in git; the lead book is not.
- Re-read the Facebook reviews snapshot in `content/reviews.ts` and update its
  printed capture date. There is no feed that will do it for you.
