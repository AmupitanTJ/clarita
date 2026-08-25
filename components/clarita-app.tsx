"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  Home,
  LockKeyhole,
  LogOut,
  MessageCircle,
  Moon,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { AuthScreen } from "@/components/auth-screen";
import { ConversationScreen } from "@/components/conversation-screen";
import { moods, type MoodId } from "@/data/clarita-content";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type Screen = "welcome" | "auth" | "talk" | "saved" | "settings";
type Theme = "light" | "dark";

const themeEvent = "clarita-theme-change";

function readTheme(): Theme {
  return typeof document !== "undefined" && document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribeTheme(onChange: () => void) {
  window.addEventListener(themeEvent, onChange);
  return () => window.removeEventListener(themeEvent, onChange);
}

function setActiveTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem("clarita-theme", theme);
  window.dispatchEvent(new Event(themeEvent));
}

type SavedPassage = {
  id: string;
  reference: string;
  translation: string;
  excerpt: string | null;
  context_note: string | null;
};

type SavedNote = {
  id: string;
  body: string;
  passage_reference: string | null;
  updated_at: string;
};

export function ClaritaApp() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [mood, setMood] = useState<MoodId>("worried");
  const [user, setUser] = useState<User | null>(null);
  const [savedPassages, setSavedPassages] = useState<SavedPassage[]>([]);
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [dataNotice, setDataNotice] = useState<string | null>(null);
  const [pendingScreen, setPendingScreen] = useState<Exclude<Screen, "auth" | "welcome">>("talk");
  const theme = useSyncExternalStore(subscribeTheme, readTheme, (): Theme => "light");
  const supabase = useMemo(() => createClient(), []);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const loadSaved = useCallback(async () => {
    const [passages, notes] = await Promise.all([
      supabase.from("saved_passages").select("id, reference, translation, excerpt, context_note").order("created_at", { ascending: false }),
      supabase.from("private_notes").select("id, body, passage_reference, updated_at").order("updated_at", { ascending: false }),
    ]);
    setSavedPassages(passages.data ?? []);
    setSavedNotes(notes.data ?? []);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user?.is_anonymous === false) void loadSaved();
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser?.is_anonymous === false) {
        void loadSaved();
        setScreen((current) => current === "auth" ? pendingScreen : current);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [loadSaved, pendingScreen, supabase]);

  const getCaptchaToken = useCallback(async () => {
    let captchaToken: string | undefined;
    if (turnstileSiteKey) {
      try {
        captchaToken = await turnstileRef.current?.getResponsePromise(20_000);
      } catch {
        throw new Error("Clarita's security check could not load. Please refresh or disable content blockers and try again.");
      }
      if (!captchaToken) throw new Error("Clarita's security check could not load. Please refresh and try again.");
    }

    return captchaToken;
  }, [turnstileSiteKey]);

  async function removeSavedPassage(id: string) {
    const { error } = await supabase.from("saved_passages").delete().eq("id", id);
    setDataNotice(error ? "Clarita could not remove that passage." : "Passage removed.");
    if (!error) await loadSaved();
  }

  async function removeSavedNote(id: string) {
    const { error } = await supabase.from("private_notes").delete().eq("id", id);
    setDataNotice(error ? "Clarita could not remove that note." : "Private note removed.");
    if (!error) await loadSaved();
  }

  function openProtected(target: Exclude<Screen, "auth" | "welcome">, selectedMood?: MoodId) {
    if (selectedMood) setMood(selectedMood);
    if (user?.is_anonymous === false) setScreen(target);
    else {
      setPendingScreen(target);
      setScreen("auth");
    }
  }

  function openTalk(selectedMood?: MoodId) {
    openProtected("talk", selectedMood);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="desktop-brand" onClick={() => setScreen("welcome")}><BrandMark /></button>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <button onClick={() => setScreen("welcome")} className={screen === "welcome" ? "active" : ""}><Home size={17} /> Today</button>
          <button onClick={() => openTalk()} className={screen === "talk" ? "active" : ""}><MessageCircle size={17} /> Talk</button>
          <button onClick={() => openTalk("faith")}><BookOpen size={17} /> Study</button>
          <button onClick={() => openProtected("saved")} className={screen === "saved" ? "active" : ""}><Bookmark size={17} /> Saved</button>
          <button onClick={() => openProtected("settings")} className={screen === "settings" ? "active" : ""}><UserRound size={17} /> You</button>
        </nav>
        <div className="topbar__actions">
          <button className="theme-toggle" onClick={() => setActiveTheme(theme === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="privacy-pill" onClick={() => user?.is_anonymous === false ? setScreen("settings") : setScreen("auth")}><LockKeyhole size={14} /> {user?.is_anonymous === false ? "Account" : user ? "Secure history" : "Sign in"} · Private</button>
        </div>
      </header>

      <main>
        {screen === "welcome" && <WelcomeScreen onTalk={openTalk} />}
        {screen === "auth" && <AuthScreen user={user} supabase={supabase} getCaptchaToken={getCaptchaToken} resetCaptcha={() => turnstileRef.current?.reset()} onBack={() => setScreen("welcome")} onNotice={setDataNotice} />}
        {screen === "talk" && user?.is_anonymous === false && <ConversationScreen mood={mood} user={user} supabase={supabase} onNotice={setDataNotice} />}
        {screen === "saved" && user?.is_anonymous === false && <SavedScreen saved={savedPassages} notes={savedNotes} onRemovePassage={removeSavedPassage} onRemoveNote={removeSavedNote} onExplore={() => openTalk()} />}
        {screen === "settings" && user?.is_anonymous === false && <SettingsScreen user={user} supabase={supabase} onNotice={setDataNotice} theme={theme} onTheme={setActiveTheme} onSignedOut={() => setScreen("welcome")} />}
      </main>

      {screen === "auth" && !user && turnstileSiteKey && (
        <div className="captcha-shell" aria-label="Clarita security check">
          <Turnstile
            ref={turnstileRef}
            siteKey={turnstileSiteKey}
            options={{ appearance: "interaction-only", size: "flexible", theme, refreshExpired: "auto" }}
            onError={() => setDataNotice("Clarita could not complete the security check. Please try again.")}
          />
        </div>
      )}

      {dataNotice && <button className="data-toast" onClick={() => setDataNotice(null)}>{dataNotice}</button>}

      <MobileNav screen={screen} onHome={() => setScreen("welcome")} onTalk={() => openTalk()} onSaved={() => openProtected("saved")} onSettings={() => openProtected("settings")} />
    </div>
  );
}

function WelcomeScreen({ onTalk }: { onTalk: (mood?: MoodId) => void }) {
  return (
    <section className="welcome page-enter">
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />
      <div className="welcome__eyebrow"><Sparkles size={15} /> A quiet place to begin</div>
      <h1>What’s on your<br /><em>heart today?</em></h1>
      <p className="welcome__lede">Bring an honest question or feeling. Explore Scripture in context, reflect, pray, and take one hopeful next step.</p>
      <button className="primary-cta" onClick={() => onTalk()}>
        Talk to Clarita <ArrowRight size={19} />
      </button>
      <button className="text-cta" onClick={() => onTalk("faith")}>Explore a Bible question</button>

      <div className="trust-row" aria-label="Clarita trust principles">
        <span><BookOpen /> Scripture-grounded</span>
        <span><ShieldCheck /> Context-aware</span>
        <span><LockKeyhole /> Private by default</span>
      </div>

      <div className="mood-prompt">
        <div>
          <span className="section-kicker">Start where you are</span>
          <h2>Choose what feels closest</h2>
        </div>
        <div className="mood-grid">
          {moods.map((item) => (
            <button key={item.id} onClick={() => onTalk(item.id)}>
              <span className="mood-symbol">{item.symbol}</span>
              <span>{item.label}</span>
              <ArrowRight size={17} />
            </button>
          ))}
        </div>
      </div>

      <aside className="disclosure">
        <BrandMark compact />
        <p><strong>A companion, not an authority.</strong> Clarita is an AI-assisted Bible reflection tool. It does not replace Scripture, trusted people, pastoral care, or professional support.</p>
      </aside>
    </section>
  );
}

type SavedProps = {
  saved: SavedPassage[];
  notes: SavedNote[];
  onRemovePassage: (id: string) => Promise<void>;
  onRemoveNote: (id: string) => Promise<void>;
  onExplore: () => void;
};

function SavedScreen({ saved, notes, onRemovePassage, onRemoveNote, onExplore }: SavedProps) {
  const isEmpty = saved.length === 0 && notes.length === 0;
  return (
    <section className="utility-screen page-enter">
      <span className="section-kicker">Your quiet library</span><h1>Saved</h1><p>Passages, prayers, notes, and studies you choose to keep will live here.</p>
      {isEmpty ? (
        <div className="empty-state"><Bookmark size={28} /><h2>Nothing saved yet</h2><p>Your conversations are private by default. Only items you explicitly save will appear here.</p><button className="primary-cta" onClick={onExplore}>Explore Scripture <ArrowRight size={17} /></button></div>
      ) : (
        <div className="saved-list">
          {saved.map((passage) => (
            <article key={passage.id} className="saved-item">
              <span>{passage.translation}</span>
              <h2>{passage.reference}</h2>
              {passage.excerpt && <blockquote>“{passage.excerpt}”</blockquote>}
              {passage.context_note && <p>{passage.context_note}</p>}
              <button className="saved-remove" onClick={() => void onRemovePassage(passage.id)}><Trash2 size={14} /> Remove</button>
            </article>
          ))}
          {notes.map((note) => (
            <article key={note.id} className="saved-item saved-item--note">
              <span>Private note</span>
              <h2>{note.passage_reference ?? "Personal reflection"}</h2>
              <p>{note.body}</p>
              <button className="saved-remove" onClick={() => void onRemoveNote(note.id)}><Trash2 size={14} /> Remove</button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

type SettingsProps = {
  user: User;
  supabase: ReturnType<typeof createClient>;
  onNotice: (message: string | null) => void;
  theme: Theme;
  onTheme: (theme: Theme) => void;
  onSignedOut: () => void;
};

function SettingsScreen({ user, supabase, onNotice, theme, onTheme, onSignedOut }: SettingsProps) {
  const [motion, setMotion] = useState(true);
  const [accountBusy, setAccountBusy] = useState(false);

  async function signOut() {
    setAccountBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      onSignedOut();
      onNotice("You have signed out. Your history remains safely stored in your account.");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Clarita could not sign you out.");
    } finally {
      setAccountBusy(false);
    }
  }

  return (
    <section className="utility-screen page-enter">
      <span className="section-kicker">Your preferences</span><h1>You</h1><p>Choose how Clarita looks after your privacy and reading experience.</p>
      <div className="settings-list">
        <div><span>{theme === "dark" ? <Moon /> : <Sun />}<span><strong>Appearance</strong><small>{theme === "dark" ? "Quiet dark mode" : "Warm light mode"}</small></span></span><button className={`switch ${theme === "dark" ? "on" : ""}`} onClick={() => onTheme(theme === "dark" ? "light" : "dark")} aria-pressed={theme === "dark"} aria-label="Toggle dark mode"><i /></button></div>
        <div><span><BookOpen /><span><strong>Bible translation</strong><small>World English Bible · prototype</small></span></span><button>Change</button></div>
        <div><span><LockKeyhole /><span><strong>Conversation history</strong><small>Saved automatically for future reference</small></span></span><button className="setting-status" onClick={() => onNotice("Every conversation is saved privately to your Clarita identity.")}>On</button></div>
        <div><span><Sparkles /><span><strong>Gentle motion</strong><small>Subtle transitions and ambient light</small></span></span><button className={`switch ${motion ? "on" : ""}`} onClick={() => setMotion(!motion)} aria-pressed={motion}><i /></button></div>
        <div><span><SlidersHorizontal /><span><strong>Accessibility</strong><small>Text size, contrast, and reading options</small></span></span><button>Open</button></div>
        <div><span><ShieldCheck /><span><strong>Privacy and data</strong><small>Export or delete the information you save</small></span></span><button>Open</button></div>
      </div>
      <div className="account-panel">
        <span className="section-kicker">Your Clarita account</span>
        <h2>History that returns with you</h2>
        <p>Signed in as <strong>{user.email ?? "a verified account"}</strong>. Your conversations and saved reflections remain attached to this account.</p>
        <button className="account-signout" type="button" onClick={() => void signOut()} disabled={accountBusy}><LogOut size={16} /> {accountBusy ? "Signing out…" : "Sign out"}</button>
      </div>
      <div className="danger-note"><strong>Need to leave quickly?</strong><p>A quick-exit control and discreet screen mode are planned for the production safety build.</p></div>
    </section>
  );
}

function MobileNav({ screen, onHome, onTalk, onSaved, onSettings }: { screen: Screen; onHome: () => void; onTalk: () => void; onSaved: () => void; onSettings: () => void }) {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <button onClick={onHome} className={screen === "welcome" ? "active" : ""}><Home /><span>Today</span></button>
      <button onClick={() => onTalk()} className={screen === "talk" ? "active" : ""}><MessageCircle /><span>Talk</span></button>
      <button className="mobile-nav__talk" onClick={() => onTalk()} aria-label="Talk to Clarita"><BrandMark compact /></button>
      <button onClick={onSaved} className={screen === "saved" ? "active" : ""}><Bookmark /><span>Saved</span></button>
      <button onClick={onSettings} className={screen === "settings" ? "active" : ""}><UserRound /><span>You</span></button>
    </nav>
  );
}
