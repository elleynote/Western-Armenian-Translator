import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const count = (text, needle) => text.split(needle).length - 1;

const layout = read("src/app/layout.tsx");
const homePage = read("src/app/page.tsx");
const sitemap = read("src/app/sitemap.ts");
const robots = read("src/app/robots.ts");
const analytics = read("src/components/GoogleAnalytics.tsx");
const nextConfig = read("next.config.ts");
const redirectsPath = path.join(repoRoot, "public/_redirects");

const title = "Western Armenian Translator | English to Western Armenian Translation";
const description = "Accurate English to Western Armenian translation services. Get free, instant translations from our online Eastern and Western Armenian translator.";
const canonicalOrigin = "https://translatearmenian.com";
const productionNetlifyOrigin = "https://western-armenian-translator1.netlify.app";
const measurementId = "G-V0RC6RM1XM";

if (!layout.includes(`default: "${title}"`)) {
  throw new Error("Exact homepage SEO title is missing from Next.js metadata");
}

if (!layout.includes(`description: "${description}"`)) {
  throw new Error("Exact client meta description is missing from Next.js metadata");
}

if (!layout.includes(`new URL("${canonicalOrigin}")`) && !layout.includes(`siteUrl = "${canonicalOrigin}"`)) {
  throw new Error("Metadata base is not fixed to the translatearmenian.com canonical origin");
}

if (!homePage.includes("alternates") || !homePage.includes('canonical: "/"')) {
  throw new Error("Homepage canonical metadata is missing");
}

if (!sitemap.includes(canonicalOrigin) || sitemap.includes("NEXT_PUBLIC_SITE_URL")) {
  throw new Error("Sitemap must use the fixed translatearmenian.com origin");
}

for (const publicRoute of ["/", "/pricing", "/privacy", "/terms"]) {
  if (!sitemap.includes(`\`${"${siteUrl}"}${publicRoute}\``) && !sitemap.includes(`\`${"${SITE_URL}"}${publicRoute}\``)) {
    throw new Error(`Expected public sitemap route is missing: ${publicRoute}`);
  }
}

if (!robots.includes(`${canonicalOrigin}/sitemap.xml`) || robots.includes("NEXT_PUBLIC_SITE_URL")) {
  throw new Error("robots.txt must reference the canonical translatearmenian.com sitemap");
}

if (!robots.includes('"/admin/"') || !robots.includes('"/dashboard/"') || !robots.includes('"/auth/"')) {
  throw new Error("robots.txt must keep internal application routes out of crawler guidance");
}

if (!fs.existsSync(redirectsPath)) {
  throw new Error("public/_redirects is missing");
}

const redirects = fs.readFileSync(redirectsPath, "utf8");
const expectedRedirect = `${productionNetlifyOrigin}/* ${canonicalOrigin}/:splat 301!`;
if (!redirects.includes(expectedRedirect)) {
  throw new Error("Netlify production hostname redirect is missing or incorrect");
}

if (redirects.includes("deploy-preview")) {
  throw new Error("Deploy Preview URLs must not be redirected to production");
}

if (!analytics.includes(measurementId)) {
  throw new Error("Existing translator-site GA4 measurement ID must be preserved");
}

if (count(layout, "<GoogleAnalytics />") !== 1 || count(analytics, "googletagmanager.com/gtag/js") !== 1) {
  throw new Error("Google Analytics must be mounted exactly once without a duplicate tag loader");
}

for (const requiredCspOrigin of ["https://www.googletagmanager.com", "https://www.google-analytics.com", "https://*.google-analytics.com"]) {
  if (!nextConfig.includes(requiredCspOrigin)) {
    throw new Error(`CSP is missing Google Analytics origin: ${requiredCspOrigin}`);
  }
}

const forbiddenDomain = ["armenian", "verbs.com"].join("");
const ignoredDirectories = new Set([".git", ".next", "node_modules"]);
const textExtensions = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".php", ".sql", ".toml", ".ts", ".tsx", ".txt", ".yaml", ".yml"]);

function scanDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(absolutePath);
      continue;
    }
    const extension = path.extname(entry.name);
    if (!textExtensions.has(extension) && entry.name !== "_redirects") continue;
    const contents = fs.readFileSync(absolutePath, "utf8").toLowerCase();
    if (contents.includes(forbiddenDomain)) {
      throw new Error(`Forbidden armenianverbs.com reference found in ${path.relative(repoRoot, absolutePath)}`);
    }
  }
}

scanDirectory(repoRoot);

console.log("SEO canonical-domain regression checks passed.");
