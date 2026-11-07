import "server-only";

import { WIX_ADMIN_ENABLED } from "@/lib/commerce/config";
import { upsertWixContact } from "@/lib/wixContacts";

// Product reviews, stored in the Wix Reviews app (installed 2026-11-07).
//
// Same store Viora uses, but over REST with the API key instead of a logged-in
// member — OJARA lets anyone review with just a name (owner, 2026-11-07). Every
// Wix review needs an author contact, so the server creates one: matched by email
// when the reviewer gives one, otherwise a name-only contact.
//
// Only APPROVED reviews are ever shown. Whether a new review is approved
// automatically or waits for the owner is the moderation setting in the Wix
// dashboard (Reviews → Settings), not code.

export type PublicReview = {
  id: string;
  authorName: string;
  rating: number;
  title?: string;
  body?: string;
  createdDate: string;
  photoUrl?: string;
};

const NAMESPACE = "stores";
const REVIEWS_REVALIDATE = 60;

const headers = () => ({
  Authorization: process.env.WIX_API_KEY!,
  "wix-site-id": process.env.WIX_SITE_ID!,
  "Content-Type": "application/json",
});

// Wix Media URLs come back as wix:image://v1/<file>/<name>#… — browsers can't
// render that, so point at the static CDN instead.
const toHttpsImage = (url?: string) => {
  if (!url) return undefined;
  if (!url.startsWith("wix:image://")) return url;
  const m = url.match(/^wix:image:\/\/v1\/([^/#?]+)/);
  return m ? `https://static.wixstatic.com/media/${m[1]}` : undefined;
};

// Wix returns media[].image as an object ({ id, url, … }); older/SDK shapes use
// a plain wix:image:// string. Accept both.
type WixMedia = { image?: string | { url?: string; id?: string } };
const photoOf = (media?: WixMedia[]) => {
  const img = Array.isArray(media) ? media.find((m) => m?.image)?.image : undefined;
  return toHttpsImage(typeof img === "string" ? img : img?.url);
};

// Wix requires a title; the form doesn't ask for one (fewer fields, more
// reviews), so use the opening words of the review.
const titleFrom = (body: string) => {
  const first = body.trim().split(/(?<=[.!?])\s|\n/)[0].trim();
  if (first.length <= 60) return first;
  const cut = first.slice(0, 57);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 30 ? cut.lastIndexOf(" ") : 57)}…`;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toPublic = (r: any): PublicReview => ({
  id: r.id,
  authorName: r.author?.authorName || "OJARA customer",
  rating: Number(r.content?.rating) || 0,
  title: r.content?.title || undefined,
  body: r.content?.body || undefined,
  createdDate: r.createdDate || new Date().toISOString(),
  photoUrl: photoOf(r.content?.media),
});

/**
 * Approved reviews for these Wix product ids, newest first. A design sold in
 * several colours is several Wix products, so the product page passes all of
 * them and the reviews are pooled. Never throws — a Wix hiccup shows the empty
 * state, not a broken page.
 */
export async function fetchApprovedReviews(wixProductIds: string[]): Promise<PublicReview[]> {
  const ids = wixProductIds.filter(Boolean);
  if (!WIX_ADMIN_ENABLED || ids.length === 0) return [];
  try {
    const res = await fetch("https://www.wixapis.com/reviews/v1/reviews/query", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        query: {
          filter: {
            namespace: NAMESPACE,
            entityId: { $in: ids },
            "moderation.moderationStatus": "APPROVED",
          },
          sort: [{ fieldName: "createdDate", order: "DESC" }],
          cursorPaging: { limit: 100 },
        },
      }),
      next: { revalidate: REVIEWS_REVALIDATE },
    });
    if (!res.ok) {
      console.error("Wix reviews query failed:", res.status, await res.text());
      return [];
    }
    const body = await res.json();
    return (body.reviews ?? [])
      // Belt and braces: never show an unapproved review even if Wix ignored the filter.
      .filter((r: { moderation?: { moderationStatus?: string } }) =>
        !r.moderation?.moderationStatus || r.moderation.moderationStatus === "APPROVED")
      .map(toPublic)
      .filter((r: PublicReview) => r.rating >= 1 && r.rating <= 5);
  } catch (err) {
    console.error("Wix reviews query failed:", err);
    return [];
  }
}

/** Upload the review photo to Wix Media. Best-effort: undefined on any failure. */
async function uploadPhoto(photo: { content: Buffer; contentType: string; filename: string }) {
  try {
    const gen = await fetch("https://www.wixapis.com/site-media/v1/files/generate-upload-url", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ mimeType: photo.contentType, fileName: photo.filename }),
    });
    if (!gen.ok) {
      console.error("Wix upload-url failed:", gen.status, await gen.text());
      return undefined;
    }
    const { uploadUrl } = await gen.json();
    if (!uploadUrl) return undefined;
    const put = await fetch(`${uploadUrl}?filename=${encodeURIComponent(photo.filename)}`, {
      method: "PUT",
      headers: { "Content-Type": photo.contentType },
      body: new Uint8Array(photo.content),
    });
    if (!put.ok) {
      console.error("Wix photo upload failed:", put.status, await put.text());
      return undefined;
    }
    const uploaded = await put.json();
    const file = uploaded?.file;
    return file?.id && file?.url ? { id: String(file.id), url: String(file.url) } : undefined;
  } catch (err) {
    console.error("Wix photo upload failed:", err);
    return undefined;
  }
}

async function authorContactId(name: string, email?: string): Promise<string | undefined> {
  if (email) {
    const res = await upsertWixContact({ email, firstName: name, source: "review" });
    if (res.contactId) return res.contactId;
  }
  try {
    const { wixAdminClientServer } = await import("@/lib/wixAdminClientServer");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wix = wixAdminClientServer() as any;
    const created = await wix.contacts.createContact(
      { name: { first: name.slice(0, 100) } },
      { allowDuplicates: true },
    );
    return created?.contact?._id;
  } catch (err) {
    console.error("Wix name-only contact failed:", err);
    return undefined;
  }
}

export type CreateReviewInput = {
  wixProductId: string;
  name: string;
  email?: string;
  rating: number;
  body: string;
  photo?: { content: Buffer; contentType: string; filename: string } | null;
};

export type CreateReviewResult =
  | { ok: true; reviewId: string; status?: string; photoSaved: boolean }
  | { ok: false; error: string };

/** Save a review into Wix Reviews. Never throws. */
export async function createWixReview(input: CreateReviewInput): Promise<CreateReviewResult> {
  if (!WIX_ADMIN_ENABLED) return { ok: false, error: "Wix not configured" };
  try {
    const name = input.name.trim().slice(0, 100);
    const contactId = await authorContactId(name, input.email?.trim() || undefined);
    if (!contactId) return { ok: false, error: "Could not create the author contact" };

    const photo = input.photo ? await uploadPhoto(input.photo) : undefined;
    const body = input.body.trim().slice(0, 3000);

    const res = await fetch("https://www.wixapis.com/reviews/v1/reviews", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        review: {
          namespace: NAMESPACE,
          entityId: input.wixProductId,
          author: { contactId, authorName: name },
          content: {
            title: titleFrom(body),
            body,
            rating: input.rating,
            ...(photo ? { media: [{ image: photo }] } : {}),
          },
        },
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("Wix createReview failed:", res.status, text);
      return { ok: false, error: `Wix ${res.status}: ${text.slice(0, 300)}` };
    }
    const review = JSON.parse(text)?.review;
    return {
      ok: true,
      reviewId: review?.id,
      status: review?.moderation?.moderationStatus,
      photoSaved: !!photo,
    };
  } catch (err) {
    console.error("Wix createReview failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
