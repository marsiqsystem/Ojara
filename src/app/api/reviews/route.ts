import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { SUPPORT_EMAIL, BRAND_NAME } from "@/lib/commerce/config";
import { brandMarkHtml, logoAttachments } from "@/lib/emailBrand";
import { isValidEmail } from "@/lib/validateEmail";
import { getAllProducts } from "@/lib/catalog";
import { createWixReview } from "@/lib/reviews";
import {
  isHoneypotFilled,
  isRateLimited,
  isSameOrigin,
  clientIp,
} from "@/lib/apiGuard";

// Product review submissions.
//
// STORAGE: the Wix Reviews app (installed 2026-11-07). Each review is saved there
// (lib/reviews.ts) and appears on the product page once its moderation status is
// APPROVED — auto or manual is the owner's setting in the Wix dashboard. The owner
// also still gets every review by email, so nothing is lost if Wix is down.

const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // 4MB — Gmail rejects large attachments

const escapeHtml = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { productId, wixProductId, productName, rating, name, email, review, photo } = body;

    // Bot filled the honeypot: pretend success, send nothing.
    if (isHoneypotFilled(body)) {
      return NextResponse.json({ ok: true });
    }
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    if (isRateLimited(`reviews:${clientIp(req)}`)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const stars = Number(rating);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return NextResponse.json(
        { error: "Please choose a rating between 1 and 5 stars." },
        { status: 400 },
      );
    }
    if (!name?.trim() || !review?.trim()) {
      return NextResponse.json(
        { error: "Please add your name and your review." },
        { status: 400 },
      );
    }
    if (email?.trim() && !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    // Photo is optional. Arrives as a data URL; reject anything oversized or
    // not an image rather than handing Gmail a bad attachment.
    let photoAttachment: {
      filename: string;
      content: Buffer;
      contentType: string;
    } | null = null;

    if (typeof photo === "string" && photo.startsWith("data:image/")) {
      const m = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(photo);
      if (!m) {
        return NextResponse.json(
          { error: "That image couldn't be read. Please try another." },
          { status: 400 },
        );
      }
      const [, contentType, b64] = m;
      const buf = Buffer.from(b64, "base64");
      if (buf.byteLength > MAX_PHOTO_BYTES) {
        return NextResponse.json(
          { error: "That photo is too large (max 4MB)." },
          { status: 400 },
        );
      }
      photoAttachment = {
        filename: `review-photo.${contentType.split("/")[1].replace("+xml", "")}`,
        content: buf,
        contentType,
      };
    }

    // Save into Wix Reviews — only against a product that really is in the
    // catalogue, so nobody can post reviews onto arbitrary ids.
    const catalog = await getAllProducts().catch(() => []);
    const known = typeof wixProductId === "string"
      && catalog.some((p) => p.wixCatalogItemId === wixProductId);
    const saved = known
      ? await createWixReview({
          wixProductId,
          name: String(name),
          email: email?.trim() || undefined,
          rating: stars,
          body: String(review),
          photo: photoAttachment,
        })
      : ({ ok: false, error: "unknown product" } as const);
    const savedLine = saved.ok
      ? `Saved in Wix Reviews (status: ${saved.status || "unknown"}${photoAttachment ? saved.photoSaved ? ", photo saved" : ", photo NOT saved" : ""}).`
      : `NOT saved in Wix Reviews (${saved.error}). Add it by hand if you want it on the site.`;

    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    if (!gmailUser || !gmailAppPassword) {
      console.error("GMAIL_USER or GMAIL_APP_PASSWORD missing from env.");
      if (saved.ok) return NextResponse.json({ ok: true, status: saved.status });
      return NextResponse.json(
        { error: "Reviews are temporarily unavailable." },
        { status: 500 },
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailAppPassword },
    });

    const starsHtml = "★".repeat(stars) + "☆".repeat(5 - stars);

    const mail = transporter.sendMail({
      from: `"${BRAND_NAME} Website" <${gmailUser}>`,
      to: SUPPORT_EMAIL,
      ...(email?.trim()
        ? { replyTo: `"${escapeHtml(name)}" <${escapeHtml(email)}>` }
        : {}),
      subject: `New ${stars}★ review — ${productName || productId}`,
      text: [
        `Product: ${productName || productId}`,
        `Rating: ${stars}/5`,
        `Name: ${name}`,
        `Email: ${email || "(not provided)"}`,
        "",
        "Review:",
        review,
        "",
        photoAttachment ? "(photo attached)" : "(no photo)",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a2338;">
          <div style="text-align:center;padding:8px 0 16px;">${brandMarkHtml(110)}</div>
          <h2 style="color:#071a47;margin-bottom:4px;">New product review</h2>
          <p style="color:#d6af7a;font-size:22px;margin:4px 0 12px;">${starsHtml} <span style="color:#6b7280;font-size:14px;">(${stars}/5)</span></p>
          <table style="border-collapse:collapse;width:100%;">
            <tr><td style="padding:6px 8px;font-weight:bold;width:90px;">Product</td><td style="padding:6px 8px;">${escapeHtml(productName || productId)}</td></tr>
            <tr><td style="padding:6px 8px;font-weight:bold;">Name</td><td style="padding:6px 8px;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding:6px 8px;font-weight:bold;">Email</td><td style="padding:6px 8px;">${escapeHtml(email || "(not provided)")}</td></tr>
          </table>
          <h3 style="margin-top:20px;margin-bottom:6px;">Review</h3>
          <div style="white-space:pre-wrap;background:#faf6ee;border:1px solid #eee;border-radius:8px;padding:12px;">${escapeHtml(review)}</div>
          ${photoAttachment ? `<p style="color:#6b7280;font-size:13px;margin-top:14px;">A customer photo is attached.</p>` : ""}
          <p style="color:#6b7280;font-size:13px;margin-top:14px;">${escapeHtml(savedLine)}</p>
        </div>
      `,
      attachments: [
        ...logoAttachments(),
        ...(photoAttachment ? [photoAttachment] : []),
      ],
    });

    // The email is a copy once Wix has the review — a Gmail failure then must
    // not tell the customer their review was lost.
    try {
      await mail;
    } catch (mailErr) {
      if (!saved.ok) throw mailErr;
      console.error("Review email failed (review is saved in Wix):", mailErr);
    }

    return NextResponse.json({ ok: true, status: saved.ok ? saved.status : undefined });
  } catch (err: unknown) {
    console.error("Review submission failed:", err);
    return NextResponse.json(
      { error: "Failed to send your review. Please try again later." },
      { status: 500 },
    );
  }
}
