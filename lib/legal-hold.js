import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export const HOLD_STATUS = "HOLD_REVIEW";

export const CODE_ENFORCED = [
  {
    id: 1,
    name: "Damaging-allegation keywords",
    summary:
      "Flags fraud, crime, lawsuit, alleged, misconduct, and the close inflections fraudulent, criminal, allegation, and allegedly.",
  },
  {
    id: 3,
    name: "Image licence and permission",
    summary:
      "Every third-party image needs a licence and a permission source. Fair use and attribution-only credits fail. The desk's own AI images, including hero and body images with no third-party licence, pass.",
  },
  {
    id: 4,
    name: "Source URL",
    summary: "Every article needs at least one absolute http or https source URL.",
  },
  {
    id: 5,
    name: "Personalised advice phrases",
    summary:
      "Flags instructions that tell a reader to invest, buy or sell a security, sue, or take a medical, legal, or tax step. A sentence that only says the piece is not advice does not flag.",
  },
  {
    id: 6,
    name: "Election wording",
    summary:
      "Flags election, ballot, voter, precinct, caucus, midterm, and the other election phrases listed in the checker.",
  },
  {
    id: 7,
    name: "AI image of a real person or event",
    summary:
      "Flags an owned AI image whose alt or caption shows a real person, a real event, or a specific instrument reading that could be mistaken for evidence.",
  },
];

export const JUDGEMENT_ONLY = [
  {
    id: 2,
    name: "Sensitive personal information",
    summary: "Private data about an identifiable person. The checker does not decide this.",
  },
  {
    id: 8,
    name: "Legal complaints and embargoes",
    summary: "A complaint, demand, or embargo on the copy. The checker does not decide this.",
  },
  {
    id: "defamation",
    name: "Defamation nuance",
    summary:
      "A damaging allegation against an identifiable person or organisation that the keyword list did not catch. The checker does not decide this.",
  },
  {
    id: "headline",
    name: "Headline strength",
    summary:
      "A headline that says more than the evidence, implies an affiliation, or other presentation the keyword and image checks do not measure. The checker does not decide this.",
  },
];

const RULE1 =
  /\b(fraud|frauds|fraudulent|crime|crimes|criminal|criminals|lawsuit|lawsuits|alleged|allegedly|allegation|allegations|misconduct)\b/gi;

const RULE6 =
  /\b(elections?|electoral|electorate|ballots?|polling places?|polling stations?|precincts?|caucuses?|caucus|midterms?|primary election|general election|voters?|absentee ballot|mail-in ballot|early voting|get-out-the-vote)\b/gi;

const ADVICE = [
  /\byou should (invest|buy|sell|sue|deduct|withhold|file (?:a |an )?(?:lawsuit|claim)|see a (?:doctor|lawyer|attorney|physician)|take (?:this|these) (?:pill|drug|medication|medicine)s?)\b/i,
  /\b(?:i|we) (?:recommend|advise) (?:that )?you (?:invest|buy|sell|sue|deduct|file)\b/i,
  /\b(?:buy|sell|hold) (?:this|the|these) (?:stock|shares|fund|security|securities)\b/i,
  /\byour (?:diagnosis|prescription|portfolio|tax return)\b/i,
  /\bpersonalised (?:medical|legal|tax|investment|financial) advice\b/i,
  /\bpersonalized (?:medical|legal|tax|investment|financial) advice\b/i,
  /\b(?:this is|here is) (?:my |our )?(?:personalised |personalized )?(?:medical|legal|tax|investment|financial) advice\b/i,
];

const NOT_ADVICE = /\b(not|no|isn't|is not)\b[^.]{0,80}\b(advice|advise)\b/i;

const PERSON_EVENT = [
  /\b(portrait|headshot|mugshot|selfie)\b/i,
  /\b(Mr|Mrs|Ms|Dr|Prof)\.?\s+[A-Z][a-z]+/,
  /\b(?:photo|photograph|picture|image|portrait) of [A-Z][a-z]+ [A-Z][a-z]+\b/,
  /\b(crash site|crash scene|accident scene|crime scene|press conference|body-?cam|cctv|news footage|on the scene)\b/i,
  /\bread(?:ing|s)\s+\d{3,}\b/i,
  /\b(real|actual|genuine)\s+(photo|photograph|footage|picture)\b/i,
];

const OWN_AI = /^(original|ai-generated|ai generated|own|own-work|own work)$/i;
const FAIR_USE = /^(fair\s*use|fair-use)$/i;
const ATTRIBUTION =
  /^(attribution|attribution-only|credit|cc-by|cc-by-sa|cc-by-nc|cc-by-nd|cc-by-nc-sa|cc by|cc by-sa)$/i;
const DOCUMENTED =
  /^(licensed|permission|written permission|written-permission|rights-granted|commissioned|cc0|public domain|public-domain)$/i;

const SUGGESTION = {
  1: "Set status HOLD_REVIEW. Do not soften or delete the allegation to pass. Only a matching slug and sha256 in content-review/approvals.json unlocks the file.",
  3: "Drop this optional image and recheck, or record a licence plus a documented permission source. Fair use and attribution are not enough. An owned AI image is allowed.",
  4: "Add at least one absolute http or https source URL, or set status HOLD_REVIEW. Do not invent a source.",
  5: "Remove the personalised medical, legal, tax, or investment instruction, or set status HOLD_REVIEW. A disclaimer that the piece is not advice does not clear an instruction.",
  6: "Hold the article until the election information is confirmed, or remove the unconfirmed election wording before publication.",
  7: "This AI image reads as a real person, a real event, or a specific piece of evidence. Replace it, or set status HOLD_REVIEW. Do not relabel the picture to sneak it through.",
};

const REQUIRED_IMAGE_SUGGESTION =
  "This image is not an optional press slot. Set status HOLD_REVIEW, or replace it with an owned AI image that does not depict a real person or event. Fair use and attribution are not documented permission.";

export const HIGH_SEVERITY_RULES = new Set([1, 5, 6]);
const CLEAR_VERDICTS = new Set(["clear", "cleared"]);

export function defaultApprovalsPath() {
  return path.resolve("content-review/approvals.json");
}

export function defaultClearancesPath() {
  return path.resolve("content-review/moderate-clearances.json");
}

export function isHoldReview(status) {
  return String(status ?? "").trim() === HOLD_STATUS;
}

export function slugFromFile(filePath) {
  return path.basename(String(filePath)).replace(/\.md$/i, "");
}

export function fileSha256(filePath) {
  const bytes = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

export function loadApprovals(filePath = defaultApprovalsPath()) {
  if (!filePath || !fs.existsSync(filePath)) return [];
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Could not parse approvals file ${filePath}: ${error.message}`);
  }
  const list = Array.isArray(parsed) ? parsed : parsed?.approvals;
  if (!Array.isArray(list)) return [];
  return list.filter(
    (entry) =>
      entry &&
      typeof entry.slug === "string" &&
      entry.slug.trim() &&
      typeof entry.sha256 === "string" &&
      /^[a-f0-9]{64}$/i.test(entry.sha256.trim()),
  );
}

export function isApprovedFile(filePath, approvals = loadApprovals()) {
  if (!filePath || !fs.existsSync(filePath)) return false;
  const slug = slugFromFile(filePath);
  const hash = fileSha256(filePath);
  return approvals.some((entry) => entry.slug === slug && entry.sha256.toLowerCase() === hash);
}

export function isValidClearance(entry) {
  if (!entry || typeof entry !== "object") return false;
  const slug = typeof entry.slug === "string" ? entry.slug.trim() : "";
  const sha = typeof entry.sha256 === "string" ? entry.sha256.trim() : "";
  const reviewer = typeof entry.reviewer === "string" ? entry.reviewer.trim() : "";
  const verdict = typeof entry.verdict === "string" ? entry.verdict.trim().toLowerCase() : "";
  return Boolean(slug && /^[a-f0-9]{64}$/i.test(sha) && reviewer && CLEAR_VERDICTS.has(verdict));
}

export function loadModerateClearances(filePath = defaultClearancesPath()) {
  if (!filePath || !fs.existsSync(filePath)) return [];
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Could not parse moderate clearances file ${filePath}: ${error.message}`);
  }
  const list = Array.isArray(parsed) ? parsed : parsed?.clearances;
  if (!Array.isArray(list)) return [];
  return list.filter(isValidClearance);
}

export function isModerateHold(data, flags = []) {
  if (clean(data?.holdTier).toLowerCase() !== "moderate") return false;
  if (!isHoldReview(data?.status)) return false;
  return !flags.some((flag) => HIGH_SEVERITY_RULES.has(flag.rule));
}

function clearanceMatches(filePath, clearances) {
  if (!filePath || !fs.existsSync(filePath)) return false;
  const slug = slugFromFile(filePath);
  const hash = fileSha256(filePath);
  return clearances.some(
    (entry) => isValidClearance(entry) && entry.slug === slug && entry.sha256.toLowerCase() === hash,
  );
}

export function isModerateClearedFile(filePath, clearances = loadModerateClearances()) {
  if (!clearanceMatches(filePath, clearances)) return false;
  let parsed;
  try {
    parsed = matter(fs.readFileSync(filePath, "utf8"));
  } catch {
    return false;
  }
  const flags = reviewContent({ data: parsed.data, content: parsed.content });
  return isModerateHold(parsed.data, flags);
}

export function isReleasedFile(
  filePath,
  { approvals = loadApprovals(), clearances = loadModerateClearances() } = {},
) {
  if (isApprovedFile(filePath, approvals)) return true;
  return isModerateClearedFile(filePath, clearances);
}

export function canClearByDroppingOptionalImage(flags) {
  return flags.length > 0 && flags.every((flag) => flag.optionalImage === true);
}

function isDraft(value) {
  return value === true || value === "true" || value === "yes";
}

function snippet(text, index, length) {
  const start = Math.max(0, index - 70);
  const end = Math.min(text.length, index + length + 70);
  let slice = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) slice = `…${slice}`;
  if (end < text.length) slice = `${slice}…`;
  return slice;
}

function addFlag(flags, flag) {
  const count = flags.filter((item) => item.rule === flag.rule).length;
  if (count >= 8) return;
  flags.push(flag);
}

function searchText(flags, field, text, regex, rule) {
  if (!text) return;
  const source = String(text);
  const re = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`);
  for (const match of source.matchAll(re)) {
    addFlag(flags, {
      rule: rule.id,
      name: rule.name,
      enforcement: "code",
      field,
      text: snippet(source, match.index ?? 0, match[0].length),
      match: match[0],
      optionalImage: false,
      suggestion: SUGGESTION[rule.id],
    });
  }
}

function textFields(data, content) {
  const fields = [];
  for (const key of ["title", "seoTitle", "summary", "description"]) {
    if (data?.[key]) fields.push([key, String(data[key])]);
  }
  if (content) fields.push(["body", String(content)]);
  const sources = Array.isArray(data?.sources) ? data.sources : [];
  sources.forEach((source, index) => {
    if (source?.title) fields.push([`sources[${index}].title`, String(source.title)]);
  });
  return fields;
}

function sourceUrls(data) {
  if (!Array.isArray(data?.sources)) return [];
  return data.sources
    .map((source) => String(source?.url ?? "").trim())
    .filter((url) => /^https?:\/\/\S+$/i.test(url));
}

function ruleKeywords(flags, data, content) {
  const rule = CODE_ENFORCED.find((item) => item.id === 1);
  for (const [field, text] of textFields(data, content)) searchText(flags, field, text, RULE1, rule);
}

function ruleSources(flags, data) {
  if (sourceUrls(data).length > 0) return;
  addFlag(flags, {
    rule: 4,
    name: "Source URL",
    enforcement: "code",
    field: "sources",
    text: "No absolute http or https source URL.",
    match: "",
    optionalImage: false,
    suggestion: SUGGESTION[4],
  });
}

function ruleAdvice(flags, data, content) {
  const rule = CODE_ENFORCED.find((item) => item.id === 5);
  for (const [field, text] of textFields(data, content)) {
    const parts = String(text).split(/(?<=[.!?])\s+/);
    for (const sentence of parts) {
      if (NOT_ADVICE.test(sentence)) continue;
      for (const pattern of ADVICE) searchText(flags, field, sentence, pattern, rule);
    }
  }
}

function ruleElection(flags, data, content) {
  const rule = CODE_ENFORCED.find((item) => item.id === 6);
  for (const [field, text] of textFields(data, content)) searchText(flags, field, text, RULE6, rule);
}

function clean(value) {
  return String(value ?? "").trim();
}

function isOwnAiImage(kind, licence) {
  if (OWN_AI.test(licence)) return true;
  const aiSlot = kind === "hero" || /^images\[\d+\]$/.test(kind);
  return aiSlot && !licence;
}

function imageRightsProblem(licence, permission) {
  if (!licence || !permission) return "missing";
  if (FAIR_USE.test(licence) || ATTRIBUTION.test(licence)) return "insufficient";
  if (DOCUMENTED.test(licence)) return "";
  return "insufficient";
}

function imageEntries(data) {
  const entries = [];
  if (data?.hero && typeof data.hero === "object" && !Array.isArray(data.hero)) {
    entries.push({
      kind: "hero",
      optional: false,
      alt: data.hero.alt,
      caption: data.hero.caption,
      licence: clean(data.hero.licence || data.hero.license),
      permission: clean(data.hero.permission || data.hero.permissionSource || data.hero.permission_source),
    });
  }
  if (Array.isArray(data?.images)) {
    data.images.forEach((image, index) => {
      if (!image || typeof image !== "object" || Array.isArray(image)) return;
      entries.push({
        kind: `images[${index}]`,
        optional: false,
        alt: image.alt,
        caption: image.caption,
        licence: clean(image.licence || image.license),
        permission: clean(image.permission || image.permissionSource || image.permission_source),
      });
    });
  }
  if (clean(data?.image)) {
    entries.push({
      kind: "image",
      optional: true,
      alt: data.imageAlt,
      caption: data.imageCaption,
      licence: clean(data.imageLicense || data.imageLicence),
      permission: clean(
        data.imagePermission || data.imagePermissionSource || data.permission || data.permissionSource,
      ),
    });
  }
  return entries;
}

function ruleImages(flags, data) {
  for (const entry of imageEntries(data)) {
    if (isOwnAiImage(entry.kind, entry.licence)) {
      const blob = [entry.alt, entry.caption].map((value) => clean(value)).filter(Boolean).join(" ");
      for (const pattern of PERSON_EVENT) {
        const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
        const match = re.exec(blob);
        if (!match) continue;
        addFlag(flags, {
          rule: 7,
          name: "AI image of a real person or event",
          enforcement: "code",
          field: `${entry.kind}.alt`,
          text: snippet(blob, match.index ?? 0, match[0].length),
          match: match[0],
          optionalImage: false,
          suggestion: SUGGESTION[7],
        });
        break;
      }
      continue;
    }

    const problem = imageRightsProblem(entry.licence, entry.permission);
    if (!problem) continue;
    const reason =
      problem === "missing"
        ? "missing a licence, a permission source, or both"
        : "fair use, attribution-only, or another licence that is not documented permission";
    addFlag(flags, {
      rule: 3,
      name: "Unclear content rights",
      enforcement: "code",
      field: entry.kind,
      text: `${entry.kind} is ${reason}. Licence: ${entry.licence || "(missing)"}. Permission source: ${entry.permission || "(missing)"}.`,
      match: entry.licence || "(missing)",
      optionalImage: entry.optional,
      suggestion: entry.optional ? SUGGESTION[3] : REQUIRED_IMAGE_SUGGESTION,
    });
  }
}

export function reviewContent({ data, content }) {
  const flags = [];
  ruleKeywords(flags, data, content);
  ruleSources(flags, data);
  ruleAdvice(flags, data, content);
  ruleElection(flags, data, content);
  ruleImages(flags, data);
  return flags;
}

function articleRecord({ file, slug, data, content, approvals, clearances }) {
  const flags = reviewContent({ data, content });
  const draft = isDraft(data?.draft);
  const approved = file ? isApprovedFile(file, approvals) : false;
  const moderate = isModerateHold(data, flags);
  const moderateCleared = Boolean(file && !approved && moderate && clearanceMatches(file, clearances));
  const released = approved || moderateCleared;
  const held = isHoldReview(data?.status) && !released;
  const blocking = flags.length > 0 && !draft && !held && !released;
  const imageFlags = flags.filter((flag) => flag.rule === 3 || flag.rule === 7);
  let imageAction = "none";
  if (imageFlags.length > 0 && canClearByDroppingOptionalImage(flags)) imageAction = "drop-optional-image";
  else if (imageFlags.length > 0) imageAction = "held";
  return {
    file,
    slug,
    title: clean(data?.title),
    draft,
    status: clean(data?.status),
    sources: sourceUrls(data),
    flags,
    approved,
    moderate,
    moderateCleared,
    held,
    blocking,
    imageAction,
  };
}

export function reviewDirectory(dir, { approvals = loadApprovals(), clearances = loadModerateClearances() } = {}) {
  if (!fs.existsSync(dir)) throw new Error(`Posts directory does not exist: ${dir}`);
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
    .sort();
  const articles = [];
  for (const name of files) {
    const file = path.join(dir, name);
    const slug = slugFromFile(file);
    let parsed;
    try {
      parsed = matter(fs.readFileSync(file, "utf8"));
    } catch (error) {
      articles.push({
        file,
        slug,
        title: "",
        draft: false,
        status: "",
        sources: [],
        flags: [
          {
            rule: 4,
            name: "Source URL",
            enforcement: "code",
            field: "file",
            text: `Could not parse front matter: ${error.message}`,
            match: "",
            optionalImage: false,
            suggestion: SUGGESTION[4],
          },
        ],
        approved: false,
        moderate: false,
        moderateCleared: false,
        held: false,
        blocking: true,
        imageAction: "held",
      });
      continue;
    }
    articles.push(
      articleRecord({ file, slug, data: parsed.data, content: parsed.content, approvals, clearances }),
    );
  }
  const blocking = articles.filter((article) => article.blocking);
  const held = articles.filter((article) => article.held);
  const unlocked = articles.filter(
    (article) => (article.approved || article.moderateCleared) && article.flags.length > 0,
  );
  const passed = articles.filter(
    (article) => !article.draft && !article.blocking && !article.held && article.flags.length === 0,
  );
  return {
    ok: blocking.length === 0,
    dir,
    articles,
    blocking,
    held,
    unlocked,
    passed,
    skippedDrafts: articles.filter((article) => article.draft).length,
  };
}

function legend() {
  const code = CODE_ENFORCED.map((rule) => `  ${rule.id}. ${rule.name}: ${rule.summary}`).join("\n");
  const judgement = JUDGEMENT_ONLY.map((rule) => `  ${rule.id}. ${rule.name}: ${rule.summary}`).join("\n");
  return `Code-enforced (a flagged article fails unless it is HOLD_REVIEW, the approvals file matches this exact file, or a moderate clearance matches a moderate hold):\n${code}\nJudgement-only (this script does not fail the deploy for these):\n${judgement}\nRule 4's check is the source URL only. A quote the desk could not verify, or sources that conflict, still needs a human decision.\nA moderate hold is status HOLD_REVIEW with holdTier moderate and no flag under rules 1, 5, or 6. content-review/moderate-clearances.json unlocks that file when slug, sha256, reviewer, and verdict clear all match. Any other hold needs approvals.json.`;
}

function formatArticle(article) {
  const state = article.blocking
    ? "BLOCK"
    : article.held
      ? "HELD"
      : article.moderateCleared || (article.approved && article.flags.length)
        ? "UNLOCKED"
        : article.draft
          ? "DRAFT"
          : "PASS";
  const lines = [`${state} ${article.slug}${article.title ? ` — ${article.title}` : ""}`];
  if (article.held) {
    lines.push(
      "  status HOLD_REVIEW excludes this file from the build, sitemap, news sitemap, RSS, Atom, and IndexNow.",
    );
  }
  if (article.held && article.moderate) {
    lines.push(
      "  hold tier: moderate. A matching slug, sha256, reviewer, and verdict of clear in content-review/moderate-clearances.json unlocks this file.",
    );
  }
  if (article.moderateCleared) {
    lines.push("  moderate clearance matches this exact file.");
  }
  if (!article.flags.length) return lines.join("\n");
  lines.push(`  image action: ${article.imageAction}`);
  lines.push(`  sources: ${article.sources.length ? article.sources.join(" ") : "(none)"}`);
  for (const flag of article.flags) {
    lines.push(`  Rule ${flag.rule} ${flag.name} [${flag.enforcement}] (${flag.field})`);
    lines.push(`    text: ${flag.text}`);
    lines.push(`    suggestion: ${flag.suggestion}`);
  }
  return lines.join("\n");
}

export function formatHoldReport(result) {
  const interesting = result.articles.filter(
    (article) =>
      article.blocking || article.held || article.flags.length > 0 || article.approved || article.moderateCleared,
  );
  const body = interesting.length
    ? interesting.map(formatArticle).join("\n")
    : "No flagged or held articles.";
  return `${legend()}

Directory: ${result.dir}
Passed: ${result.passed.length}. Held: ${result.held.length}. Unlocked: ${result.unlocked.length}. Skipped drafts: ${result.skippedDrafts}.
Blocking articles: ${result.blocking.length}

${body}`;
}
