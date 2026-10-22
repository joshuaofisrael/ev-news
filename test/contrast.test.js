import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

function channel(hex) {
  const value = Number.parseInt(hex, 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const r = channel(hex.slice(1, 3));
  const g = channel(hex.slice(3, 5));
  const b = channel(hex.slice(5, 7));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

test("text colors in the stylesheet meet WCAG AA", () => {
  const css = fs.readFileSync("src/assets/css/site.css", "utf8");
  const color = (name) => {
    const match = css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`));
    assert.ok(match, `missing --${name}`);
    return match[1];
  };
  const pairs = [
    ["ink", "paper"],
    ["muted", "paper"],
    ["link", "paper"],
    ["ink", "card"],
    ["link", "paper-deep"],
    ["ink", "paper-deep"],
    ["green", "green-soft"],
    ["header-text", "header"],
    ["header-muted", "header"],
    ["gold", "header"],
    ["ink", "banner"],
  ];
  for (const [foreground, background] of pairs) {
    const ratio = contrast(color(foreground), color(background));
    assert.ok(ratio >= 4.5, `${foreground} on ${background} is ${ratio.toFixed(2)}`);
  }
});
