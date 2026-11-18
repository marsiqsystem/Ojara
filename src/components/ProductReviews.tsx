"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { HONEYPOT_FIELD } from "@/lib/apiGuard";
import type { PublicReview } from "@/lib/reviews";

// Max bytes for the optional customer photo. Mirrors the API's limit so we fail
// fast in the browser instead of uploading 8MB and getting a 400 back.
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

function Stars({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  const interactive = Boolean(onChange);

  return (
    <div className="flex items-center gap-1" role={interactive ? "radiogroup" : undefined} aria-label={interactive ? "Rating" : undefined}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= active;
        const star = (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            className={filled ? "text-champagne-gold" : "text-midnight-navy/25"}
            aria-hidden="true"
          >
            <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
          </svg>
        );
        if (!interactive) return <span key={n}>{star}</span>;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => onChange?.(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="cursor-pointer transition-transform duration-150 hover:scale-110 active:scale-95"
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}

const formatReviewDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

function ReviewCard({ review }: { review: PublicReview }) {
  return (
    <li className="rounded-2xl border border-champagne-gold/25 bg-ivory p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Stars value={review.rating} size={16} />
        <span className="text-xs text-midnight-navy/45">{formatReviewDate(review.createdDate)}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-midnight-navy">{review.authorName}</p>
      {review.title && <p className="mt-2 font-heading text-base text-midnight-navy">{review.title}</p>}
      {review.body && (
        <p className="mt-1 whitespace-pre-line text-sm leading-6 text-midnight-navy/75">{review.body}</p>
      )}
      {review.photoUrl && (
        <a href={review.photoUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block">
          <Image
            src={review.photoUrl}
            alt={`Photo from ${review.authorName}`}
            width={112}
            height={112}
            unoptimized
            className="h-28 w-28 rounded-lg border border-champagne-gold/30 object-cover"
          />
        </a>
      )}
    </li>
  );
}

export default function ProductReviews({
  productId,
  wixProductId,
  productName,
  adorn = false,
  reviews = [],
}: {
  productId: string;
  /** The Wix product the review is saved against. */
  wixProductId?: string;
  productName: string;
  /** Stone jewellery — no "cleansed and charged" promise. */
  adorn?: boolean;
  /** Approved Wix reviews (lib/reviews.ts), newest first. */
  reviews?: PublicReview[];
}) {
  const [showAll, setShowAll] = useState(false);
  const count = reviews.length;
  const average = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  const visible = showAll ? reviews : reviews.slice(0, 5);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [review, setReview] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fieldClass =
    "w-full rounded-md border border-champagne-gold/40 bg-ivory px-4 py-3 text-sm text-midnight-navy placeholder:text-midnight-navy/40 transition-all duration-150 focus:border-champagne-gold focus:outline-none focus:ring-2 focus:ring-champagne-gold/30";

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("That photo is too large (max 4MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(typeof reader.result === "string" ? reader.result : null);
      setPhotoName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (rating < 1) {
      toast.error("Please choose a star rating.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          wixProductId,
          productName,
          rating,
          name,
          email,
          review,
          photo,
          [HONEYPOT_FIELD]: company,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Something went wrong.");
      setSubmitted(true);
      setOpen(false);
      toast.success("✦ Thank you — your review has been received.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="reviews" className="mt-10 scroll-mt-28 border-t border-champagne-gold/25 pt-8">
      <h2 className="font-heading text-2xl uppercase tracking-[0.1em] text-midnight-navy">
        Reviews
      </h2>

      {count > 0 ? (
        <>
          <div className="mt-4 flex items-center gap-3">
            <Stars value={Math.round(average)} size={20} />
            <span className="text-sm text-midnight-navy/70">
              <span className="font-semibold text-midnight-navy">{average.toFixed(1)}</span> out of 5 ·{" "}
              {count} review{count > 1 ? "s" : ""}
            </span>
          </div>
          <ul className="mt-5 flex flex-col gap-4">
            {visible.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </ul>
          {count > visible.length && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-4 cursor-pointer text-sm text-midnight-navy underline underline-offset-4 hover:text-midnight-navy/70"
            >
              Show all {count} reviews
            </button>
          )}
        </>
      ) : (
        // No approved reviews yet — say so rather than invent any.
        <div className="mt-5 rounded-2xl border border-champagne-gold/25 bg-sand/30 px-4 sm:px-6 py-8 text-center">
          <p className="mx-auto max-w-md font-heading text-base leading-7 text-midnight-navy/75">
            ✦ OJARA is a new chapter. Our reviews are yet to be written — but the
            promise already stands:{" "}
            {adorn
              ? "every piece is checked and packed with care before it reaches you."
              : "every piece is checked, cleansed, and charged before it reaches you."}
          </p>
          <div className="mx-auto my-5 h-px w-16 bg-champagne-gold/40" />
          <p className="mx-auto max-w-md text-sm leading-6 text-midnight-navy/60">
            Your journey with OJARA matters to us. We invite you to share your
            experience and become part of our story.
          </p>
        </div>
      )}

      {submitted ? (
        <p className="mt-6 text-center text-sm text-midnight-navy/70">
          ✦ Thank you — your review is with our team and will appear here once
          approved.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full border border-midnight-navy px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-midnight-navy transition-colors hover:bg-midnight-navy hover:text-champagne-gold active:scale-95"
        >
          <span className="text-base leading-none">{open ? "−" : "+"}</span>
          Add your review
        </button>
      )}

      {open && !submitted && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-5 rounded-2xl border border-champagne-gold/25 bg-ivory p-6 animate-fade-in-up"
        >
          {/* Honeypot — off-screen, never focusable. */}
          <input
            type="text"
            name={HONEYPOT_FIELD}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
          />

          <div>
            <span className="mb-2 block text-[0.65rem] uppercase tracking-[0.25em] text-midnight-navy/70">
              Your rating
            </span>
            <Stars value={rating} onChange={setRating} />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="review-name" className="mb-2 block text-[0.65rem] uppercase tracking-[0.25em] text-midnight-navy/70">
                Your name
              </label>
              <input
                id="review-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aditi S."
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="review-email" className="mb-2 block text-[0.65rem] uppercase tracking-[0.25em] text-midnight-navy/70">
                Email <span className="normal-case tracking-normal text-midnight-navy/40">(optional)</span>
              </label>
              <input
                id="review-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="review-body" className="mb-2 block text-[0.65rem] uppercase tracking-[0.25em] text-midnight-navy/70">
              Your review
            </label>
            <textarea
              id="review-body"
              required
              rows={5}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="How has this piece worked for you?"
              className={`${fieldClass} resize-y`}
            />
          </div>

          <div>
            <span className="mb-2 block text-[0.65rem] uppercase tracking-[0.25em] text-midnight-navy/70">
              Add a photo <span className="normal-case tracking-normal text-midnight-navy/40">(optional, max 4MB)</span>
            </span>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer rounded-full border border-midnight-navy/30 px-5 py-2.5 text-xs uppercase tracking-[0.15em] text-midnight-navy transition-colors hover:border-midnight-navy active:scale-95">
                Choose photo
                <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              </label>
              {photo && (
                <span className="flex items-center gap-3">
                  <Image
                    src={photo}
                    alt="Your photo preview"
                    width={48}
                    height={48}
                    unoptimized
                    className="h-12 w-12 rounded-md border border-champagne-gold/30 object-cover"
                  />
                  <span className="max-w-[10rem] truncate text-xs text-midnight-navy/60">{photoName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPhoto(null);
                      setPhotoName("");
                    }}
                    className="cursor-pointer text-xs text-midnight-navy/50 underline underline-offset-2 hover:text-midnight-navy"
                  >
                    Remove
                  </button>
                </span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 w-full cursor-pointer rounded-full bg-midnight-navy px-8 py-4 text-xs font-semibold uppercase tracking-[0.25em] text-champagne-gold transition-all duration-150 hover:bg-midnight-navy/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:self-start sm:px-12"
          >
            {submitting ? "Sending…" : "Submit review"}
          </button>
        </form>
      )}
    </section>
  );
}
