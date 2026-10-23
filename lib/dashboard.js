import fs from "node:fs";
import path from "node:path";

export const BASIS_LABELS = {
  company: "Company statement",
  independent: "Independent source",
  "desk-sum": "Sum of company figures",
};

const REQUIRED = ["label", "unit", "asOf", "sourceName", "sourceUrl", "articleSlug"];

function text(value) {
  return String(value ?? "").trim();
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function spellings(value) {
  if (typeof value === "number") {
    const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 20 }).format(value);
    return [...new Set([String(value), grouped])];
  }
  return [text(value)];
}

export function formatFigureValue(figure) {
  if (text(figure.display)) return text(figure.display);
  if (typeof figure.value === "number") {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 20 }).format(figure.value);
  }
  return text(figure.value);
}

function barWidth(value, scale, max) {
  const width = scale === "share" ? Number(value) : (Number(value) / max) * 100;
  return Math.round(Math.min(100, Math.max(0, width)) * 10) / 10;
}

export function presentDashboard(dashboard) {
  const byId = new Map((dashboard?.figures || []).map((figure) => [figure.id, figure]));
  const tiles = (dashboard?.tileIds || []).map((id) => {
    const figure = byId.get(id);
    return {
      ...figure,
      display: formatFigureValue(figure),
      basisLabel: BASIS_LABELS[figure.basis],
    };
  });
  const charts = (dashboard?.charts || []).map((chart) => {
    const rows = chart.figureIds.map((id) => byId.get(id));
    const max = Math.max(...rows.map((row) => Number(row.value)));
    return {
      ...chart,
      basisLabel: BASIS_LABELS[rows[0].basis],
      sourceName: rows[0].sourceName,
      sourceUrl: rows[0].sourceUrl,
      asOf: rows[0].asOf,
      articleSlug: rows[0].articleSlug,
      rows: rows.map((row) => ({
        ...row,
        display: formatFigureValue(row),
        barWidth: barWidth(row.value, chart.scale, max),
      })),
    };
  });
  return { updated: dashboard?.updated, tiles, charts };
}

export function validateDashboard(dashboard, { postsDir = "src/content/posts" } = {}) {
  const errors = [];
  if (!dashboard || typeof dashboard !== "object") {
    return { ok: false, errors: ["Dashboard data must be an object."] };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text(dashboard.updated))) {
    errors.push("updated must be a YYYY-MM-DD date.");
  }
  if (!Array.isArray(dashboard.figures) || dashboard.figures.length === 0) {
    errors.push("figures must be a non-empty list.");
    return { ok: false, errors };
  }

  const seen = new Set();
  const cache = new Map();
  dashboard.figures.forEach((figure, index) => {
    const where = `figures[${index}]`;
    if (!figure || typeof figure !== "object" || Array.isArray(figure)) {
      errors.push(`${where} must be an object.`);
      return;
    }
    const id = text(figure.id);
    if (!id) errors.push(`${where}.id is required.`);
    else if (seen.has(id)) errors.push(`${where}.id duplicates ${id}.`);
    else seen.add(id);

    for (const field of REQUIRED) {
      if (!text(figure[field])) errors.push(`${where}.${field} is required.`);
    }
    if (!text(figure.sourceUrl)) {
      errors.push(`${where}.sourceUrl is required. A dashboard figure without a source URL fails the build.`);
    } else if (!isHttpUrl(text(figure.sourceUrl))) {
      errors.push(`${where}.sourceUrl must be an absolute http or https URL.`);
    }

    const value = figure.value;
    const valueOk =
      (typeof value === "number" && Number.isFinite(value)) ||
      (typeof value === "string" && text(value) !== "");
    if (!valueOk) errors.push(`${where}.value is required.`);

    if (text(figure.asOf) && !/^\d{4}-\d{2}-\d{2}$/.test(text(figure.asOf))) {
      errors.push(`${where}.asOf must be YYYY-MM-DD.`);
    }
    if (text(figure.basis) && !BASIS_LABELS[figure.basis]) {
      errors.push(`${where}.basis must be company, independent, or desk-sum.`);
    } else if (!text(figure.basis)) {
      errors.push(`${where}.basis is required.`);
    }
    if (figure.note !== undefined && !text(figure.note)) {
      errors.push(`${where}.note must be a non-empty string when set.`);
    }

    const slug = text(figure.articleSlug);
    if (!slug || !text(figure.sourceUrl) || !isHttpUrl(text(figure.sourceUrl)) || !valueOk) return;
    const file = path.join(postsDir, `${slug}.md`);
    if (!cache.has(file)) {
      cache.set(file, fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null);
    }
    const body = cache.get(file);
    if (body === null) {
      errors.push(`${where}.articleSlug does not match a story file (${slug}).`);
      return;
    }
    if (!body.includes(text(figure.sourceUrl))) {
      errors.push(`${where}.sourceUrl is not cited in ${slug}.`);
    }
    const forms = spellings(value);
    if (!forms.some((form) => form && body.includes(form))) {
      errors.push(`${where}.value is not printed in ${slug}.`);
    }
  });

  const used = new Set();
  const take = (id, where) => {
    if (!seen.has(id)) errors.push(`${where} references unknown figure ${id}.`);
    else used.add(id);
  };

  if (!Array.isArray(dashboard.tileIds) || dashboard.tileIds.length === 0) {
    errors.push("tileIds must list the figures shown as tiles.");
  } else {
    dashboard.tileIds.forEach((id, index) => take(id, `tileIds[${index}]`));
  }

  if (!Array.isArray(dashboard.charts) || dashboard.charts.length === 0) {
    errors.push("charts must be a non-empty list.");
  } else {
    dashboard.charts.forEach((chart, index) => {
      const where = `charts[${index}]`;
      if (!text(chart?.title) || !text(chart?.lede)) errors.push(`${where} needs a title and a lede.`);
      if (chart?.scale !== "share" && chart?.scale !== "max") {
        errors.push(`${where}.scale must be share or max.`);
      }
      if (!Array.isArray(chart?.figureIds) || chart.figureIds.length === 0) {
        errors.push(`${where}.figureIds must be a non-empty list.`);
        return;
      }
      const rows = chart.figureIds.map((id, row) => {
        take(id, `${where}.figureIds[${row}]`);
        return dashboard.figures.find((figure) => figure?.id === id);
      });
      if (rows.some((row) => !row || typeof row.value !== "number" || !Number.isFinite(row.value) || row.value < 0)) {
        errors.push(`${where} can only chart finite numbers that are zero or greater.`);
        return;
      }
      const [first] = rows;
      for (const field of ["sourceUrl", "sourceName", "asOf", "articleSlug", "basis", "unit"]) {
        if (rows.some((row) => row[field] !== first[field])) {
          errors.push(`${where} mixes ${field}. One chart keeps one source line.`);
        }
      }
    });
  }

  for (const id of seen) {
    if (!used.has(id)) errors.push(`Figure ${id} is not used in a tile or a chart.`);
  }

  return { ok: errors.length === 0, errors };
}
