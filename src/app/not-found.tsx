import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex min-h-[80vh] items-center justify-center bg-midnight-navy px-6 py-24 text-ivory">
      <div className="mx-auto max-w-xl text-center">
        <span className="text-xs uppercase tracking-[0.5em] text-champagne-gold">
          Lost in the Ether
        </span>

        <h1 className="mt-8 font-heading text-7xl tracking-[0.1em] text-champagne-gold sm:text-8xl">
          404
        </h1>

        <p className="mt-8 font-heading text-2xl leading-relaxed text-ivory sm:text-3xl">
          The energy you are seeking has shifted.
        </p>

        <p className="mx-auto mt-6 max-w-md text-base leading-8 text-ivory/70">
          This path has gone quiet. Realign with the collection and let your
          intention guide you to the piece that&apos;s meant for you.
        </p>

        <Link
          href="/collection"
          prefetch
          className="mt-12 inline-flex rounded-full bg-champagne-gold px-12 py-4 text-xs font-medium uppercase tracking-[0.25em] text-midnight-navy transition-colors duration-300 ease-out hover:bg-champagne-gold/85"
        >
          Return to Collection
        </Link>

        <p className="mt-8">
          <Link
            href="/"
            prefetch
            className="text-xs uppercase tracking-[0.2em] text-ivory/50 transition-colors duration-300 ease-out hover:text-champagne-gold"
          >
            ← Back to Home
          </Link>
        </p>
      </div>
    </section>
  );
}
