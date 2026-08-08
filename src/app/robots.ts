import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_URL } from "@/lib/seo";

// robots.txt. Search engines and AI crawlers are welcome on the public store;
// only server/API routes and the post-purchase confirmation page are off-limits
// (the cart and checkout are UI drawers/modals, not crawlable routes).
export default function robots(): MetadataRoute.Robots {
  // Transactional / account / server routes carry no SEO value and shouldn't be
  // crawled or surfaced in AI answers. The cart and checkout are UI drawers/modals
  // (no crawlable URL of their own), but the account + auth + confirmation routes
  // are real pages, so they're listed explicitly.
  const disallow = [
    "/api/",
    "/success",
    "/cart",
    "/checkout",
    "/login",
    "/profile",
    "/orders",
    "/account",
  ];

  // Named AI crawlers, explicitly allowed so the store is eligible for AI answers
  // and shopping surfaces. (The wildcard rule already permits them; this makes the
  // intent obvious and survives any future tightening of the wildcard.)
  const aiBots = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "PerplexityBot",
    "Perplexity-User",
    "Google-Extended",
    "ClaudeBot",
    "anthropic-ai",
    "Claude-Web",
    "Applebot-Extended",
    "CCBot",
  ];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      ...aiBots.map((userAgent) => ({ userAgent, allow: "/", disallow })),
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
