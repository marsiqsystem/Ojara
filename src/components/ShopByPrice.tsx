import Image from "next/image";
import Link from "next/link";
import { getAllProducts } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { summarizeBands } from "@/lib/priceBands";

/** Shop by budget — takes "can I afford it?" off the table (the Viora home pattern). */
export default async function ShopByPrice() {
  const bands = summarizeBands(await getAllProducts());
  if (bands.length === 0) return null;

  return (
    <section aria-labelledby="shop-by-price" className="bg-ivory px-4 sm:px-6 py-12 sm:py-16">
      <div className="mx-auto max-w-[1600px]">
        <p className="text-xs uppercase tracking-[0.35em] text-champagne-gold">Shop by budget</p>
        <h2 id="shop-by-price" className="mt-2 font-heading text-3xl text-midnight-navy sm:text-4xl">
          Find your piece at your price
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
          {bands.map(({ band, count, fromPrice, image }) => (
            <li key={band.key}>
              <Link
                href={`/collection?price=${band.key}`}
                className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-sand"
              >
                {image && (
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-midnight-navy/85 via-midnight-navy/20 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-3 text-ivory sm:p-5">
                  <span className="block font-heading text-2xl leading-tight sm:text-3xl">{band.label}</span>
                  <span className="mt-1 block text-xs text-ivory/85">
                    {count} pieces · from {formatPrice(fromPrice)}
                  </span>
                  <span className="mt-2 inline-block border-b border-champagne-gold text-[0.7rem] font-bold uppercase tracking-wider text-champagne-gold">
                    Shop now
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
