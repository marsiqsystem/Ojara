import "server-only";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

// Reads the MDX journal from content/journal/*.mdx at build/request time.
// Frontmatter drives the catalog + per-article <head> metadata + JSON-LD; the MDX
// body is rendered on the article page via next-mdx-remote/rsc.

const JOURNAL_DIR = path.join(process.cwd(), "content", "journal");

export type JournalMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  keywords: string[];
  image?: string;
  readingMinutes: number;
};

export type JournalPost = JournalMeta & { content: string };

const readingMinutes = (text: string) => {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
};

const slugFromFile = (file: string) => file.replace(/\.mdx?$/, "");

function readPost(file: string): JournalPost {
  const raw = fs.readFileSync(path.join(JOURNAL_DIR, file), "utf8");
  const { data, content } = matter(raw);
  return {
    slug: slugFromFile(file),
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    date: String(data.date ?? ""),
    updated: data.updated ? String(data.updated) : undefined,
    keywords: Array.isArray(data.keywords) ? data.keywords.map(String) : [],
    image: data.image ? String(data.image) : undefined,
    readingMinutes: readingMinutes(content),
    content,
  };
}

/** All journal files (safe if the directory doesn't exist yet). */
function journalFiles(): string[] {
  if (!fs.existsSync(JOURNAL_DIR)) return [];
  return fs.readdirSync(JOURNAL_DIR).filter((f) => /\.mdx?$/.test(f));
}

/** Every article's metadata, newest first (no MDX body). */
export function getAllJournalMeta(): JournalMeta[] {
  return journalFiles()
    .map((f) => {
      const { content: _content, ...meta } = readPost(f);
      void _content;
      return meta;
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** All slugs — for generateStaticParams. */
export function getJournalSlugs(): string[] {
  return journalFiles().map(slugFromFile);
}

/** One article by slug, with its MDX body. Returns null if not found. */
export function getJournalPost(slug: string): JournalPost | null {
  const file = journalFiles().find((f) => slugFromFile(f) === slug);
  return file ? readPost(file) : null;
}
