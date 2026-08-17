#!/usr/bin/env node
/**
 * update-shows.js — scrape the band's Concert Archives page into shows.json.
 *
 * Usage: node scripts/update-shows.mjs
 * Writes shows.json in the repo root. Exits non-zero (leaving the previous
 * shows.json untouched) if the fetch fails or parsing yields zero shows, so
 * the scheduled workflow fails visibly instead of committing empty data.
 *
 * No dependencies — needs Node 18+ (global fetch).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SOURCE = 'https://www.concertarchives.org/bands/exoplasm';
const OUT = path.join(__dirname, '..', 'shows.json');

// The site 403s non-browser clients; a browser UA is required.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const MONTHS = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function text(html) {
  return decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function parseRow(tr) {
  const cells = tr.match(/<td[\s\S]*?<\/td>/g) || [];
  if (cells.length < 4) return null;

  const dateMatch = text(cells[0]).match(/([A-Z][a-z]{2}) (\d{1,2}), (\d{4})/);
  if (!dateMatch) return null; // years-table / header rows land here
  const [, mon, day, year] = dateMatch;
  if (!MONTHS[mon]) return null;

  const titleLink = cells[1].match(/<a href="(\/concerts\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/);
  const tourMatch = cells[1].match(/<p class="tour-title[^"]*">([\s\S]*?)<\/p>/);
  const bandsMatch = cells[1].match(/<span class="display-bands-on-index[^"]*">([\s\S]*?)<\/span>/);
  const venueMatch = cells[2].match(/<a href="\/venues\/[^"]*"[^>]*>([\s\S]*?)<\/a>/);
  const locMatch = cells[3].match(/<a href="\/locations\/[^"]*"[^>]*>([\s\S]*?)<\/a>/);

  return {
    date: `${year}-${MONTHS[mon]}-${day.padStart(2, '0')}`,
    title: titleLink ? text(titleLink[2]) : text(cells[1]),
    tour: tourMatch ? text(tourMatch[1]) : null,
    bands: bandsMatch ? text(bandsMatch[1]) : null,
    venue: venueMatch ? text(venueMatch[1]) : null,
    location: locMatch ? text(locMatch[1]) : null,
    upcoming: /title="Upcoming Concert"/.test(cells[0]),
    url: titleLink ? `https://www.concertarchives.org${decode(titleLink[1])}` : SOURCE,
  };
}

async function main() {
  // Direct fetch works from residential IPs; GitHub Actions runners are
  // blocked by Concert Archives' bot protection, so CI routes through
  // ScrapingBee (SCRAPINGBEE_API_KEY secret). render_js=false: the tables
  // are server-rendered, and it costs 1 credit instead of 5.
  const key = process.env.SCRAPINGBEE_API_KEY;
  const target = key
    ? `https://app.scrapingbee.com/api/v1/?api_key=${key}&render_js=false&url=${encodeURIComponent(SOURCE)}`
    : SOURCE;
  const res = await fetch(target, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
  });
  if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}${key ? ' (via proxy)' : ''}`);
  const html = await res.text();

  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
  const seen = new Set(); // duplicate-concerts tables repeat the same date
  const shows = [];
  for (const tr of rows) {
    const show = parseRow(tr);
    if (!show || seen.has(show.date)) continue;
    seen.add(show.date);
    shows.push(show);
  }
  if (shows.length === 0) {
    throw new Error('Parsed 0 shows — page layout may have changed. shows.json left untouched.');
  }

  shows.sort((a, b) => b.date.localeCompare(a.date));
  const payload = {
    updated: new Date().toISOString(),
    source: SOURCE,
    shows,
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');
  const up = shows.filter((s) => s.upcoming).length;
  console.log(`Wrote ${shows.length} shows (${up} upcoming) to ${OUT}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
