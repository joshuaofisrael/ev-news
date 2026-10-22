export function normalizeSiteUrl(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Site URL must use http or https: ${url}`);
  }
  parsed.hash = "";
  parsed.search = "";
  const path = parsed.pathname.replace(/\/+$/, "");
  return `${parsed.origin}${path}`;
}

export function pathPrefixFromSiteUrl(url) {
  const pathname = new URL(normalizeSiteUrl(url)).pathname;
  if (!pathname || pathname === "/") return "/";
  return `${pathname}/`;
}

export function absoluteUrl(siteUrl, pageUrl) {
  const raw = String(pageUrl ?? "");
  if (/^https?:\/\//i.test(raw)) return raw;
  const origin = new URL(normalizeSiteUrl(siteUrl)).origin;
  const prefix = pathPrefixFromSiteUrl(siteUrl);
  let path = raw.startsWith("/") ? raw : `/${raw}`;
  if (prefix !== "/" && path !== prefix.slice(0, -1) && !path.startsWith(prefix)) {
    path = `${prefix.slice(0, -1)}${path}`;
  }
  return new URL(path, origin).href;
}

export function prefixRootUrls(html, prefix) {
  if (!prefix || prefix === "/") return html;
  const base = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  return html.replace(
    /(\s(?:href|src|action)=["'])(\/(?!\/)[^"']*)(["'])/g,
    (full, attr, path, quote) => {
      if (path === base || path.startsWith(`${base}/`)) return full;
      return `${attr}${base}${path}${quote}`;
    },
  );
}
