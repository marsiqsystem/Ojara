"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HONEYPOT_FIELD } from "@/lib/apiGuard";
import { trackEvent } from "@/lib/analytics/capi";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot — humans never fill this
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, [HONEYPOT_FIELD]: company }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Something went wrong.");
      // Meta `Subscribe` — a newsletter opt-in. Pass the email so CAPI hashes it
      // for match quality (the browser Pixel never sees it in plain text).
      trackEvent("Subscribe", {
        customData: { content_name: "Inner Circle Newsletter" },
        userData: { email: email.trim() || undefined },
      });
      setEmail("");
      setSubmitted(true);
      toast.success("✦ Welcome to the Inner Circle. Your journey begins.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="border-y border-champagne-gold/20 bg-sand px-6 pb-28 pt-10">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-xs uppercase tracking-[0.4em] text-champagne-gold">
          Newsletter
        </span>
        <h2 className="mt-6 text-3xl uppercase tracking-[0.15em] text-midnight-navy sm:text-4xl">
          Join the Inner Circle
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-midnight-navy/85">
          Early access to new collections, private releases, and the stories
          behind each stone.
        </p>

        {submitted ? (
          <p className="mt-12 font-heading text-lg uppercase tracking-[0.25em] text-champagne-gold">
            Welcome to the circle.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-12 flex max-w-md flex-col items-stretch gap-6 sm:flex-row sm:items-end"
          >
            {/* Honeypot — off-screen, never focusable. Bots fill it; humans don't. */}
            <input
              type="text"
              name={HONEYPOT_FIELD}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "-9999px",
                width: "1px",
                height: "1px",
                opacity: 0,
              }}
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              aria-label="Email address"
              className="flex-1 rounded-md border border-midnight-navy/30 bg-ivory px-4 py-3 text-center text-sm tracking-wide text-midnight-navy placeholder:text-midnight-navy/50 focus:outline-none focus:border-midnight-navy focus:ring-1 focus:ring-midnight-navy sm:text-left"
            />
            <button
              type="submit"
              disabled={submitting}
              className="cursor-pointer rounded-full bg-midnight-navy px-10 py-3.5 text-xs font-medium uppercase tracking-[0.25em] text-champagne-gold transition-all duration-150 hover:bg-midnight-navy/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Joining…" : "Subscribe"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
