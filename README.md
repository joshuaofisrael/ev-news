# EV News Desk

EV News Desk is a fast static site for a daily electric-vehicle desk. The public site name and the canonical URL each live in one place: [`src/_data/site.js`](src/_data/site.js). Ownership and governing law are stated on the Terms page.

The site URL is `https://evnewsdesk.com`. [`CNAME`](CNAME) contains `evnewsdesk.com`, and the build copies that file into the Pages output. The build fails if `CNAME` does not match the hostname of `url`. If `url` ever includes a path, the build uses that path as the prefix.

There is no third-party font host. The base layout loads one cookieless Cloudflare Web Analytics beacon (first-party analytics) and the Google AdSense loader. Pages do not include ad units. The beacon token and the AdSense client id live in `src/_data/site.js`. `/ads.txt` is a single line and is included in the sitemap with the other public URLs. `robots.txt` does not mention it.

## Develop

```bash
npm install
npm test
npm run dev
```

`npm run dev` serves the site at `http://localhost:8080` and includes drafts, so you can read a story before it is public.

`npm run build` is the production build. Drafts are left out of `_site`. `npm run build:preview` writes a draft-inclusive build to `_site-preview`, which must not be deployed.

## Add today’s article

Publish one article a day. Topics can be news, models, batteries, charging, policy, industry, or a how-to. Create a new file. Do not edit the sample drafts into a real story.

1. Add `src/content/posts/YYYY-MM-DD-short-slug.md`. The date in the filename and the `date` field should match the publication date, written as `YYYY-MM-DD`.
2. Copy the front matter below. Keep `draft: true` while you check the sources.
3. Write the story in Markdown. Link claims inline, as described in the next section.
4. Add a hero and about one picture every few paragraphs. The pictures are photoreal, as described under Images. Save each as WebP and AVIF under `src/assets/images/`, then fill `hero` and `images`. Homepage and category banners live in `src/assets/photos/` and are not article images.
5. Run `npm run dev` and open `/articles/YYYY-MM-DD-short-slug/`.
6. When the source list is complete and the copy is checked, remove the `draft` line (or set `draft: false`).
7. Run `npm test`. The production build fails if a published article has no sources, a source is missing `title`, `url`, `publisher`, or `date`, `updatedAt` is missing, or the story is missing a hero, two body images, or alt text. `npm test` also runs the legal-hold check. Do not put a visible AI caption on a picture. The disclosure lives on `/disclaimer/`.
8. Optional: if the story carries a sourced statistic, add that figure to [`src/_data/dashboard.js`](src/_data/dashboard.js) with its label, value, unit, as-of date, source name, source URL, and article slug. The build fails a dashboard figure that has no source URL. Skip this when the story has no figure to add.
9. Commit and push to `main`. GitHub Actions runs the tests, builds the site, and deploys `_site` to GitHub Pages.

Required front matter:

```yaml
---
title: "Headline"
date: 2026-10-23
updatedAt: 2026-10-23
category: Batteries
summary: "One or two sentences. This is the dek and the meta description."
tags:
  - batteries
draft: true
sources:
  - title: "Page title from the publisher"
    url: "https://example.org/the-document"
    publisher: "Publisher name"
    date: 2026-10-20
---
```

`category` must be one of: Cars, Batteries, Charging, Policy, Industry/Business.

`sources` is a list. Every entry needs:

| Field | What to put |
| --- | --- |
| `title` | The title of the source page or document |
| `url` | Absolute `http` or `https` URL |
| `publisher` | Who published it |
| `date` | The publisher’s publication or update date (`YYYY-MM-DD`). If the page shows no date, use the date you recorded the URL and say that in the story |

The byline is **EV News Desk**, from `author` in `src/_data/site.js`. The article template prints the date, a **Last updated** line from `updatedAt`, that byline, the tags, and a Sources section. Each source title is an outbound link, with the publisher and date beside it. `updatedAt` is also `dateModified` in the article’s JSON-LD.

`opinion: true` or `label: opinion`, `label: analysis`, or `label: speculation` prints that label at the top. `disclaimer: health`, `disclaimer: legal`, or `disclaimer: financial` prints a short notice that the piece is not advice.

An AI-generated picture uses `hero` or an `images` entry with `src`, `alt`, `width`, and `height`. `caption` is optional and is not an AI label. Do not put a visible AI caption on the picture. The disclosure lives on `/disclaimer/`. The alt text describes the picture and does not name a real person or stage an event that did not happen. A third-party press image uses `image`, `imageAlt`, `imageCaption`, `imageCredit`, `imageSource`, and `imageLicense`. Credit, source, and licence stay mandatory for a real press photo. The structural image check still limits a fair-use file to 640 by 480. The legal-hold check rejects fair use and attribution-only credits before deploy. Homepage and category photos in `src/assets/photos/` are site art, not story images, so the publish check does not look for them there.

The rules are also on the [Sources & Ethics](src/sources-ethics.njk) page. Corrections go through the [Corrections](src/corrections.njk) page. When a claim is in doubt, leave it out.

A published article also needs `title`, `date`, `category`, and `summary`. Those checks fail the build together with the sources check so a public page is not missing its dek or desk.

## Images

Every published article has a hero and at least two body images, about one picture every few paragraphs. Each one is a hyper-realistic photograph of the subject the article is actually about.

Use a photograph, not a drawing. Cartoons, illustrations, anime, flat vector art, and stylised drawings are not article or hero images. Icons, the charge bolt, dividers, and the circuit pattern stay in CSS and SVG. They are interface decoration, not substitutes for those photographs.

Do not depict a real person. Do not stage a fabricated news event, crash, launch, or quote. Leave logos and readable brand names out of the picture. The alt text describes the photograph. There is no visible AI caption. The disclosure lives on `/disclaimer/`, in the “AI-generated imagery” section.

1. Generate or photograph the hero and the body pictures. A 16:9 frame works with the template. Keep each picture tied to that article’s subject.
2. Export each file twice into `src/assets/images/`: `name.webp` and `name.avif`, about 1200 by 675.
3. `src` is the basename (`sample-cars-hero`), never a URL. Until both files are there, the article shows an empty slot naming those two paths.
4. Set `after` to the paragraph number the picture should follow. Paragraphs are the `<p>` blocks, starting at 1. Omit `after` and the template spreads the pictures through the story.

```yaml
hero:
  src: sample-cars-hero
  alt: "Unbranded electric hatchback parked on a quiet residential street, with no people and no readable badges"
  width: 1200
  height: 675
images:
  - src: sample-cars-port
    alt: "Close view of an empty charging port on a generic electric car, with no brand marks"
    after: 2
    width: 1200
    height: 675
  - src: sample-cars-cabin
    alt: "Empty front seats and a blank dashboard inside a generic electric car"
    after: 4
    width: 1200
    height: 675
```

The hero loads immediately once its files are in place. Body images use `loading="lazy"`. Both set width and height.

A genuine press photo is separate. Keep it small, low resolution, and credited. Do not use a stock-agency image. The fields are `image`, `imageAlt`, `imageCaption`, `imageCredit`, `imageSource`, `imageLicense`, `imageWidth`, and `imageHeight`. `imageLicense` is `Original`, `CC0`, `CC-BY`, `CC-BY-SA`, or `Fair use`. Anything except `Original` needs `imageSource`. Fair use stays at most 640 by 480 in the structural check. That credit does not clear the legal-hold check: fair use and attribution need documented permission, or the optional image has to come out. The template prints the caption, credit, source link, and licence.

The build fails a published story that has no hero, fewer than two body images, a missing or thin alt text, alt text that calls the picture an illustration or drawing, a missing WebP or AVIF file, or a press photo that is incomplete or points at a stock agency. A caption on an AI picture is optional. Do not use it as a visible AI label. The disclosure lives on `/disclaimer/`. Credit, source, and licence stay mandatory for a real press photo. A draft with the front matter filled in and the files not yet added shows the empty slot instead of a drawing.

## Inline citations

The sources list is required. It is not a substitute for linking the claim in the sentence it supports. Use a normal Markdown link on the words a reader would want to check:

```markdown
The U.S. Environmental Protection Agency page
[Electric Vehicle Myths](https://www.epa.gov/greenvehicles/electric-vehicle-myths)
says it was last updated on June 10, 2026.
```

- Prefer the primary document: the agency, regulator, manufacturer, or the outlet that reported the fact.
- Use the publisher’s page title in `sources`, not a paraphrase that changes the claim.
- Every URL in the body should appear in `sources`, and every source should support something in the story.
- Do not invent quotes, numbers, prices, or dates. If a figure is not in the source, leave it out.
- When the page prints a publication or updated date, copy that into `date`. When it does not, use the access date and say so in the copy.
- Inline links are the style. Do not add a footnote plugin.
- The build warns, and does not fail, when a published story has a valid sources list but no inline `https` link. Read that warning before you push. The build does fail when `sources` is empty or incomplete.

## Sample drafts

Two sample posts ship with the repository:

- `src/content/posts/2026-10-22-sample-cars-template.md`
- `src/content/posts/2026-10-21-sample-charging-template.md`

Both are `draft: true` and `sample: true`. They show the template. They are not news reports, and they are omitted from the production site, the sitemap, and the feeds. Do not remove those flags. The build fails if a post marked `sample: true` is not a draft. Write a new file for a real story.

Each sample keeps a hero and two body slots in the front matter. The photograph files are not in the repository. Drop `src/assets/images/<src>.webp` and `<src>.avif` in place and the slot becomes the picture. Use photoreal files of that desk’s subject. Do not drop in a drawing.

`npm run dev` shows them with an unpublished-draft banner so you can check the article layout.

## Legal hold

`scripts/legal-hold-check` runs in CI after the tests and before `npm run build`. `npm test` runs it as well, and the production build runs it again. A flagged article fails the deploy unless the file is `status: HOLD_REVIEW`, `content-review/approvals.json` contains its slug and the sha256 of the exact file bytes, or a moderate clearance matches a moderate hold.

`HOLD_REVIEW` leaves the article out of the build, the sitemap, the news sitemap, RSS, Atom, and IndexNow. IndexNow submits the sitemap, so a held URL is not sent. An approval unlocks that exact file. Changing the file changes the hash and the hold returns. Do not add an approval without a recorded editorial sign-off.

A moderate hold is `status: HOLD_REVIEW` plus `holdTier: moderate`, and it has no flag under rules 1, 5, or 6. `content-review/moderate-clearances.json` unlocks that exact file when `slug`, `sha256`, `reviewer`, and `verdict` are present and `verdict` is `clear`. The same entry does not unlock a high hold, a hold with no tier, or a hold that still trips rules 1, 5, or 6. Those stay on `approvals.json`. Leave the clearances list empty until a named reviewer records the verdict. Do not add a clearance without that sign-off. `HOLD_REVIEW` stays on the file until that entry matches.

Code-enforced rules:

| Rule | What fails the check |
| --- | --- |
| 1 | Keywords: fraud, crime, lawsuit, alleged, misconduct, and close inflections |
| 3 | A third-party image without a licence and a permission source. Fair use and attribution-only fail. Owned AI images pass |
| 4 | No absolute source URL |
| 5 | Personalised medical, legal, tax, or investment instructions |
| 6 | Election wording |
| 7 | An owned AI image of a real person, a real event, or a specific instrument reading |

Judgement-only, not failed by the script: sensitive personal information, legal complaints and embargoes, defamation nuance the keyword list missed, and a headline that is stronger than the evidence. Those still keep a story off the site when a reviewer sets `HOLD_REVIEW`.

The only content change the check allows on an existing story is dropping an optional unlicensed image and running the check again. Anything else that still flags is `HOLD_REVIEW`. Do not rewrite an allegation so the keywords disappear.

## Discovery files

The production build writes:

- `/sitemap.xml` for pages and published articles
- `/news-sitemap.xml` for published articles from the last two days. Each entry has an absolute URL, the publication name and language, a W3C publication date, and the headline. `robots.txt` and `llms.txt` list that file only when it has articles. With none in the window, the file stays valid XML and contains a comment instead of URL entries.
- `/feed.xml` (RSS) and `/atom.xml` (Atom)
- `/robots.txt`, which allows all crawlers, including Googlebot, Bingbot, OAI-SearchBot, GPTBot, PerplexityBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended, and Bytespider
- `/llms.txt`
- `/{indexNowKey}.txt`, the IndexNow key file

The site does not send `noai` or `noimageai` directives.

After `url` is a real host and the site has been deployed, submit the sitemap URLs to IndexNow:

```bash
npm run build
npm run indexnow
```

`npm run indexnow -- --dry-run` prints the JSON payload without sending it. The request is a POST to `https://api.indexnow.org/indexnow` with the host, the key, the key location, and every `<loc>` in `_site/sitemap.xml`. Run it after the site is actually being served at `https://evnewsdesk.com`. If `url` is still a placeholder host such as `example.com`, the script skips the request.

## Pages deploy

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) runs the tests, the legal-hold check, and the production build on pull requests and on pushes to `main`. Pushes to `main` upload `_site`, including `CNAME`, and deploy it to GitHub Pages. A flagged article that is not held fails that job before the upload.

`name` is EV News Desk and `url` is `https://evnewsdesk.com`. `contactEmail` is still `desk@example.com` until you change it. The contact page does not list a street address.

The contact form posts to `contactFormEndpoint` in `src/_data/site.js`. That value is the activated FormSubmit alias, so the inbox address is not in the page source. The form works without JavaScript. The honeypot is `_honey`. A short script also ignores a submit in the first three seconds when JavaScript is on. `/contact/thanks/` is `noindex` and is left out of the sitemap.

## Layout

```text
src/_data/site.js          name, url, author, operator, IndexNow key
src/content/posts/         one Markdown file per story
src/_includes/             layouts
lib/validate-posts.js      the publish-time sources check
lib/legal-hold.js          the pre-publish legal-hold gate
scripts/legal-hold-check   runs the gate; CI calls it before the build
scripts/ping-indexnow.js   IndexNow submitter
content-review/approvals.json  slug plus sha256 unlocks one exact held file
content-review/moderate-clearances.json  slug, sha256, reviewer, and verdict clear unlock one moderate hold
scripts/build-logo.js      regenerates the original mark at src/assets/logo.png
```

The logo and favicon are original geometric marks (a gold bolt on a dark green square). Body text uses the reader’s system fonts so the pages do not wait on a font download.
