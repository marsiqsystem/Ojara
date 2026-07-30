"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HONEYPOT_FIELD } from "@/lib/apiGuard";
import { trackEvent } from "@/lib/analytics/capi";

const titles = ["Mr", "Ms", "Mrs", "Mx", "Dr"] as const;

const fieldClass =
  "w-full rounded-md border border-champagne-gold/40 bg-ivory px-4 py-3 text-sm text-midnight-navy placeholder:text-midnight-navy/40 transition-all duration-150 ease-out focus:border-champagne-gold focus:outline-none focus:ring-2 focus:ring-champagne-gold/30";
const labelClass =
  "mb-2 block text-[0.65rem] uppercase tracking-[0.25em] text-midnight-navy/70";

export default function ContactForm() {
  const [title, setTitle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState(""); // honeypot — humans never fill this
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          firstName,
          lastName,
          email,
          query,
          [HONEYPOT_FIELD]: company,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Something went wrong.");
      // Meta `Contact` — a support/enquiry message. Names hashed server-side by CAPI.
      trackEvent("Contact", {
        userData: {
          email: email.trim() || undefined,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
        },
      });
      setSubmitted(true);
      toast.success("✦ Message sent. We'll be in touch shortly.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-champagne-gold/30 bg-sand/40 p-10 text-center">
        <p className="font-heading text-2xl text-midnight-navy">Message sent</p>
        <p className="mt-3 text-sm leading-6 text-midnight-navy/70">
          Thank you for reaching out. Our team will reply to{" "}
          <span className="text-midnight-navy">{email}</span> as soon as we can.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setTitle("");
            setFirstName("");
            setLastName("");
            setEmail("");
            setQuery("");
          }}
          className="mt-6 cursor-pointer text-xs uppercase tracking-[0.2em] text-champagne-gold transition-colors hover:text-midnight-navy active:scale-95"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

      <div>
        <label htmlFor="contact-title" className={labelClass}>
          Title
        </label>
        <select
          id="contact-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`${fieldClass} cursor-pointer`}
        >
          <option value="">Select title</option>
          {titles.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-first" className={labelClass}>
            First name
          </label>
          <input
            id="contact-first"
            type="text"
            required
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Aditi"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="contact-last" className={labelClass}>
            Last name
          </label>
          <input
            id="contact-last"
            type="text"
            required
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Sharma"
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-email" className={labelClass}>
          Email address
        </label>
        <input
          id="contact-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="contact-query" className={labelClass}>
          Your message
        </label>
        <textarea
          id="contact-query"
          required
          rows={6}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="How can we help you?"
          className={`${fieldClass} resize-y`}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 w-full cursor-pointer rounded-full bg-midnight-navy px-8 py-4 text-xs font-semibold uppercase tracking-[0.25em] text-champagne-gold transition-all duration-150 hover:bg-midnight-navy/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
