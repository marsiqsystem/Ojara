import "server-only";

// Wix CRM contact creation.
//
// The newsletter and contact forms used to only send a Gmail, which is why the
// Wix dashboard reports "Form submissions", "New email subscribers" and "Clicks
// to contact" as 0 — there was simply nothing in the CRM. (Site sessions, page
// views and conversion rate stay 0 regardless: Wix Analytics does not work on
// self-managed headless sites at all. GA4 is the traffic source of truth.)
//
// wixAdminClientServer already wires up `contacts` and `labels` from @wix/crm;
// nothing had ever called them.
//
// Everything here is BEST-EFFORT by design. A CRM hiccup must never turn a
// successful newsletter sign-up into an error for the visitor, so every function
// resolves to a status object and never throws.

import { WIX_ADMIN_ENABLED } from "@/lib/commerce/config";

export type ContactSource = "newsletter" | "contact-form";

// Wix labels are how the owner segments the CRM. `custom.` is the required
// namespace for self-created labels; Wix creates them on first use via
// findOrCreateLabel.
const LABEL_KEYS: Record<ContactSource, { key: string; displayName: string }> = {
  newsletter: { key: "custom.inner-circle", displayName: "Inner Circle" },
  "contact-form": { key: "custom.website-enquiry", displayName: "Website Enquiry" },
};

export type UpsertContactInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  source: ContactSource;
};

export type UpsertContactResult = {
  ok: boolean;
  skipped?: boolean;
  contactId?: string;
  /** True when the email already existed in the CRM (a re-subscribe). */
  existing?: boolean;
  error?: unknown;
};

/**
 * Create the contact in Wix CRM, or attach the label to the existing one.
 *
 * Wix rejects a duplicate email with a specific application error rather than
 * upserting, so "already a contact" is a normal, successful outcome here — a
 * repeat newsletter sign-up is not a failure.
 */
export async function upsertWixContact(
  input: UpsertContactInput,
): Promise<UpsertContactResult> {
  if (!WIX_ADMIN_ENABLED) return { ok: false, skipped: true };

  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false, skipped: true };

  try {
    const { wixAdminClientServer } = await import("@/lib/wixAdminClientServer");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wix = wixAdminClientServer() as any;

    // Resolve the label first. Best-effort: an unlabelled contact is still worth
    // far more than no contact, so a label failure must not abort the create.
    let labelKey: string | undefined;
    try {
      const { key, displayName } = LABEL_KEYS[input.source];
      const found = await wix.labels.findOrCreateLabel(displayName);
      labelKey = found?.label?.key || key;
    } catch (labelErr) {
      console.error("Wix label lookup failed (continuing unlabelled):", labelErr);
    }

    const info = {
      name:
        input.firstName || input.lastName
          ? { first: input.firstName, last: input.lastName }
          : undefined,
      emails: { items: [{ email, primary: true }] },
      ...(input.phone ? { phones: { items: [{ phone: input.phone, primary: true }] } } : {}),
      ...(labelKey ? { labelKeys: { items: [labelKey] } } : {}),
    };

    try {
      const created = await wix.contacts.createContact(info, {
        allowDuplicates: false,
      });
      return { ok: true, contactId: created?.contact?._id };
    } catch (createErr) {
      // Already in the CRM → find them and add the label, so a shopper who signs
      // up twice still gets segmented correctly.
      const existingId = await findContactIdByEmail(wix, email);
      if (!existingId) throw createErr;

      if (labelKey) {
        try {
          await wix.contacts.labelContact(existingId, [labelKey]);
        } catch (labelErr) {
          console.error("Wix labelContact failed:", labelErr);
        }
      }
      return { ok: true, contactId: existingId, existing: true };
    }
  } catch (err) {
    console.error("Wix contact upsert failed:", err);
    return { ok: false, error: err };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const findContactIdByEmail = async (wix: any, email: string) => {
  try {
    // `primaryInfo.email` is the only email field ContactsQueryBuilder can
    // filter on — `info.emails.*` is not queryable.
    const res = await wix.contacts
      .queryContacts()
      .eq("primaryInfo.email", email)
      .limit(1)
      .find();
    return res?.items?.[0]?._id as string | undefined;
  } catch (queryErr) {
    console.error("Wix contact lookup failed:", queryErr);
    return undefined;
  }
};
