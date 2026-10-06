# The gallery CMS

> **Not set up in this repo yet.** There is no `studio/` folder; the
> gallery builds from the committed `site/content/gallery.generated.json`.
> To switch the CMS on, add a Sanity studio at `studio/` (schemas:
> `gallery`, `galleryPhoto`, and `galleryCategories` with the same ids as
> `site/content/types.ts`), then follow this runbook. `npm run gallery`
> starts comparing the studio's category list the moment `studio/`
> exists.

The gallery at `/gallery/`, and the handful of photos on the home page,
are edited at **`https://client-site.sanity.studio`** — a sign-in with a
Sanity account, a list of photos you can drag into order, and a Publish
button. No deploy, no editor, no developer, and no GitHub account.

This document is the one-time setup, then the day-to-day, then what to
do when something goes wrong.

---

## How it works, in one paragraph

The photographs live in a Sanity project. Publishing in the studio fires
a webhook at a Cloudflare Pages **deploy hook**, which rebuilds the
site; the build fetches the published gallery, writes it into
`site/content/gallery.generated.json`, and renders it. The images
themselves are served from Sanity's CDN at a size and crop the build
asks for, so a 12MB phone photo is no longer a 12MB download.

**Nothing appears without a rebuild.** This site is a static export —
there is no server to render a change on request — so the gap between
Publish and the change being live is one Cloudflare build, a minute or
two. That is the trade for a site that costs nothing to run and cannot
be taken down by a database.

The generated file is committed to git, which means the gallery still
has an author, a timestamp and a diff for every change, and would
survive the Sanity project being lost.

---

## One-time setup

About half an hour, once.

> ### Which deployment are you on?
>
> This matters from step 3 onward, because the two are configured in
> completely different places.
>
> **A Git-connected Pages project** — Cloudflare clones the repo and runs
> the build itself. Steps 3 to 5 below are written for this, and it is
> what example.com will be after the domain migration.
>
> **The terminal preview** — `npm run preview:deploy`, which is
> `wrangler pages deploy out` against the `client-preview` project. This is
> a **direct upload**: the build runs on your machine and Cloudflare only
> receives the finished `out/` directory. It never builds anything, so
> **nothing in the Pages dashboard reaches it** — not environment
> variables, not a deploy hook. The site is a static export with no Pages
> Functions, so there is no runtime there to read a variable either.
>
> Until the migration, the terminal preview is the only deployment that
> exists. The notes marked **On the terminal preview** below are the ones
> to follow; the surrounding instructions stay correct and become live
> the day the Git-connected project is created.

### 1. Create the Sanity project

At [sanity.io/manage](https://www.sanity.io/manage) → **Create new
project**. Name it `Example Company`, dataset `production`.

The project should be **owned by the client's own Sanity organisation**, not by
a developer's personal account — the same rule as the GitHub repository.
Moving it later is possible and is one more thing to remember.

Note the **Project ID** from the project's dashboard. It is public: it
appears in the URL of every photograph the site serves.

### 2. Configure and deploy the studio

The studio lives in `studio/` once you have added one (see the note at
the top of this file).

```bash
cd studio
cp .env.example .env        # fill in SANITY_STUDIO_PROJECT_ID
npm install
npm run dev                 # http://localhost:3333, to look at it
npm run deploy              # publishes to <hostname>.sanity.studio
```

`npm run deploy` asks for a hostname the first time. `client-site` gives
`https://client-site.sanity.studio`, which is the URL the office uses.

### 3. Tell the site where the gallery is

In **Cloudflare Pages → the `client-site` project → Settings →
Environment variables**, for **Production and Preview both**:

```
SANITY_PROJECT_ID = <the project id from step 1>
SANITY_DATASET    = production
```

If the dataset is private (sanity.io/manage → API → **Dataset
visibility**), also add, as an **encrypted** variable:

```
SANITY_READ_TOKEN = <a Viewer-role token>
```

None of these is `NEXT_PUBLIC_`, and the token must never be renamed to
one. `NEXT_PUBLIC_` means "compile this into the JavaScript the browser
downloads", which for a read token would publish read access to the
whole dataset. `scripts/harden.mjs` fails the build if the token's value
— or anything shaped like a Sanity token — reaches `out/`.

Until `SANITY_PROJECT_ID` is set, the build uses the committed
`content/gallery.generated.json` and says so in the log. The site is
correct; it just cannot see anything published since that file was
written.

> **On the terminal preview:** put these in `site/.env.local`
> instead, alongside `NEXT_PUBLIC_WEB3FORMS_KEY`. The build runs on your
> machine, so that file is where it looks.
>
> ```
> SANITY_PROJECT_ID=<the project id from step 1>
> SANITY_DATASET=production
> ```
>
> `.env.example` already carries both names with empty values — fill
> those lines in rather than adding new ones at the bottom. Either works
> (`scripts/env-file.mjs` treats an empty assignment as a placeholder
> rather than a value, precisely because this file is meant to be copied
> half-filled), but one definition per variable is easier to read.
>
> Nothing to export, and nothing platform-specific: this is the same
> file and the same syntax on PowerShell, cmd and bash alike. A real
> environment variable still wins if one is set, which is what keeps a
> Cloudflare build authoritative.
>
> Keeping the dataset **public** while you work this way is the simpler
> path: no `SANITY_READ_TOKEN`, so no read credential to leak into a
> build you are iterating on.

### 4. Wire Publish to a rebuild

Two halves. Both are needed, and the gap between them is the single most
common reason for "I published and nothing happened".

> **On the terminal preview: skip this step — it cannot be built yet.**
> A deploy hook triggers a build *on Cloudflare*, and a direct-upload
> project has no build to trigger. There is nothing for a Sanity webhook
> to call, so create both halves the day the Git-connected project
> exists, not before.
>
> Until then the loop is manual, and the gallery step is inside the
> build, so this is the whole of it:
>
> ```bash
> npm run preview:deploy
> ```
>
> Worth being straight with the client about what that means: **the
> office cannot publish a photo and watch it appear** until production
> is wired. Publishing works, and a developer has to deploy. That is the
> single thing this step exists to remove, and it is the last thing to
> get switched on.

**The deploy hook**, in Cloudflare Pages → the project → **Settings →
Builds & deployments → Deploy hooks** → *Add deploy hook*:

| Field | Value |
| --- | --- |
| Name | `sanity-gallery` |
| Branch | `main` |

It gives you a URL ending in a long random id. **Treat that URL as a
secret** — anyone holding it can trigger a build at any rate they like.

**The webhook**, at sanity.io/manage → the project → **API → Webhooks**
→ *Create webhook*:

| Field | Value |
| --- | --- |
| Name | `Rebuild example.com` |
| URL | the deploy hook URL from above |
| Dataset | `production` |
| Trigger on | **Create, Update, Delete** |
| Filter | `_type == "gallery"` |
| Projection | *(leave empty)* |
| HTTP method | `POST` |
| API version | `v2021-03-25` |
| Drafts | **off** |

The filter matters. Without it every asset upload and every draft
keystroke fires a build, and Cloudflare's build minutes are finite.
Drafts off matters for the same reason: an editor saving as they type
should not be deploying as they type.

### 5. Check it end to end

Change a caption in the studio, press Publish, and watch:

1. Sanity → API → Webhooks → the webhook's **delivery log** shows a 200.
2. Cloudflare Pages → Deployments shows a build starting, triggered by
   *Deploy hook*.
3. The build log shows `[gallery] fetched <n> photos from sanity:…`.
4. `/gallery/` shows the new caption.

If any step is silent, that is the step to fix. Each one is a different
problem — see Troubleshooting.

> **On the terminal preview**, the first two steps do not exist. Change
> a caption, press Publish, then:
>
> ```bash
> npm run preview:deploy
> ```
>
> 1. The output shows `[gallery] fetched <n> photos from sanity:…`. If it
>    says `SANITY_PROJECT_ID is not set — using the committed gallery`
>    instead, the export did not take: re-read the note in step 3.
> 2. `git diff content/gallery.generated.json` shows your caption, and
>    the `source` line now reading `sanity:<project>/<dataset>` rather
>    than `placeholder — no CMS configured yet`. **Commit it** —
>    that file is what gives the gallery a history and what the build
>    falls back to.
> 3. `/gallery/` on the preview URL shows the new caption.
>
> Fewer steps, and every failure is local and legible rather than buried
> in a remote build log. `npm run preview:deploy` runs the gallery step
> inside the build and refuses to deploy if it fails, so there is no
> separate command to remember and no way to ship a stale gallery by
> forgetting one.

---

## Day to day

Open the studio, click **Gallery**.

- **Add a photo** — the *Add item* control at the bottom of the list,
  then upload the image and fill in the fields.
- **Reorder** — drag. The order in the list is the order on the page.
- **Remove** — the item's menu → *Remove*. The image stays in Sanity's
  asset library, so it is recoverable.
- **Home page** — tick *Also show on the home page*. Keep it to around
  eight; that band is a taste of the work, not the whole gallery.
- **Publish** — nothing reaches the site until you press it.

### The fields

| Field | Notes |
| --- | --- |
| **Photo** | The image itself. Upload the largest version you have — see below. |
| **Alt text** | Required. What is actually in the frame. |
| **Caption** | The short line under the photo. Optional. |
| **Kind of work** | Which filter it appears under, and which service page it links to. |
| **Also show on the home page** | The featured band. |

### Alt text is not optional

It is what a blind visitor's screen reader reads aloud, and it is what
Google Images indexes — which for a local business is a real source of
work. Describe the frame:

> ✅ "Two technicians fitting a new unit against the side of a brick
> house"
> ❌ "photo", "IMG_4471", "Example Company Springfield contractor"

The third one is keyword stuffing. Google has been discounting it since
roughly 2012 and screen-reader users find it useless.

The studio will not let you publish a photo without it. The build checks
again anyway, and fails naming the photo — see below for why.

### About photo size

**Upload the full-size photo.** This is the opposite of the old advice
and it is now correct: Sanity stores the original and the site asks its
CDN for a 1600px-wide version for the lightbox and a 640×480 crop for
the grid. Resizing before uploading throws away quality the site would
otherwise have on a large screen.

### Cropping

Click a photo, then the crop tool. Drag the circle to set the **focal
point** — the part that must survive the grid's 4:3 crop. The build
honours it, so the subject is not cut out of the tile.

---

## What the build checks

`scripts/gallery.mjs` runs before every build and fails it, with a
message naming the photo, if:

- a photo has no alt text, or under three characters of it
- a category is not one of the ids in the `GalleryCategory` union in
  `content/types.ts`
- the same photograph is in the list twice
- Sanity reports no pixel dimensions for an image
- the studio's category list has drifted from the site's own

**Why alt text is checked here when the field is already required.**
"Required" in the studio means its form will not let you press Publish.
It does not mean the dataset cannot contain a photo without alt text —
an import script, the CLI, or a token and `curl` write straight to the
API, which does not run the studio's validation. A build that stops and
names the photograph is the check that cannot be bypassed.

**Why the categories are checked three ways.** The kinds of work
are a business fact, not a content entry: each maps to a service page
that has to exist. So they are a TypeScript union in
`content/types.ts`, a list of labels and routes in `content/gallery.ts`,
and a dropdown in `studio/schemas/galleryCategories.ts` — and the build
reads all three and fails if any disagree. Adding a category means
editing all three in one commit, on purpose.

If a bad entry ever does reach the site, `content/gallery.ts` drops that
one photo rather than letting the page fail — a missing photo is
recoverable, a broken `/gallery/` in the client's busiest week is not.

---

## Troubleshooting

**Published, and nothing happened.** Work through step 5 above in order.
The webhook delivery log is the first place to look: no delivery means
the filter is wrong or the trigger is off; a delivery with a 4xx means
the deploy hook URL is wrong or was regenerated.

**The build failed.** The log names the photograph and the reason. The
published gallery is untouched and the previous deployment stays live,
so fix it in the studio and publish again. Nothing is lost.

**`[gallery] SANITY_PROJECT_ID is not set` in a production build.** The
environment variable is missing from Cloudflare, or was set on
Production but not Preview. The build succeeds using the committed
snapshot, which is why this is easy to miss.

**The same line from `npm run preview:deploy`.** Different cause: that
build runs on your machine, so the value is missing from
`site/.env.local` and setting it in Cloudflare will not help.
Check that the line has a value and not just the empty `SANITY_PROJECT_ID=`
that `.env.example` ships. Step 3.

**`Sanity returned 403`.** The dataset is private and
`SANITY_READ_TOKEN` is missing, wrong, or was revoked.

**A photo looks stretched or badly cropped.** Set its focal point in the
studio's crop tool and publish. The grid's 4:3 crop is taken around it.

**Someone needs access.** sanity.io/manage → the project → **Members** →
*Invite*. Removing someone there removes their access to the gallery in
the same motion.
