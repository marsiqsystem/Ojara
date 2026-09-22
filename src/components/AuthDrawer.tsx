"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginState } from "@wix/sdk";
import Cookies from "js-cookie";
import { useWixClient } from "@/hooks/useWixClient";
import {
  getInvisibleCaptchaToken,
  getVisibleCaptchaResponse,
  renderVisibleCaptcha,
  resetVisibleCaptcha,
} from "@/lib/wixCaptcha";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";

enum MODE {
  LOGIN = "LOGIN",
  REGISTER = "REGISTER",
  RESET_PASSWORD = "RESET_PASSWORD",
  EMAIL_VERIFICATION = "EMAIL_VERIFICATION",
}

const isLocalhost = (): boolean => {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
};

// Wix Headless auth REQUIRES an email. Phone identifiers are rejected up front
// with a clear message rather than failing deep inside the SDK.
const isPhoneNumber = (value: string): boolean =>
  /^\+?\d{10,15}$/.test(value.replace(/[\s\-()]/g, ""));

// Guard every auth network call. A hung request would otherwise leave the button
// stuck on "Loading..." forever with no way out.
const withTimeout = <T,>(promise: Promise<T>, ms = 25000): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("AUTH_TIMEOUT")), ms),
    ),
  ]);

const COPY: Record<MODE, { eyebrow: string; title: string; cta: string }> = {
  [MODE.LOGIN]: {
    eyebrow: "Welcome Back",
    title: "Enter the Circle",
    cta: "Sign In",
  },
  [MODE.REGISTER]: {
    eyebrow: "Begin Your Journey",
    title: "Create Your Account",
    cta: "Create Account",
  },
  [MODE.RESET_PASSWORD]: {
    eyebrow: "Recover Access",
    title: "Reset Your Password",
    cta: "Send Reset Link",
  },
  [MODE.EMAIL_VERIFICATION]: {
    eyebrow: "One Last Step",
    title: "Verify Your Email",
    cta: "Verify & Continue",
  },
};

// The field must read as a field. It previously used bg-midnight-navy — the SAME
// navy as the drawer behind it — with a 1px champagne-gold/40 border, which blends
// to roughly rgb(90,86,91) against that navy. The input was fully functional but
// visually invisible: no fill contrast, one dim hairline. People couldn't type in
// it because they couldn't see it.
//
// Now: a lighter translucent fill lifts the box off the panel, and the border is
// opaque enough to define an edge on its own.
// A solid ivory field on the navy panel. A translucent fill (bg-ivory/10) was too
// close to the panel behind it to read as somewhere you type — the owner's note was
// that the box simply wasn't visible. Ivory + navy text is the brand's own pairing
// and unmistakably a form field.
const fieldClass =
  "w-full rounded-md border border-champagne-gold/60 bg-ivory px-5 py-3 text-sm text-midnight-navy placeholder:text-midnight-navy/45 transition-all duration-150 ease-out focus:border-champagne-gold focus:outline-none focus:ring-2 focus:ring-champagne-gold/40";

const labelClass =
  "mb-2 block text-[0.65rem] uppercase tracking-[0.3em] text-champagne-gold/90";

export default function AuthDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const wixClient = useWixClient();
  const router = useRouter();

  const [mode, setMode] = useState(MODE.LOGIN);
  const [username, setUsername] = useState("");
  const [identifier, setIdentifier] = useState(""); // the email
  const [password, setPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [pendingVerificationState, setPendingVerificationState] =
    useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isCaptchaRequired, setIsCaptchaRequired] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // reCAPTCHA Enterprise site keys come from the Wix SDK itself — NOT from env.
  const captchaVisibleSiteKey = wixClient.auth.captchaVisibleSiteKey;
  const captchaInvisibleSiteKey = wixClient.auth.captchaInvisibleSiteKey;

  const captchaContainerRef = useRef<HTMLDivElement>(null);
  const captchaWidgetIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(
      () => setResendCooldown((s) => (s <= 1 ? 0 : s - 1)),
      1000,
    );
    return () => clearInterval(t);
  }, [resendCooldown]);

  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    lockScroll();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlockScroll();
    };
  }, [open, onClose]);

  // Render the visible checkbox only on REGISTER, and only once Wix demands it.
  useEffect(() => {
    if (
      !open ||
      mode !== MODE.REGISTER ||
      !captchaContainerRef.current ||
      !captchaVisibleSiteKey ||
      !isCaptchaRequired
    ) {
      return;
    }

    let cancelled = false;
    renderVisibleCaptcha(captchaContainerRef.current, captchaVisibleSiteKey)
      .then((id) => {
        if (!cancelled) captchaWidgetIdRef.current = id;
      })
      .catch((err) => console.error("[captcha] render failed:", err));

    return () => {
      cancelled = true;
    };
  }, [open, mode, captchaVisibleSiteKey, isCaptchaRequired]);

  // Changing mode always clears the captcha demand: the visible checkbox is only
  // ever raised by a REGISTER failure, and it must not survive into another mode.
  // (The bundle did this in an effect; React Compiler forbids setState there.)
  const switchMode = (next: MODE) => {
    setMode(next);
    setIsCaptchaRequired(false);
    setError("");
    setMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    if (
      (mode === MODE.LOGIN ||
        mode === MODE.REGISTER ||
        mode === MODE.RESET_PASSWORD) &&
      isPhoneNumber(identifier)
    ) {
      setError("An email address is required for authentication.");
      setIsLoading(false);
      return;
    }

    try {
      let response;

      switch (mode) {
        case MODE.LOGIN: {
          // INVISIBLE reCAPTCHA. Skipped on localhost — keys are domain-bound.
          let captchaTokens;
          if (captchaInvisibleSiteKey && !isLocalhost()) {
            try {
              captchaTokens = {
                invisibleRecaptchaToken: await getInvisibleCaptchaToken(
                  captchaInvisibleSiteKey,
                  "login",
                ),
              };
            } catch (captchaErr) {
              // Don't hard-fail — attempt without a token. If Wix truly enforces
              // CAPTCHA it returns `missingCaptchaToken`, handled below.
              console.warn("[captcha] invisible token unavailable:", captchaErr);
              captchaTokens = undefined;
            }
          }
          response = await withTimeout(
            wixClient.auth.login({ email: identifier, password, captchaTokens }),
          );
          break;
        }

        case MODE.REGISTER: {
          let captchaTokens;
          if (captchaVisibleSiteKey && isCaptchaRequired && !isLocalhost()) {
            const recaptchaToken =
              captchaWidgetIdRef.current !== null
                ? getVisibleCaptchaResponse(captchaWidgetIdRef.current)
                : "";
            if (!recaptchaToken) {
              setError("Please complete the 'I'm not a robot' check.");
              setIsLoading(false);
              return;
            }
            captchaTokens = { recaptchaToken };
          }
          response = await withTimeout(
            wixClient.auth.register({
              email: identifier,
              password,
              profile: { nickname: username },
              captchaTokens,
            }),
          );
          break;
        }

        case MODE.RESET_PASSWORD:
          response = await withTimeout(
            wixClient.auth.sendPasswordResetEmail(
              identifier,
              `${window.location.origin}/`,
            ),
          );
          // Deliberately non-committal — never leak whether an account exists.
          setMessage(
            `If an account exists for ${identifier}, we've emailed a reset link.`,
          );
          break;

        // THE "OTP" STEP: Wix emailed a numeric code; exchange it for a session.
        case MODE.EMAIL_VERIFICATION: {
          const code = emailCode.trim();
          if (!/^\d{4,8}$/.test(code)) {
            setError(
              "Enter the verification code we emailed you (usually 6 digits).",
            );
            setIsLoading(false);
            return;
          }
          response = await withTimeout(
            wixClient.auth.processVerification(
              { verificationCode: code, code } as never,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (pendingVerificationState as any) || undefined, // <- required 2nd arg
            ),
          );
          break;
        }
      }

      switch (response?.loginState) {
        case LoginState.SUCCESS: {
          // Exchange the one-time session token for durable member tokens, then
          // persist the refresh token so the SERVER can identify this member.
          const tokens = await withTimeout(
            wixClient.auth.getMemberTokensForDirectLogin(
              response.data.sessionToken!,
            ),
          );
          Cookies.set("refreshToken", JSON.stringify(tokens.refreshToken), {
            expires: 2,
          });
          wixClient.auth.setTokens(tokens);
          setMessage("Success! Welcome to Ojara.");
          onClose();
          // Re-render server components so they see the member.
          router.refresh();
          break;
        }

        case LoginState.FAILURE:
          if (
            response.errorCode === "invalidEmail" ||
            response.errorCode === "invalidPassword"
          ) {
            setError("Invalid email or password!");
          } else if (response.errorCode === "emailAlreadyExists") {
            setError("Email already exists!");
          } else if (response.errorCode === "resetPassword") {
            setError("You need to reset your password!");
          } else if (
            response.errorCode === "missingCaptchaToken" ||
            response.errorCode === "invalidCaptchaToken"
          ) {
            // LOGIN uses INVISIBLE reCAPTCHA — there is no checkbox the user can
            // solve. If Wix demands a token the key won't produce, the only fix
            // is in the Wix dashboard.
            if (isLocalhost() || mode === MODE.LOGIN) {
              setError(
                "Login blocked by reCAPTCHA. Wix Dashboard → Settings → Login & Security → toggle reCAPTCHA, Save, then Publish.",
              );
            } else if (!isCaptchaRequired) {
              setIsCaptchaRequired(true);
              setError("Security check required. Complete the checkbox and retry.");
            } else {
              setError("Security check failed. Please try again.");
            }
          } else {
            setError(
              `Authentication failed: ${response.errorCode || "Unknown error"}.`,
            );
          }
          break;

        // Wix emailed a code. Stash the whole response — processVerification()
        // needs it as its second argument.
        case LoginState.EMAIL_VERIFICATION_REQUIRED:
          setPendingVerificationState(response);
          setEmailCode("");
          setMode(MODE.EMAIL_VERIFICATION);
          setIsCaptchaRequired(false);
          setMessage(`We sent a verification code to ${identifier}.`);
          break;

        case LoginState.OWNER_APPROVAL_REQUIRED:
          setMessage("Your account is pending approval");
          break;
      }
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = err as any;
      const raw = e?.message || "";
      const appDesc = e?.details?.applicationError?.description || "";
      const code = e?.details?.applicationError?.code || "";

      const isCaptchaError =
        code === "missingCaptchaToken" ||
        code === "invalidCaptchaToken" ||
        [raw, appDesc].some((s: string) =>
          /missingCaptchaToken|invalidCaptchaToken/.test(s),
        );

      if (raw === "RECAPTCHA_LOAD_FAILED") {
        setError("Couldn't load the security check. Disable ad-blockers and retry.");
        return;
      }
      if (isCaptchaError) {
        if (isLocalhost() || mode === MODE.LOGIN) {
          setError(
            "Login blocked by reCAPTCHA — see Wix Dashboard → Login & Security.",
          );
        } else if (!isCaptchaRequired) {
          setIsCaptchaRequired(true);
          setError("Security check required. Complete the checkbox and retry.");
        } else {
          setError("Security check failed. Please try again.");
        }
        return;
      }
      if (raw === "AUTH_TIMEOUT") {
        setError(
          "Taking longer than expected. Check your connection and try again.",
        );
        return;
      }

      // Wix returns this when the headless client's site isn't PUBLISHED yet.
      // The fix is in the dashboard, not the code.
      const isUnpublishedSite =
        code === "ASSERTION_FAILED" ||
        [raw, appDesc].some((s: string) =>
          /No Public URL Found|site is published/i.test(s),
        );

      setError(
        isUnpublishedSite
          ? "The Wix site backing this client has not been published. Publish it, then retry."
          : `Authentication error: ${raw || appDesc || "Unknown error"}.`,
      );
    } finally {
      setIsLoading(false);
      // reCAPTCHA tokens are SINGLE-USE. Reset the widget so a retry after an
      // error (e.g. "email already exists") can obtain a fresh token.
      if (mode === MODE.REGISTER && captchaWidgetIdRef.current !== null) {
        resetVisibleCaptcha(captchaWidgetIdRef.current);
      }
    }
  };

  // Wix Headless has NO standalone "resend OTP" endpoint. Re-running register()
  // with the same details makes Wix re-issue the code and hand back a fresh
  // verification state. Guarded by a 30s cooldown.
  const handleResend = async () => {
    if (isLoading || resendCooldown > 0) return;
    if (!identifier || !password) {
      setError("Your session expired. Please sign up again.");
      return;
    }
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      let captchaTokens;
      if (captchaVisibleSiteKey && isCaptchaRequired && !isLocalhost()) {
        const recaptchaToken =
          captchaWidgetIdRef.current !== null
            ? getVisibleCaptchaResponse(captchaWidgetIdRef.current)
            : "";
        if (recaptchaToken) captchaTokens = { recaptchaToken };
      }

      const response = await withTimeout(
        wixClient.auth.register({
          email: identifier,
          password,
          profile: { nickname: username },
          captchaTokens,
        }),
      );

      if (response?.loginState === LoginState.EMAIL_VERIFICATION_REQUIRED) {
        setPendingVerificationState(response);
        setEmailCode("");
        setMessage(`A new code was sent to ${identifier}.`);
        setResendCooldown(30);
      } else if (response?.loginState === LoginState.SUCCESS) {
        const tokens = await withTimeout(
          wixClient.auth.getMemberTokensForDirectLogin(
            response.data.sessionToken!,
          ),
        );
        Cookies.set("refreshToken", JSON.stringify(tokens.refreshToken), {
          expires: 2,
        });
        wixClient.auth.setTokens(tokens);
        onClose();
        router.refresh();
      } else if (
        response?.loginState === LoginState.FAILURE &&
        response.errorCode === "emailAlreadyExists"
      ) {
        setError("This email is already verified. Please log in instead.");
      } else {
        setError("Couldn't resend the code. Try again shortly.");
      }
    } catch {
      setError("Couldn't resend the code. Check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const copy = COPY[mode];

  return (
    <>
      {/* Scrim */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-midnight-navy/70 backdrop-blur-sm transition-opacity duration-500 ease-out ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Account"
        className={`fixed right-0 top-0 z-[70] flex h-full w-full max-w-md flex-col border-l border-champagne-gold/20 bg-midnight-navy transition-transform duration-500 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-champagne-gold/30 px-5 py-6 sm:px-8">
          <span className="font-heading text-lg uppercase tracking-[0.3em] text-champagne-gold">
            Ojara
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full p-2 text-champagne-gold transition-all duration-150 ease-out hover:text-ivory active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div data-lenis-prevent className="flex-1 overflow-y-auto px-5 py-10 sm:px-8">
          <p className="text-[0.65rem] uppercase tracking-[0.4em] text-champagne-gold font-semibold">
            ✦ {copy.eyebrow}
          </p>
          <h2 className="mt-4 font-heading text-3xl text-ivory">{copy.title}</h2>

          {mode === MODE.EMAIL_VERIFICATION && (
            <p className="mt-4 text-sm leading-6 text-ivory/85">
              We emailed a one-time code to{" "}
              <span className="text-champagne-gold">{identifier}</span>. Enter it
              below to complete your account.
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {mode === MODE.REGISTER && (
              <div>
                <label htmlFor="ojara-username" className={labelClass}>
                  Name
                </label>
                <input
                  id="ojara-username"
                  type="text"
                  autoComplete="name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your name"
                  className={fieldClass}
                />
              </div>
            )}

            {mode !== MODE.EMAIL_VERIFICATION && (
              <div>
                <label htmlFor="ojara-email" className={labelClass}>
                  Email
                </label>
                <input
                  id="ojara-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@example.com"
                  className={fieldClass}
                />
              </div>
            )}

            {(mode === MODE.LOGIN || mode === MODE.REGISTER) && (
              <div>
                <label htmlFor="ojara-password" className={labelClass}>
                  Password
                </label>
                <input
                  id="ojara-password"
                  type="password"
                  required
                  autoComplete={
                    mode === MODE.LOGIN ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={fieldClass}
                />
              </div>
            )}

            {mode === MODE.EMAIL_VERIFICATION && (
              <div>
                <label htmlFor="ojara-code" className={labelClass}>
                  Verification Code
                </label>
                <input
                  id="ojara-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  placeholder="000000"
                  className={`${fieldClass} text-center text-lg tracking-[0.5em]`}
                />
              </div>
            )}

            {/* Visible checkbox — only on REGISTER, and only once Wix demands it */}
            {mode === MODE.REGISTER &&
              captchaVisibleSiteKey &&
              isCaptchaRequired &&
              !isLocalhost() && (
                <div ref={captchaContainerRef} className="pt-1" />
              )}

            {error && (
              <p className="rounded-2xl border border-red-400/30 bg-red-400/10 px-5 py-3 text-sm leading-6 text-red-200">
                {error}
              </p>
            )}
            {message && !error && (
              <p className="rounded-2xl border border-champagne-gold/30 bg-champagne-gold/10 px-5 py-3 text-sm leading-6 text-champagne-gold">
                ✦ {message}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
              className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-champagne-gold px-8 py-4 text-xs font-medium uppercase tracking-[0.25em] text-midnight-navy transition-all duration-150 ease-out hover:bg-champagne-gold/85 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading && (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-midnight-navy/30 border-t-midnight-navy"
                />
              )}
              {isLoading ? "Please wait..." : copy.cta}
            </button>
          </form>

          {/* Mode switching */}
          <div className="mt-8 space-y-3 border-t border-champagne-gold/30 pt-8 text-sm">
            {mode === MODE.LOGIN && (
              <>
                <button
                  type="button"
                  onClick={() => switchMode(MODE.REGISTER)}
                  className="cursor-pointer text-ivory/75 underline-offset-8 transition-all duration-150 ease-out hover:text-champagne-gold hover:underline active:scale-95"
                >
                  New to Ojara? Create an account
                </button>
                <br />
                <button
                  type="button"
                  onClick={() => switchMode(MODE.RESET_PASSWORD)}
                  className="cursor-pointer text-ivory/75 underline-offset-8 transition-all duration-150 ease-out hover:text-champagne-gold hover:underline active:scale-95"
                >
                  Forgotten your password?
                </button>
              </>
            )}

            {(mode === MODE.REGISTER || mode === MODE.RESET_PASSWORD) && (
              <button
                type="button"
                onClick={() => switchMode(MODE.LOGIN)}
                className="cursor-pointer text-ivory/75 underline-offset-8 transition-all duration-150 ease-out hover:text-champagne-gold hover:underline active:scale-95"
              >
                Already have an account? Sign in
              </button>
            )}

            {mode === MODE.EMAIL_VERIFICATION && (
              <>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isLoading || resendCooldown > 0}
                  className="cursor-pointer text-ivory/75 underline-offset-8 transition-all duration-150 ease-out hover:text-champagne-gold hover:underline active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-ivory/75 disabled:hover:no-underline"
                >
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Didn't get the code? Resend"}
                </button>
                <br />
                <button
                  type="button"
                  onClick={() => switchMode(MODE.LOGIN)}
                  className="cursor-pointer text-ivory/75 underline-offset-8 transition-all duration-150 ease-out hover:text-champagne-gold hover:underline active:scale-95"
                >
                  Back to sign in
                </button>
              </>
            )}
          </div>
        </div>

        <p className="border-t border-champagne-gold/30 px-5 py-5 sm:px-8 text-center text-[0.65rem] uppercase tracking-[0.25em] text-ivory/80">
          ✦ Secure &amp; encrypted
        </p>
      </aside>
    </>
  );
}
