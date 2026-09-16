// "How to use it" as three steps — the reference PDP's routine strip. Same
// guidance the old "Crystal Rituals" accordion chapter gave, made scannable.
const steps = [
  {
    title: "Cleanse",
    body: "Sage smoke or a night of moonlight to reset the stones.",
    d: "M12 3c3 4 5 6.5 5 9.5a5 5 0 0 1-10 0C7 9.5 9 7 12 3Z",
  },
  {
    title: "Set your intention",
    body: "Hold it between your palms, breathe slowly and say it aloud.",
    d: "M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10Z",
  },
  {
    title: "Wear it daily",
    body: "Keep it close — on your wrist, desk or bedside.",
    d: "M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  },
];

export default function RitualSteps() {
  return (
    <section aria-labelledby="ritual-steps-title" className="mt-8">
      <h2 id="ritual-steps-title" className="text-xs font-semibold uppercase tracking-[0.25em] text-champagne-gold">
        Your ritual
      </h2>
      <ol className="mt-4 grid grid-cols-3 gap-3">
        {steps.map((step, i) => (
          <li key={step.title} className="flex flex-col items-center rounded-xl bg-sand/40 px-2 py-4 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-champagne-gold">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={step.d} />
              </svg>
            </span>
            <span className="mt-2 text-[0.62rem] font-semibold uppercase tracking-widest text-midnight-navy/45">Step {i + 1}</span>
            <span className="text-sm font-semibold leading-tight text-midnight-navy">{step.title}</span>
            <span className="mt-1 text-[0.7rem] leading-snug text-midnight-navy/60">{step.body}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
