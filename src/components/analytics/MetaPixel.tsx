import Script from "next/script";

// Meta (Facebook) Pixel base install.
//
// This ONLY initialises the pixel. It deliberately does NOT fire PageView: the
// base snippet runs once per hard page load, so on an App Router site every
// client-side navigation went untracked and PageView came out lower than
// ViewContent. PageView is fired from PageViewTracker instead, which sees route
// changes too. Other events (ViewContent, AddToCart, …) come from
// lib/analytics/capi.ts.
//
// The pixel id defaults to NEXT_PUBLIC_META_PIXEL_ID and falls back to the
// production id below so the tag ships even if the env var isn't set. Pass an
// empty NEXT_PUBLIC_META_PIXEL_ID (or override the prop) to disable it.

const DEFAULT_PIXEL_ID = "2452187828628652";

type Props = {
  /** Meta Pixel id. Defaults to NEXT_PUBLIC_META_PIXEL_ID, then the prod id. */
  pixelId?: string;
};

const resolveId = (pixelId?: string) => {
  if (pixelId !== undefined) return pixelId.trim();
  const fromEnv = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  // Only fall back to the default when the var is unset — an explicit empty
  // string is treated as "disabled".
  if (fromEnv === undefined) return DEFAULT_PIXEL_ID;
  return fromEnv.trim();
};

/**
 * The Meta Pixel loader. Place inside <body> in the root layout. Uses
 * `afterInteractive` so it loads early without blocking hydration.
 */
export default function MetaPixel({ pixelId }: Props) {
  const id = resolveId(pixelId);
  if (!id) return null;

  return (
    <Script id="meta-pixel-base" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${id}');`}
    </Script>
  );
}

/**
 * The <noscript> fallback tracking pixel. Separate export so the layout can
 * place it alongside the loader.
 */
export function MetaPixelNoScript({ pixelId }: Props) {
  const id = resolveId(pixelId);
  if (!id) return null;

  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}
