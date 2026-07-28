import Link from "next/link";
import Image from "next/image";

interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

const socials: { label: string; href: string | null; icon: string }[] = [
  {
    label: "OJARA on Instagram",
    href: "https://www.instagram.com/ojara.india",
    icon: "/instagram.png",
  },
  {
    label: "OJARA on Facebook",
    // Supplied by the owner 2026-07-17. The ?mibextid tracking param the share
    // sheet appends is dropped; the bare share url resolves the same.
    href: "https://www.facebook.com/share/1E5iVdYJwb/",
    icon: "/facebook.png",
  },
];

// Payment badges shown as trust/legitimacy signals in the footer (owner call,
// 2026-07-17). The card/UPI/RuPay marks are displayed regardless of whether
// Razorpay is live yet — checkout may still be COD-only until the keys are set,
// but the logos communicate the methods the store intends to accept.
// (public/paypal.png exists but PayPal is not offered, so it's never listed.)
const CASH_ON_DELIVERY = {
  label: "Cash on Delivery",
  src: "/cash-on-delivery.png",
};
const PREPAID_METHODS = [
  { label: "Visa", src: "/visa.png" },
  { label: "Mastercard", src: "/mastercard.png" },
  { label: "UPI", src: "/upi.png" },
  { label: "RuPay", src: "/rupay.png" },
];
const payments: { label: string; src: string }[] = [
  ...PREPAID_METHODS,
  CASH_ON_DELIVERY,
];

const columns: FooterColumn[] = [
  {
    title: "The Brand",
    links: [
      { label: "Our Story", href: "/our-story" },
      { label: "Collection", href: "/#collection" },
      { label: "Manifestation Stories", href: "/#stories" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Shipping & Exchanges", href: "/shipping-returns" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-champagne-gold/30 bg-midnight-navy text-champagne-gold">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          <div className="max-w-xs">
            {/* Brand mark — client gem art (bg removed) — beside the wordmark */}
            <div className="flex items-center gap-3">
              <Image
                alt="Ojara"
                className="object-contain"
                height={40}
                width={36}
                src="/logo.png"
              />
              <p className="font-heading text-2xl uppercase tracking-[0.3em]">
                Ojara
              </p>
            </div>
            <p className="mt-4 text-sm leading-6 text-champagne-gold/90">
              Natural crystal bracelets, cleansed and charged — worn as a daily
              reminder of your intention.
            </p>

            {/* Social */}
            <div className="mt-6 flex items-center gap-3">
              {socials.map((s) =>
                s.href ? (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-champagne-gold/40 transition-all duration-150 hover:border-champagne-gold hover:bg-champagne-gold/10 active:scale-95"
                  >
                    <Image src={s.icon} alt="" width={18} height={18} className="object-contain" />
                  </a>
                ) : (
                  // No url yet — render it inert rather than linking to "#",
                  // which would look live and go nowhere.
                  <span
                    key={s.label}
                    aria-label={`${s.label} (coming soon)`}
                    title="Coming soon"
                    className="flex h-9 w-9 cursor-default items-center justify-center rounded-full border border-champagne-gold/20 opacity-40"
                  >
                    <Image src={s.icon} alt="" width={18} height={18} className="object-contain" />
                  </span>
                ),
              )}
            </div>
          </div>

          {/* The three link columns sit side by side even on mobile — stacking
              them vertically turned the footer into a long scroll. */}
          <div className="grid grid-cols-3 gap-4 sm:gap-10 lg:gap-16">
            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <p className="text-[0.6rem] uppercase tracking-[0.2em] text-champagne-gold/90 sm:text-xs sm:tracking-[0.3em]">
                  {column.title}
                </p>
                <ul className="mt-4 flex flex-col gap-2.5 text-[0.8rem] tracking-[0.05em] text-champagne-gold/95 sm:mt-5 sm:gap-3 sm:text-sm sm:tracking-[0.15em]">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        prefetch
                        className="cursor-pointer transition-all duration-150 ease-out hover:text-ivory active:scale-95"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col-reverse items-center gap-6 border-t border-champagne-gold/30 pt-6 sm:flex-row sm:justify-between">
          <p className="text-xs tracking-[0.15em] text-champagne-gold/85">
            © {new Date().getFullYear()} Ojara. All rights reserved.
          </p>

          {/* Payment badges */}
          <div className="flex items-center gap-3 sm:gap-4">
            {payments.map((p) => (
              <Image
                key={p.label}
                src={p.src}
                alt={p.label}
                width={44}
                height={26}
                className="h-6 w-auto object-contain opacity-90 transition-opacity hover:opacity-100"
              />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
