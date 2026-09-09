import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { test } from "node:test";

const readmePath = new URL("../README.md", import.meta.url);
const assetsDirectory = new URL("../assets/", import.meta.url);
const themedAssets = {
  hero: { dark: "hero-dark.png", light: "hero-light.png", width: 1760, height: 520 },
  maps: { dark: "maps-dark.png", light: "maps-light.png", width: 1760, height: 600 },
};

function readReadme() {
  return readFileSync(readmePath, "utf8");
}

function pngDimensions(url) {
  const image = readFileSync(url);
  const signature = image.subarray(0, 8).toString("hex");
  assert.equal(signature, "89504e470d0a1a0a", "asset is not a PNG");
  return { width: image.readUInt32BE(16), height: image.readUInt32BE(20) };
}

test("the four theme assets are real 2x PNG exports", () => {
  for (const asset of Object.values(themedAssets)) {
    for (const variant of [asset.dark, asset.light]) {
      const url = new URL(variant, assetsDirectory);
      assert.ok(existsSync(url), `missing ${variant}`);
      assert.ok(statSync(url).size > 20_000, `${variant} is unexpectedly small`);
      assert.deepEqual(pngDimensions(url), { width: asset.width, height: asset.height });
    }
  }
});

test("README selects dark and light artwork from one immutable asset commit", () => {
  const readme = readReadme();
  const pins = [];

  for (const [name, asset] of Object.entries(themedAssets)) {
    const block = new RegExp(
      `<picture>\\s*<source media="\\(prefers-color-scheme: dark\\)" srcset="https://cdn\\.jsdelivr\\.net/gh/stefhugo/stefhugo@([0-9a-f]{7,40})/assets/${asset.dark}">\\s*<img src="https://cdn\\.jsdelivr\\.net/gh/stefhugo/stefhugo@([0-9a-f]{7,40})/assets/${asset.light}" alt="[^"]{20,}" width="100%">\\s*</picture>`,
      "m",
    );
    const match = readme.match(block);
    assert.ok(match, `missing theme-aware ${name} picture`);
    assert.equal(match[1], match[2], `${name} variants use different commits`);
    pins.push(match[1]);
  }

  assert.equal(new Set(pins).size, 1, "hero and maps assets must share one immutable commit");
});

test("the immutable asset pin is reachable and contains every published image", () => {
  const readme = readReadme();
  const pin = readme.match(/stefhugo@([0-9a-f]{7,40})\/assets\/hero-dark\.png/)?.[1];
  assert.ok(pin, "missing asset commit pin");
  execFileSync("git", ["merge-base", "--is-ancestor", pin, "HEAD"], { stdio: "pipe" });

  for (const asset of Object.values(themedAssets).flatMap(({ dark, light }) => [dark, light])) {
    const image = execFileSync("git", ["show", `${pin}:assets/${asset}`], { encoding: "buffer" });
    assert.ok(image.length > 20_000, `pinned commit is missing ${asset}`);
  }
});

test("README renders the journey natively and keeps systems collapsed", () => {
  const readme = readReadme();
  assert.match(
    readme,
    /```mermaid\s+flowchart LR\s+A\[Industrial Engineering\] --> B\[Research & Analytics\] --> C\[Technology Recruitment\] --> D\[Systems & Product Building\]\s+```/m,
  );
  assert.match(readme, /<details>\s*<summary><b>Selected systems<\/b><\/summary>/m);
});

test("public navigation contains only the approved destinations", () => {
  const readme = readReadme();
  const approvedUrls = [
    "https://outsidecapital.co.za/",
    "https://www.outsidecapitalmaps.com",
    "https://www.outsidecapitalmaps.com/market-mapping/",
    "https://www.outsidecapitalmaps.com/demo",
    "https://www.linkedin.com/in/stefanhugo",
    "https://github.com/stefhugo",
  ];
  const markdownLinks = [...readme.matchAll(/(?<!!)\[[^\]]+\]\((https:\/\/[^)]+)\)/g)].map((match) => match[1]);
  const htmlLinks = [...readme.matchAll(/<a[^>]+href="(https:\/\/[^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual([...new Set([...markdownLinks, ...htmlLinks])].sort(), approvedUrls.sort());
});

test("public copy retains the approved positioning and complete grouped toolset", () => {
  const readme = readReadme();
  const requiredCopy = [
    "Recruiting talent. Building systems. Improving how business works.",
    "Senior Digital Recruitment Consultant at OutsideCapital",
    "Technology Recruitment",
    "Market & Commercial Intelligence",
    "Recruitment Systems",
    "Business Operations",
    "OutsideCapital Maps",
    "How I work",
    "Experience",
    "JavaScript", "TypeScript", "HTML", "React", "Streamlit", "Google Apps Script", "AppSheet",
    "Python", "SQL", "Excel", "Power BI", "Google Colab", "Jupyter Notebooks",
    "Make", "PowerShell", "Playwright", "Apollo", "Notion",
    "Docker", "Cloudflare", "Supabase", "GitHub", "Microsoft 365", "SharePoint", "Google Sheets",
  ];
  for (const copy of requiredCopy) assert.ok(readme.includes(copy), `missing public copy: ${copy}`);
});

test("public files contain no direct contact details or private-system URLs", () => {
  const publicText = [readReadme()];
  for (const name of readdirSync(assetsDirectory)) {
    if (name.endsWith(".svg")) publicText.push(readFileSync(new URL(name, assetsDirectory), "utf8"));
  }
  const content = publicText.join("\n");
  assert.doesNotMatch(content, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  assert.doesNotMatch(content, /(?:\+?27|0)[\s()-]*\d{2}[\s()-]*\d{3}[\s-]*\d{4}/);
  assert.doesNotMatch(content, /(?:app\.)?notion\.(?:com|so)|docs\.google\.com|script\.google\.com/i);
  assert.doesNotMatch(content, /api[_-]?key|secret|password|token\s*[:=]|-----BEGIN [A-Z ]*PRIVATE KEY-----/i);
});

test("superseded artwork is removed from the curated public asset set", () => {
  assert.deepEqual(readdirSync(assetsDirectory).sort(), ["hero-dark.png", "hero-light.png", "maps-dark.png", "maps-light.png"]);
});
