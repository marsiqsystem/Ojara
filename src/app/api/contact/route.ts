import { NextResponse, after } from "next/server";
import nodemailer from "nodemailer";
import { isValidEmail } from "@/lib/validateEmail";
import {
  clientIp,
  isHoneypotFilled,
  isRateLimited,
  isSameOrigin,
} from "@/lib/apiGuard";
import { SUPPORT_EMAIL, BRAND_NAME } from "@/lib/commerce/config";
import { brandMarkHtml, logoAttachments } from "@/lib/emailBrand";

import { upsertWixContact } from "@/lib/wixContacts";

// Contact / enquiry form → emails our support inbox, replyTo the customer (§11),
// and files the enquirer in Wix CRM under "Website Enquiry" so the dashboard's
// "Form submissions" stat reflects reality and the lead isn't trapped in a inbox.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { title, firstName, lastName, email, query } = body;

    // Bot filled the hidden honeypot: pretend success, send nothing. Returning
    // 200 (not an error) stops the bot from learning it was detected.
    if (isHoneypotFilled(body)) {
      return NextResponse.json({ ok: true });
    }
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    if (isRateLimited(`contact:${clientIp(req)}`)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !query?.trim()) {
      return NextResponse.json(
        { error: "Please fill in all required fields." },
        { status: 400 },
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
      console.error("GMAIL_USER or GMAIL_APP_PASSWORD missing from env.");
      return NextResponse.json(
        { error: "Email service is not configured." },
        { status: 500 },
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailAppPassword },
    });

    const fullName = [title, firstName, lastName].filter(Boolean).join(" ").trim();

    // Strip CR/LF before interpolating into mail HEADERS — prevents header injection.
    const safeText = (s: string) => String(s).replace(/[\r\n]+/g, " ").trim();
    const escapeHtml = (s: string) =>
      String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    await transporter.sendMail({
      // Send FROM our own mailbox, with replyTo set to the customer. Sending "from"
      // the customer's address would fail SPF/DKIM and land us in spam.
      from: `"${BRAND_NAME} Website" <${gmailUser}>`,
      to: SUPPORT_EMAIL,
      replyTo: `"${safeText(fullName)}" <${safeText(email)}>`,
      subject: `Website enquiry from ${safeText(fullName)}`,
      text: [`Name: ${fullName}`, `Email: ${email}`, "", "Message:", query].join(
        "\n",
      ),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a2338;">
          <div style="text-align:center;padding:8px 0 16px;">${brandMarkHtml(110)}</div>
          <h2 style="color:#071a47;margin-bottom:8px;">New website enquiry</h2>
          <table style="border-collapse:collapse;width:100%;margin-top:12px;">
            <tr><td style="padding:6px 8px;font-weight:bold;width:90px;">Name</td><td style="padding:6px 8px;">${escapeHtml(
              fullName,
            )}</td></tr>
            <tr><td style="padding:6px 8px;font-weight:bold;">Email</td><td style="padding:6px 8px;">${escapeHtml(
              email,
            )}</td></tr>
          </table>
          <h3 style="margin-top:20px;margin-bottom:6px;">Message</h3>
          <div style="white-space:pre-wrap;background:#faf6ee;border:1px solid #eee;border-radius:8px;padding:12px;">${escapeHtml(
            query,
          )}</div>
        </div>
      `,
      attachments: logoAttachments(),
    });

    // CRM contact AFTER the response — the enquiry is already safely in the
    // support inbox, so a Wix failure must not read as a failed submission.
    after(async () => {
      const result = await upsertWixContact({
        email: String(email),
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        source: "contact-form",
      });
      if (!result.ok && !result.skipped) {
        console.error("Contact form: Wix contact not created for", email);
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("Contact form send failed:", err);
    return NextResponse.json(
      { error: "Failed to send your message. Please try again later." },
      { status: 500 },
    );
  }
}
