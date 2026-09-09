import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";

const readmePath = new URL("../README.md", import.meta.url);
const desktopAssetNames = ["hero.svg", "journey.svg", "market-map.svg", "stack.svg"];
const mobileAssetNames = ["hero-mobile.svg", "journey-mobile.svg", "market-map-mobile.svg", "stack-mobile.svg"];
const assetNames = [...desktopAssetNames, ...mobileAssetNames];
const assetUrls = assetNames.map((name) => new URL(`../assets/${name}`, import.meta.url));
const publicImageNames = ["hero.png", "journey.png", "market-map.png", "stack.png"];
const publicImageUrls = publicImageNames.map((name) => new URL(`../assets/${name}`, import.meta.url));

function readReadme() {
  return readFileSync(readmePath, "utf8");
}

test("profile contains the approved narrative and section structure", () => {
  const readme = readReadme();
  const requiredCopy = [
    "Recruiting talent. Building systems. Improving how business works.",
    "Technology Recruitment",
    "Market & Commercial Intelligence",
    "Recruitment Systems",
    "Business Operations",
    "OutsideCapital Maps",
    "How I work",
    "Working across",
    "Experience",
  ];

  for (const text of requiredCopy) {
    assert.match(readme, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("profile exposes only the approved public destinations", () => {
  const readme = readReadme();
  const approvedUrls = [
    "https://outsidecapital.co.za/",
    "https://www.outsidecapitalmaps.com/market-mapping/",
    "https://www.outsidecapitalmaps.com/demo",
    "https://www.linkedin.com/in/stefanhugo",
    "https://github.com/stefhugo",
  ];

  for (const url of approvedUrls) assert.ok(readme.includes(url), `missing ${url}`);

  const remoteUrls = [...readme.matchAll(/https:\/\/[^\s)\]">]+/g)].map(([url]) => url);
  assert.deepEqual([...new Set(remoteUrls)].sort(), approvedUrls.sort());
});

test("profile includes every approved working tool", () => {
  const readme = readReadme();
  const tools = [
    "JavaScript", "TypeScript", "HTML", "React", "Streamlit", "Google Apps Script", "AppSheet",
    "Python", "SQL", "Excel", "Power BI", "Google Colab", "Jupyter Notebooks",
    "Make", "PowerShell", "Playwright", "Apollo", "Notion",
    "Docker", "Cloudflare", "Supabase", "GitHub", "Microsoft 365", "SharePoint", "Google Sheets",
  ];

  for (const tool of tools) assert.ok(readme.includes(tool), `missing tool: ${tool}`);
});

test("profile contains no direct contact details or private-system URLs", () => {
  const readme = readReadme();
  assert.doesNotMatch(readme, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  assert.doesNotMatch(readme, /(?:\+?27|0)[\s()-]*\d{2}[\s()-]*\d{3}[\s-]*\d{4}/);
  assert.doesNotMatch(readme, /(?:app\.)?notion\.(?:com|so)|docs\.google\.com|script\.google\.com/i);
  assert.doesNotMatch(readme, /api[_-]?key|secret|password|token\s*[:=]/i);
});

test("all local profile artwork exists and is safe, responsive SVG", () => {
  for (const [index, url] of assetUrls.entries()) {
    assert.ok(existsSync(url), `missing asset: ${assetNames[index]}`);
    const svg = readFileSync(url, "utf8");
    assert.match(svg, /^<svg\b/);
    assert.match(svg, /viewBox="0 0 (?:720|1200) \d+"/);
    assert.doesNotMatch(svg, /<script\b|javascript:|(?:href|src)="https?:\/\//i);
    assert.doesNotMatch(svg, /(?:app\.)?notion\.(?:com|so)|docs\.google\.com|script\.google\.com/i);
  }
});

test("every public profile image is embedded with meaningful alt text", () => {
  const readme = readReadme();
  for (const asset of publicImageNames) {
    const escaped = asset.replace(".", "\\.");
    const markdownImage = new RegExp(`!\\[[^\\]]{12,}\\]\\(\\./assets/${escaped}\\)`);
    assert.ok(markdownImage.test(readme), `missing accessible embed: ${asset}`);
  }
});

test("artwork uses repository-local PNGs through GitHub-compatible Markdown", () => {
  const readme = readReadme();
  assert.doesNotMatch(readme, /<picture>|<source\b|<img\b/i);
  for (const [index, asset] of publicImageNames.entries()) {
    assert.ok(existsSync(publicImageUrls[index]), `missing public image: ${asset}`);
    assert.ok(statSync(publicImageUrls[index]).size > 1000, `empty public image: ${asset}`);
    const escaped = asset.replace(".", "\\.");
    assert.match(readme, new RegExp(`!\\[[^\\]]{12,}\\]\\(\\./assets/${escaped}\\)`));
  }
});
