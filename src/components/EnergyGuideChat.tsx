"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface Message {
  role: "guide" | "user";
  text: string;
}

const GREETING: Message = {
  role: "guide",
  text: "Welcome to the Circle. I am your Energy Guide. Are you looking to manifest wealth, protection, or love today?",
};

export default function EnergyGuideChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Landing page only. On product pages the floating bubble sat on top of the
  // sticky Buy Now bar (owner call, 2026-07-17) — keeping it to "/" avoids the
  // collision and reserves the guide for first-time browsers on the home page.
  const showChat = pathname === "/";

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, open]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;

    // Add user message
    setMessages((prev) => [...prev, { role: "user", text }]);
    setDraft("");
    setIsTyping(true);

    // Simulated guide response after 1.5 seconds
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "guide",
          // Canned reply — the same words come back no matter what is typed. It used
          // to recommend a "Raw Pyrite Cluster", a product OJARA has never sold. Keep
          // it to what is true of every piece and hand the shopper somewhere real.
          text: "Thank you for writing in. Every OJARA piece is a natural gemstone bracelet — Citrine for abundance, Black Tourmaline for protection, Carnelian for courage, Lapis Lazuli for clarity. Browse the collection, or write to us at ojara.jewel@gmail.com and a guide will help you choose.",
        },
      ]);
      setIsTyping(false);
    }, 1500);
  };

  if (!showChat) return null;

  return (
    // The wrapper is as tall as the *open* panel (~384x532) even while collapsed, so
    // it must not take clicks itself — it sat invisibly over the Buy Now button and,
    // on mobile (panel is w-[calc(100vw-3rem)]), over most of the screen. Children
    // opt back in: the bubble always, the panel only when open.
    <div className="pointer-events-none fixed bottom-[calc(96px+env(safe-area-inset-bottom))] md:bottom-6 right-6 z-[85] flex flex-col items-end print:hidden font-sans">
      {/* Slide-up Chat Window */}
      <div
        role="dialog"
        aria-label="Ojara Energy Guide Chat"
        className={`mb-4 flex h-[28rem] w-[calc(100vw-3rem)] max-w-sm origin-bottom-right flex-col overflow-hidden rounded-2xl border border-champagne-gold/30 bg-midnight-navy shadow-2xl transition-all duration-300 ease-out ${
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-4 scale-95 opacity-0"
        }`}
      >
        {/* Sleek Header */}
        <div className="flex items-center justify-between border-b border-champagne-gold/20 bg-midnight-navy px-5 py-4">
          <div className="flex items-center gap-3">
            {/* Faceted Crystal Icon in gold */}
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-champagne-gold/15 text-champagne-gold">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v18M3 12h18M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
            <div>
              <p className="font-heading text-sm font-semibold uppercase tracking-wider text-champagne-gold">
                Ojara Energy Guide
              </p>
              <p className="flex items-center gap-1.5 text-[10px] text-ivory/60">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                Aligning energies now
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close chat"
            onClick={() => setOpen(false)}
            className="cursor-pointer rounded-full p-1.5 text-champagne-gold/70 transition-all duration-150 hover:text-champagne-gold active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message Area with Custom Scrollbar */}
        <div
          ref={scrollRef}
          data-lenis-prevent
          className="flex-1 overflow-y-auto bg-midnight-navy/95 px-4 py-5 space-y-4 scrollbar-thin"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(214, 175, 122, 0.3) transparent",
          }}
        >
          {messages.map((message, i) => (
            <div
              key={i}
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                message.role === "guide"
                  ? "self-start rounded-bl-sm bg-white/5 text-ivory border border-champagne-gold/15"
                  : "self-end ml-auto rounded-br-sm bg-champagne-gold text-midnight-navy font-medium"
              }`}
            >
              {message.text}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex flex-col gap-1.5 self-start max-w-[80%] rounded-2xl rounded-bl-sm bg-white/5 px-4 py-3 border border-champagne-gold/15">
              <span className="text-[10px] uppercase tracking-wider text-champagne-gold/70 animate-pulse">
                Guide is sensing...
              </span>
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-champagne-gold [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-champagne-gold [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-champagne-gold" />
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={send}
          className="flex items-center gap-2 border-t border-champagne-gold/20 bg-midnight-navy px-4 py-3.5"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="type here"
            aria-label="Message the Energy Guide"
            className="w-full flex-1 rounded-md px-3 py-2 border border-gray-300 bg-white text-midnight-navy placeholder:text-midnight-navy/55 focus:outline-none"
            style={{ border: "1px solid #d1d5db", color: "#071A47", backgroundColor: "#ffffff" }}
          />
          <button
            type="submit"
            aria-label="Send message"
            className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-champagne-gold text-midnight-navy transition-all duration-150 hover:bg-champagne-gold/85 active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </form>
      </div>

      {/* Floating Action Button */}
      <button
        type="button"
        aria-label={open ? "Close Energy Guide Chat" : "Chat with an Energy Guide"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto group flex cursor-pointer items-center gap-0 self-end rounded-full bg-champagne-gold py-3 pl-5 pr-3 text-midnight-navy shadow-lg shadow-midnight-navy/25 outline-none transition-all duration-150 hover:shadow-xl active:scale-95"
      >
        <span
          className={`overflow-hidden whitespace-nowrap text-xs font-semibold uppercase tracking-[0.2em] transition-all duration-500 ease-out ${
            open
              ? "max-w-0 opacity-0"
              : "max-w-0 opacity-0 group-hover:max-w-[16rem] group-hover:pr-3 group-hover:opacity-100"
          }`}
        >
          Chat with an Energy Guide
        </span>

        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-midnight-navy text-champagne-gold transition-transform duration-500 ease-out group-hover:scale-105">
          {open ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6A8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z" />
              <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" />
            </svg>
          )}
        </span>
      </button>
    </div>
  );
}
