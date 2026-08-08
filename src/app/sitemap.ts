import type { MetadataRoute } from "next";
import { getAllProducts, getCategories } from "@/lib/catalog";
import { getAllJournalMeta } from "@/lib/journal";
import { absoluteUrl } from "@/lib/seo";

// Dynamic sitemap: static marketing/legal pages + every category + every product
// in the (Wix or mock) catalog. Revalidated hourly so new products appear without
// a redeploy. Wrapped in try/catch so a Wix hiccup degrades to the static pages
// rather than failing the whole sitemap.
export const revalidate = 3600;

const toAbsolute = (url: string) =>
  url.startsWith("http") ? url : absoluteUrl(url);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/our-story"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/journal"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/faq"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/contact"), lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/shipping-returns"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  let categoryEntries: MetadataRoute.Sitemap = [];
  let productEntries: MetadataRoute.Sitemap = [];

  try {
    const categories = await getCategories();
    categoryEntries = categories.map((c) => ({
      url: absoluteUrl(`/category/${c.slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch (e) {
    console.error("sitemap: category fetch failed", e);
  }

  try {
    const products = await getAllProducts();
    productEntries = products.map((p) => ({
      url: absoluteUrl(`/product/${p.id}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
      images: p.image ? [toAbsolute(p.image)] : undefined,
    }));
  } catch (e) {
    console.error("sitemap: product fetch failed", e);
  }

  // Journal articles are read from the local MDX files — no network, so no
  // try/catch needed, but guard anyway so a bad frontmatter can't blank the map.
  let journalEntries: MetadataRoute.Sitemap = [];
  try {
    journalEntries = getAllJournalMeta().map((post) => ({
      url: absoluteUrl(`/journal/${post.slug}`),
      lastModified: post.updated || post.date ? new Date(post.updated || post.date) : now,
      changeFrequency: "monthly",
      priority: 0.6,
    }));
  } catch (e) {
    console.error("sitemap: journal read failed", e);
  }

  return [...staticEntries, ...journalEntries, ...categoryEntries, ...productEntries];
}
