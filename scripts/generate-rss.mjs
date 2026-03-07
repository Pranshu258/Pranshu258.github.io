/**
 * Generates public/rss.xml from the blog metadata.
 * Run automatically as part of the build via the "generate-rss" npm script.
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Import the plain-JS metadata (no JSX, no dynamic imports, safe for Node)
const { blogMeta } = await import('../src/data/blog-meta.js');

const SITE_URL   = 'https://pranshug.com';
const FEED_URL   = `${SITE_URL}/rss.xml`;
const AUTHOR     = 'Pranshu Gupta';
const TITLE      = `${AUTHOR} — Blog`;
const DESCRIPTION = 'Articles on software engineering, distributed systems, machine learning, data visualization, and more.';

const escapeXml = (str) =>
    str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

const parseDate = (dateStr) => {
    const d = new Date(dateStr);
    // new Date() handles most English date strings; fall back to now if invalid
    return isNaN(d.getTime()) ? new Date() : d;
};

const items = blogMeta
    .map((entry) => {
        const pubDate = parseDate(entry.date).toUTCString();
        const link    = `${SITE_URL}/blog/${entry.slug}`;
        const cats    = entry.tags
            .map((t) => `        <category>${escapeXml(t)}</category>`)
            .join('\n');
        return `    <item>
        <title>${escapeXml(entry.name)}</title>
        <link>${link}</link>
        <guid isPermaLink="true">${link}</guid>
        <pubDate>${pubDate}</pubDate>
        <description>${escapeXml(entry.description)}</description>
${cats}
    </item>`;
    })
    .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(DESCRIPTION)}</description>
    <language>en-us</language>
    <atom:link href="${FEED_URL}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <managingEditor>${AUTHOR}</managingEditor>
    <webMaster>${AUTHOR}</webMaster>
${items}
  </channel>
</rss>
`;

const outPath = resolve(__dirname, '../public/rss.xml');
writeFileSync(outPath, xml, 'utf-8');
console.log(`✓ RSS feed written to ${outPath} (${blogMeta.length} entries)`);
