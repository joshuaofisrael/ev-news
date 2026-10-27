import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  CODE_ENFORCED,
  JUDGEMENT_ONLY,
  canClearByDroppingOptionalImage,
  fileSha256,
  formatHoldReport,
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
