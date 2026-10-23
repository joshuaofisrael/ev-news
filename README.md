# EV News Desk

EV News Desk is a fast static site for a daily electric-vehicle desk. It is owned and operated by Joshua Israel Ventures LLC, a Florida limited liability company. The public site name and the canonical URL each live in one place: [`src/_data/site.js`](src/_data/site.js).

The site URL is `https://evnewsdesk.com`. [`CNAME`](CNAME) contains `evnewsdesk.com`, and the build copies that file into the Pages output. The build fails if `CNAME` does not match the hostname of `url`. If `url` ever includes a path, the build uses that path as the prefix.

There is no third-party font host and no advertising tracker. The base layout loads one cookieless Cloudflare Web Analytics beacon (first-party analytics). Its token lives in `src/_data/site.js`.

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
4. Add a hero and about one picture every few paragraphs. The pictures are photoreal, as described under Images. Save each as WebP and AVIF, then fill `hero` and `images`.
5. Run `npm run dev` and open `/articles/YYYY-MM-DD-short-slug/`.
6. When the source list is complete and the copy is checked, remove the `draft` line (or set `draft: false`).
7. Run `npm test`. The production build fails if a published article has no sources, a source is missing `title`, `url`, `publisher`, or `date`, or the story is missing a hero or two body images.
8. Commit and push to `main`. GitHub Actions runs the tests, builds the site, and deploys `_site` to GitHub Pages.

Required front matter:

```yaml
---
title: "Headline"
date: 2026-10-23
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

The byline is **EV News Desk**, from `author` in `src/_data/site.js`. The article template prints the date, that byline, the tags, and a Sources section. Each source title is an outbound link, with the publisher and date beside it.

A published article also needs `title`, `date`, `category`, and `summary`. Those checks fail the build together with the sources check so a public page is not missing its dek or desk.

## Images

Every published article has a hero and at least two body images, about one picture every few paragraphs. Each one is a hyper-realistic photograph of the subject the article is actually about.

Use a photograph, not a drawing. Cartoons, illustrations, anime, flat vector art, and stylised drawings are not article or hero images. Icons, the charge bolt, dividers, and the circuit pattern stay in CSS and SVG. They are interface decoration, not substitutes for those photographs.

Do not depict a real person. Do not stage a fabricated news event, crash, launch, or quote. Leave logos and readable brand names out of the picture. The alt text describes the photograph. The caption is exactly `AI-generated photograph`.

1. Generate or photograph the hero and the body pictures. A 16:9 frame works with the template. Keep each picture tied to that article’s subject.
2. Export each file twice into `src/assets/images/`: `name.webp` and `name.avif`, about 1200 by 675.
3. `src` is the basename (`sample-cars-hero`), never a URL. Until both files are there, the article shows an empty slot naming those two paths.
4. Set `after` to the paragraph number the picture should follow. Paragraphs are the `<p>` blocks, starting at 1. Omit `after` and the template spreads the pictures through the story.

```yaml
hero:
  src: sample-cars-hero
  alt: "Unbranded electric hatchback parked on a quiet residential street, with no people and no readable badges"
  caption: "AI-generated photograph"
  width: 1200
  height: 675
images:
  - src: sample-cars-port
    alt: "Close view of an empty charging port on a generic electric car, with no brand marks"
    caption: "AI-generated photograph"
    after: 2
    width: 1200
    height: 675
  - src: sample-cars-cabin
    alt: "Empty front seats and a blank dashboard inside a generic electric car"
    caption: "AI-generated photograph"
    after: 4
    width: 1200
    height: 675
```

The hero loads immediately once its files are in place. Body images use `loading="lazy"`. Both set width and height.

A genuine press photo is separate. Keep it small, low resolution, and credited. Do not use a stock-agency image. The fields are `image`, `imageAlt`, `imageCaption`, `imageCredit`, `imageSource`, `imageLicense`, `imageWidth`, and `imageHeight`. `imageLicense` is `Original`, `CC0`, `CC-BY`, `CC-BY-SA`, or `Fair use`. Anything except `Original` needs `imageSource`. Fair use stays at most 640 by 480. The template prints the caption, credit, source link, and licence.

The build fails a published story that has no hero, fewer than two body images, a missing or thin alt text, alt text that calls the picture an illustration or drawing, a caption other than `AI-generated photograph`, a missing WebP or AVIF file, or a press photo that is incomplete or points at a stock agency. A draft with the front matter filled in and the files not yet added shows the empty slot instead of a drawing.

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

## Discovery files

The production build writes:

- `/sitemap.xml` for pages and published articles
- `/news-sitemap.xml` for published articles from the last two days
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

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) runs the tests and production build on pull requests and on pushes to `main`. Pushes to `main` upload `_site`, including `CNAME`, and deploy it to GitHub Pages.

`name` is EV News Desk and `url` is `https://evnewsdesk.com`. `contactEmail` is still `desk@example.com` until you change it. The contact page says so, and it does not list a street address.

## Layout

```text
src/_data/site.js          name, url, author, operator, IndexNow key
src/content/posts/         one Markdown file per story
src/_includes/             layouts
lib/validate-posts.js      the publish-time sources check
scripts/ping-indexnow.js   IndexNow submitter
scripts/build-logo.js      regenerates the original mark at src/assets/logo.png
```

The logo and favicon are original geometric marks (a gold bolt on a dark green square). Body text uses the reader’s system fonts so the pages do not wait on a font download.
