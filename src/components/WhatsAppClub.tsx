import { whatsappLink } from "@/lib/commerce/config";

/**
 * WhatsApp, where Indian shoppers actually reply — help choosing a stone. Renders
 * nothing until the owner sets WHATSAPP_NUMBER (commerce/config.ts), so it never
 * shows a button to nowhere.
 */
export default function WhatsAppClub() {
  const helpHref = whatsappLink("Hi OJARA! I'd like help choosing a bracelet.");
  if (!helpHref) return null;

  return (
    <section aria-labelledby="whatsapp-club" className="bg-sand px-4 sm:px-6 py-12 sm:py-16">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-champagne-gold">OJARA on WhatsApp</p>
          <h2 id="whatsapp-club" className="mt-2 font-heading text-3xl text-midnight-navy sm:text-4xl">
            Not sure which stone is yours?
          </h2>
          <p className="mt-2 max-w-lg text-sm text-midnight-navy/70">
            Message us and we&apos;ll help you choose — or ask anything about your order.
          </p>
        </div>
        <a
          href={helpHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-full bg-[#25D366] px-7 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-[#1fb857]"
        >
          Chat on WhatsApp
        </a>
      </div>
    </section>
  );
}
