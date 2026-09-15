import Script from "next/script";

// Microsoft Clarity base install.
//
// Clarity was previously expected to load *inside* the GTM container, but the
// site ended up with two GTM containers and the Clarity tag lived in the one the
// site doesn't ship — so Clarity recorded nothing. This installs Clarity directly
// instead, removing the GTM dependency entirely.
//
// The project id comes from NEXT_PUBLIC_CLARITY_ID (see .env). If it's unset the
// component renders nothing, so local/dev builds stay clean and the site never
// ships a broken snippet. Mounted by ConsentManager under Analytics consent, so
// it respects the same opt-out model as GTM/GA4.

type Props = {
  /** Clarity project id, e.g. "abcde12345". Defaults to NEXT_PUBLIC_CLARITY_ID. */
  projectId?: string;
};

const resolveId = (projectId?: string) =>
  (projectId || process.env.NEXT_PUBLIC_CLARITY_ID || "").trim();

/**
 * The Clarity loader script. Place inside <body> in the root layout (via
 * ConsentManager). Uses `afterInteractive` so it loads early without blocking
 * hydration.
 */
export default function MicrosoftClarity({ projectId }: Props) {
  const id = resolveId(projectId);
  if (!id) return null;

  return (
    <Script id="ms-clarity-base" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${id}");`}
    </Script>
  );
}
