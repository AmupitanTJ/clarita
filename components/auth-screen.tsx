"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, History, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { BrandMark } from "@/components/brand-mark";
import { createClient } from "@/lib/supabase";

type AuthScreenProps = {
  user: User | null;
  supabase: ReturnType<typeof createClient>;
  getCaptchaToken: () => Promise<string | undefined>;
  resetCaptcha: () => void;
  onBack: () => void;
  onNotice: (message: string | null) => void;
};

export function AuthScreen({ user, supabase, getCaptchaToken, resetCaptcha, onBack, onNotice }: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const isGuest = user?.is_anonymous === true;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (!address || busy) return;
    setBusy(true);

    try {
      if (isGuest) {
        const { error } = await supabase.auth.updateUser({ email: address });
        if (error) throw error;
      } else {
        const captchaToken = await getCaptchaToken();
        const { error } = await supabase.auth.signInWithOtp({
          email: address,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: new URL("/auth/callback", window.location.origin).toString(),
            captchaToken,
          },
        });
        if (error) throw error;
      }

      setSent(true);
      onNotice("Your secure Clarita sign-in link is on its way.");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Clarita could not send the sign-in link. Please try again.");
    } finally {
      resetCaptcha();
      setBusy(false);
    }
  }

  return (
    <section className="auth-screen page-enter">
      <div className="auth-card">
        <button className="auth-card__brand" type="button" onClick={onBack} aria-label="Back to Clarita home">
          <BrandMark />
        </button>
        {sent ? (
          <div className="auth-confirmation" role="status">
            <span className="auth-icon"><CheckCircle2 /></span>
            <span className="section-kicker">Check your inbox</span>
            <h1>Your quiet space is almost ready.</h1>
            <p>
              We sent a secure link to <strong>{email.trim()}</strong>. Open it to {isGuest ? "secure your existing history" : "sign in to your account"}.
            </p>
            <button className="primary-cta" type="button" onClick={() => setSent(false)}>Use another email</button>
          </div>
        ) : (
          <>
            <span className="auth-icon"><LockKeyhole /></span>
            <span className="section-kicker">Your account, your history</span>
            <h1>{isGuest ? "Secure the conversations you already started." : "Sign in before we begin."}</h1>
            <p>
              {isGuest
                ? "Your current conversations will stay with this same Clarita identity. Add your email so you can return to them on another device."
                : "Every Clarita conversation belongs to an account, so your prayers, questions, and reflections remain available whenever you return."}
            </p>
            <form onSubmit={submit}>
              <label htmlFor="auth-email">Email address</label>
              <div className="auth-email-field"><Mail size={18} /><input id="auth-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required autoFocus /></div>
              <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Sending secure link…" : <>Continue with email <ArrowRight size={17} /></>}</button>
            </form>
            <small className="auth-fineprint"><ShieldCheck size={14} /> No password needed. We email you a secure, one-time sign-in link.</small>
          </>
        )}
      </div>
      <aside className="auth-benefits" aria-label="Account benefits">
        <div><History /><span><strong>Conversation history</strong><small>Return to every question and reflection.</small></span></div>
        <div><ShieldCheck /><span><strong>Private by design</strong><small>Your account only sees its own saved history.</small></span></div>
      </aside>
    </section>
  );
}
