import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import matter from "gray-matter";
import {
  CODE_ENFORCED,
  HIGH_SEVERITY_RULES,
  JUDGEMENT_ONLY,
  canClearByDroppingOptionalImage,
  fileSha256,
  formatHoldReport,
  isReleasedFile,
  isValidClearance,
  loadModerateClearances,
  reviewContent,
  reviewDirectory,
} from "../lib/legal-hold.js";

const root = path.resolve(import.meta.dirname, "..");
const holdDir = path.join(root, "test/fixtures/legal-hold/hold");
const passDir = path.join(root, "test/fixtures/legal-hold/pass");
const holdFile = path.join(holdDir, "2026-10-27-must-hold.md");
const passFile = path.join(passDir, "2026-10-27-must-pass.md");

function runCheck(args) {
  return spawnSync(process.execPath, [path.join(root, "scripts/legal-hold-check.js"), ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

test("code-enforced and judgement-only rules stay distinct", () => {
  assert.deepEqual(
    CODE_ENFORCED.map((rule) => rule.id),
    [1, 3, 4, 5, 6, 7],
  );
  assert.deepEqual(
    JUDGEMENT_ONLY.map((rule) => rule.id),
    [2, 8, "defamation", "headline"],
  );
});

test("the hold fixture fails and the pass fixture is clean and unpublished", () => {
  const held = reviewDirectory(holdDir, { approvals: [] });
  assert.equal(held.ok, false);
  assert.equal(held.blocking.length, 1);
  const rules = new Set(held.blocking[0].flags.map((flag) => flag.rule));
  for (const rule of [1, 3, 4, 5, 6, 7]) assert.ok(rules.has(rule), `missing rule ${rule}`);
  assert.equal(canClearByDroppingOptionalImage(held.blocking[0].flags), false);

  const passed = reviewDirectory(passDir, { approvals: [] });
  assert.equal(passed.ok, true, formatHoldReport(passed));
  assert.equal(passed.passed.length, 1);
  assert.equal(passed.passed[0].flags.length, 0);

  const posts = fs.readdirSync(path.join(root, "src/content/posts"));
  assert.equal(posts.includes("2026-10-27-must-hold.md"), false);
  assert.equal(posts.includes("2026-10-27-must-pass.md"), false);
  assert.equal(fs.existsSync(path.join(root, "src/content/posts", path.basename(passFile))), false);

  const holdRun = runCheck([holdDir]);
  assert.notEqual(holdRun.status, 0, holdRun.stdout + holdRun.stderr);
  assert.match(holdRun.stdout, /Blocking articles: 1/);
  assert.match(holdRun.stdout, /Rule 1/);

  const passRun = runCheck([passDir]);
  assert.equal(passRun.status, 0, passRun.stdout + passRun.stderr);
  assert.match(passRun.stdout, /Blocking articles: 0/);
});

test("HOLD_REVIEW or a matching file hash unlocks a flagged article, and the repo has no approvals", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legal-hold-"));
  const raw = fs.readFileSync(holdFile, "utf8").replace("---\n", "---\nstatus: HOLD_REVIEW\n");
  fs.writeFileSync(path.join(dir, "2026-10-27-must-hold.md"), raw);
  const held = reviewDirectory(dir, { approvals: [] });
  assert.equal(held.ok, true);
  assert.ok(held.articles[0].flags.length > 0);
  assert.equal(held.articles[0].blocking, false);
  assert.equal(held.articles[0].held, true);

  const hash = fileSha256(holdFile);
  const unlocked = reviewDirectory(holdDir, {
    approvals: [{ slug: "2026-10-27-must-hold", sha256: hash }],
  });
  assert.equal(unlocked.ok, true, formatHoldReport(unlocked));
  assert.equal(unlocked.unlocked.length, 1);

  const wrong = reviewDirectory(holdDir, {
    approvals: [{ slug: "2026-10-27-must-hold", sha256: "a".repeat(64) }],
  });
  assert.equal(wrong.ok, false);

  const approvalsPath = path.join(dir, "approvals.json");
  fs.writeFileSync(
    approvalsPath,
    JSON.stringify({ approvals: [{ slug: "2026-10-27-must-hold", sha256: hash }] }),
  );
  const cli = runCheck([holdDir, `--approvals=${approvalsPath}`]);
  assert.equal(cli.status, 0, cli.stdout + cli.stderr);

  const repoApprovals = fs.readFileSync(path.join(root, "content-review/approvals.json"), "utf8");
  assert.match(repoApprovals, /"approvals": \[\]/);
  assert.doesNotMatch(repoApprovals, /must-hold|must-pass/);
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(holdFile)).digest("hex"), hash);

  const repoClearances = fs.readFileSync(path.join(root, "content-review/moderate-clearances.json"), "utf8");
  assert.match(repoClearances, /"clearances": \[\]/);
  assert.deepEqual(loadModerateClearances(), []);
});

test("a moderate clearance unlocks only a moderate hold", () => {
  assert.deepEqual([...HIGH_SEVERITY_RULES], [1, 5, 6]);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legal-hold-moderate-"));
  const moderateBody = `---
status: HOLD_REVIEW
holdTier: moderate
title: "A sourced charger note"
summary: "General information about a mileage display."
sources:
  - title: "Electric Vehicle Myths"
    url: "https://www.epa.gov/greenvehicles/electric-vehicle-myths"
    publisher: "EPA"
    date: 2026-10-27
hero:
  src: fixture-hero
  alt: "Illuminated mileage digits reading 45218 on a dark instrument panel"
  width: 1200
  height: 675
---

General information about electric cars.
`;
  const file = path.join(dir, "2026-10-27-moderate.md");
  fs.writeFileSync(file, moderateBody);
  const hash = fileSha256(file);
  const entry = { slug: "2026-10-27-moderate", sha256: hash, reviewer: "Ada Lovelace", verdict: "clear" };

  const held = reviewDirectory(dir, { approvals: [], clearances: [] });
  assert.equal(held.ok, true, formatHoldReport(held));
  assert.equal(held.articles[0].held, true);
  assert.equal(held.articles[0].moderate, true);
  assert.equal(held.articles[0].blocking, false);
  assert.ok(held.articles[0].flags.some((flag) => flag.rule === 7));

  const cleared = reviewDirectory(dir, { approvals: [], clearances: [entry] });
  assert.equal(cleared.ok, true, formatHoldReport(cleared));
  assert.equal(cleared.articles[0].held, false);
  assert.equal(cleared.articles[0].moderateCleared, true);
  assert.equal(cleared.articles[0].blocking, false);
  assert.equal(cleared.unlocked.length, 1);
  assert.equal(isReleasedFile(file, { approvals: [], clearances: [entry] }), true);

  const rejected = { ...entry, verdict: "hold" };
  assert.equal(isValidClearance(rejected), false);
  const stillHeld = reviewDirectory(dir, { approvals: [], clearances: [rejected] });
  assert.equal(stillHeld.articles[0].held, true);
  assert.equal(stillHeld.articles[0].moderateCleared, false);

  const unnamed = { ...entry, reviewer: " " };
  assert.equal(isValidClearance(unnamed), false);
  assert.equal(reviewDirectory(dir, { approvals: [], clearances: [unnamed] }).articles[0].held, true);

  const wrongHash = reviewDirectory(dir, {
    approvals: [],
    clearances: [{ ...entry, sha256: "b".repeat(64) }],
  });
  assert.equal(wrongHash.articles[0].held, true);

  const unmarkedPath = path.join(dir, "2026-10-27-unmarked.md");
  fs.writeFileSync(unmarkedPath, moderateBody.replace("holdTier: moderate\n", ""));
  const unmarkedHash = fileSha256(unmarkedPath);
  const unmarked = reviewDirectory(dir, {
    approvals: [],
    clearances: [
      entry,
      { slug: "2026-10-27-unmarked", sha256: unmarkedHash, reviewer: "Ada Lovelace", verdict: "clear" },
    ],
  });
  const unmarkedArticle = unmarked.articles.find((article) => article.slug === "2026-10-27-unmarked");
  assert.equal(unmarkedArticle.moderate, false);
  assert.equal(unmarkedArticle.moderateCleared, false);
  assert.equal(unmarkedArticle.held, true);

  const highPath = path.join(dir, "2026-10-27-high.md");
  const highBody = fs
    .readFileSync(holdFile, "utf8")
    .replace("---\n", "---\nstatus: HOLD_REVIEW\nholdTier: moderate\n");
  fs.writeFileSync(highPath, highBody);
  const highHash = fileSha256(highPath);
  const high = reviewDirectory(dir, {
    approvals: [],
    clearances: [
      { slug: "2026-10-27-high", sha256: highHash, reviewer: "Ada Lovelace", verdict: "cleared" },
    ],
  });
  const highArticle = high.articles.find((article) => article.slug === "2026-10-27-high");
  assert.equal(highArticle.moderate, false);
  assert.equal(highArticle.moderateCleared, false);
  assert.equal(highArticle.held, true);
  assert.ok(highArticle.flags.some((flag) => flag.rule === 1));
  assert.equal(isReleasedFile(highPath, { approvals: [], clearances: [
    { slug: "2026-10-27-high", sha256: highHash, reviewer: "Ada Lovelace", verdict: "cleared" },
  ] }), false);

  const clearancesPath = path.join(dir, "moderate-clearances.json");
  fs.writeFileSync(clearancesPath, JSON.stringify({ clearances: [entry] }));
  const cli = runCheck([dir, "--approvals=" + path.join(dir, "missing-approvals.json"), `--clearances=${clearancesPath}`]);
  assert.equal(cli.status, 0, cli.stdout + cli.stderr);
  assert.match(cli.stdout, /2026-10-27-moderate/);
  assert.match(cli.stdout, /UNLOCKED/);
  assert.match(cli.stdout, /HELD 2026-10-27-high/);
});

test("the three repaired stories stay on HOLD_REVIEW, and Kadena is not a moderate hold", () => {
  const posts = path.join(root, "src/content/posts");
  const read = (slug) => matter(fs.readFileSync(path.join(posts, `${slug}.md`), "utf8"));
  for (const slug of [
    "2026-10-27-eved-pay-per-mile-trend",
    "2026-10-25-vw-id-cupra-battery-recall",
    "2026-10-24-tesla-giga-berlin-week",
  ]) {
    const parsed = read(slug);
    assert.equal(parsed.data.status, "HOLD_REVIEW", slug);
    assert.equal(parsed.data.holdTier, "moderate", slug);
    assert.equal(isReleasedFile(path.join(posts, `${slug}.md`)), false, slug);
  }

  const eved = read("2026-10-27-eved-pay-per-mile-trend");
  assert.equal(eved.data.images[0].src, "eved-trend-plug");
  assert.match(eved.data.title, /1 April 2028/);
  assert.match(eved.content, /3 pence per mile/);
  assert.doesNotMatch(eved.content, /Treasury|EnglandUK|Civil Service/);
  assert.equal(
    reviewContent({ data: eved.data, content: eved.content }).some((flag) => flag.rule === 7),
    false,
  );

  const vw = read("2026-10-25-vw-id-cupra-battery-recall");
  assert.match(vw.data.title, /Volkswagen UK and CUPRA UK say the factory is limiting affected cars to an 80 percent charge/);
  assert.match(vw.content, /Volkswagen UK says there are no confirmed cases of personal injury/);
  assert.match(vw.content, /CUPRA UK gives the same two answers/);
  assert.match(vw.content, /Volkswagen Denmark/);
  assert.doesNotMatch(vw.content, /72,668|72,700|Electrek|electrive/);

  const berlin = read("2026-10-24-tesla-giga-berlin-week");
  assert.notEqual(berlin.data.draft, true);
  assert.match(berlin.data.title, /TeslaNorth/);
  assert.match(berlin.data.title, /reportedly/);
  assert.match(berlin.content, /TeslaNorth\]\([^)]+\) writes that Tesla says Giga Berlin built 7,000 Model Y/);
  assert.match(berlin.content, /could not open that post/);
  assert.match(berlin.content, /Drive Tesla Canada's page did not open/);

  const kadena = read("2026-10-27-kadena-air-base-byd-vehicle-ban");
  assert.equal(kadena.data.status, "HOLD_REVIEW");
  assert.equal(kadena.data.holdTier, undefined);
  assert.equal(kadena.data.title, "The 18th Wing has restricted BYD vehicles at Kadena Air Base, citing risk to the mission");
});

test("an optional fair-use image is the only droppable flag, and owned AI images pass", () => {
  const onlyImage = reviewContent({
    data: {
      title: "A sourced charger note",
      summary: "General information about a home charger.",
      sources: [
        {
          title: "Electric Vehicle Myths",
          url: "https://www.epa.gov/greenvehicles/electric-vehicle-myths",
        },
      ],
      hero: {
        src: "fixture-hero",
        alt: "Unbranded home wall charger on a garage wall, with no people and no readable brand names",
      },
      images: [
        {
          src: "fixture-body-a",
          alt: "One empty public charging stall in a small parking lot, with no brand names and no vehicles",
        },
      ],
      image: "press",
      imageLicense: "Fair use",
      imageSource: "https://www.epa.gov/greenvehicles/electric-vehicle-myths",
      imageCredit: "Example Agency",
    },
    content: "The page is general information about electric cars.",
  });
  assert.equal(canClearByDroppingOptionalImage(onlyImage), true);
  assert.equal(onlyImage[0].rule, 3);

  const attribution = reviewContent({
    data: {
      title: "A sourced charger note",
      sources: [{ url: "https://www.epa.gov/greenvehicles/electric-vehicle-myths" }],
      image: "press",
      imageLicense: "CC-BY",
      imagePermission: "https://example.com/credit",
    },
    content: "General information.",
  });
  assert.ok(attribution.some((flag) => flag.rule === 3));

  const owned = reviewContent({
    data: {
      title: "A sourced charger note",
      sources: [{ url: "https://www.epa.gov/greenvehicles/electric-vehicle-myths" }],
      hero: {
        alt: "Unbranded home wall charger on a garage wall, with no people and no readable brand names",
      },
      image: "own-photo",
      imageLicense: "Original",
      imageAlt: "Unbranded home wall charger on a garage wall, with no people and no readable brand names",
    },
    content: "General information about electric cars.",
  });
  assert.deepEqual(owned, []);
});

test("CI runs the legal-hold script before the production build", () => {
  const yml = fs.readFileSync(path.join(root, ".github/workflows/pages.yml"), "utf8");
  const hold = yml.indexOf("legal-hold-check");
  const build = yml.indexOf("npm run build");
  assert.ok(hold > 0);
  assert.ok(build > hold);
});

test("published articles are not blocking", () => {
  const live = reviewDirectory(path.join(root, "src/content/posts"), { approvals: [] });
  assert.equal(live.ok, true, formatHoldReport(live));
});
