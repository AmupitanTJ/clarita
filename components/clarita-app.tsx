"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { flushSync } from "react-dom";
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
  Download,
  Type,
  X,
  UserRound,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { AuthScreen, captchaWaitMessage } from "@/components/auth-screen";
import { ConversationScreen } from "@/components/conversation-screen";
import { SidebarResizer, SidebarToggle } from "@/components/sidebar-controls";
import { moods, type MoodId } from "@/data/clarita-content";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type Screen = "welcome" | "auth" | "talk" | "saved" | "settings";
type Theme = "light" | "dark";
type TextSize = "standard" | "large";

const themeEvent = "clarita-theme-change";
const preferencesEvent = "clarita-preferences-change";

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

function subscribePreferences(onChange: () => void) {
  window.addEventListener(preferencesEvent, onChange);
  return () => window.removeEventListener(preferencesEvent, onChange);
}

function readTextSize(): TextSize {
  return typeof document !== "undefined" && document.documentElement.dataset.textSize === "large" ? "large" : "standard";
}

function readMotion(): boolean {
  return typeof document === "undefined" || document.documentElement.dataset.motion !== "reduced";
}

function setTextSize(value: TextSize) {
  document.documentElement.dataset.textSize = value;
  window.localStorage.setItem("clarita-text-size", value);
  window.dispatchEvent(new Event(preferencesEvent));
}

function setMotionEnabled(enabled: boolean) {
  document.documentElement.dataset.motion = enabled ? "gentle" : "reduced";
  window.localStorage.setItem("clarita-motion", enabled ? "gentle" : "reduced");
  window.dispatchEvent(new Event(preferencesEvent));
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
  const [historyEnabled, setHistoryEnabled] = useState(true);
  const [dataNotice, setDataNotice] = useState<string | null>(null);
  const [pageLeaving, setPageLeaving] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [pendingScreen, setPendingScreen] = useState<Exclude<Screen, "auth" | "welcome">>("talk");
  const theme = useSyncExternalStore(subscribeTheme, readTheme, (): Theme => "light");
  const textSize = useSyncExternalStore(subscribePreferences, readTextSize, (): TextSize => "standard");
  const motion = useSyncExternalStore(subscribePreferences, readMotion, () => true);
  const supabase = useMemo(() => createClient(), []);
  const screenTransitionTimerRef = useRef<number | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [captchaStatus, setCaptchaStatus] = useState<"loading" | "ready" | "verifying" | "verified" | "error" | "not-required">(
    turnstileSiteKey ? "loading" : "not-required",
  );

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const authState = query.get("auth");
    const authError = query.get("auth_error") ?? hash.get("error_description");

    if (authError || authState === "error") {
      window.setTimeout(() => setDataNotice(
          authError
            ? authError.replace(/\+/g, " ")
            : "That sign-in link could not be completed. Please request a new link.",
        ), 0);
    } else if (authState === "success") {
      window.setTimeout(() => setDataNotice("You are securely signed in."), 0);
    }

    if (authState || authError || hash.has("error")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => () => {
    if (screenTransitionTimerRef.current !== null) window.clearTimeout(screenTransitionTimerRef.current);
  }, []);

  const loadSaved = useCallback(async (userId: string) => {
    const [passages, notes] = await Promise.all([
      supabase.from("saved_passages").select("id, reference, translation, excerpt, context_note").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("private_notes").select("id, body, passage_reference, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }),
    ]);
    setSavedPassages(passages.data ?? []);
    setSavedNotes(notes.data ?? []);
  }, [supabase]);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("history_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    setHistoryEnabled(data?.history_enabled ?? true);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user?.is_anonymous === false) void Promise.all([loadSaved(data.user.id), loadProfile(data.user.id)]);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser?.is_anonymous === false) {
        void Promise.all([loadSaved(nextUser.id), loadProfile(nextUser.id)]);
        setScreen((current) => current === "auth" ? pendingScreen : current);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [loadProfile, loadSaved, pendingScreen, supabase]);

  const getCaptchaToken = useCallback(async () => {
    let captchaToken: string | undefined;
    if (turnstileSiteKey) {
      setCaptchaStatus("verifying");
      try {
        captchaToken = await turnstileRef.current?.getResponsePromise(20_000);
      } catch {
        setCaptchaStatus("error");
        throw new Error(captchaWaitMessage);
      }
      if (!captchaToken) {
        setCaptchaStatus("error");
        throw new Error(captchaWaitMessage);
      }
      setCaptchaStatus("verified");
    }

    return captchaToken;
  }, [turnstileSiteKey]);

  async function removeSavedPassage(id: string) {
    const { error } = await supabase.from("saved_passages").delete().eq("id", id).eq("user_id", user?.id ?? "");
    setDataNotice(error ? "Clarita could not remove that passage." : "Passage removed.");
    if (!error && user) await loadSaved(user.id);
  }

  async function removeSavedNote(id: string) {
    const { error } = await supabase.from("private_notes").delete().eq("id", id).eq("user_id", user?.id ?? "");
    setDataNotice(error ? "Clarita could not remove that note." : "Private note removed.");
    if (!error && user) await loadSaved(user.id);
  }

  function changeScreen(nextScreen: Screen) {
    if (nextScreen === screen) return;

    const updateScreen = () => {
      flushSync(() => setScreen(nextScreen));
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };
    const reducedMotion = !motion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      updateScreen();
      return;
    }

    if (document.startViewTransition) {
      document.startViewTransition(updateScreen);
      return;
    }

    if (screenTransitionTimerRef.current !== null) window.clearTimeout(screenTransitionTimerRef.current);
    setPageLeaving(true);
    screenTransitionTimerRef.current = window.setTimeout(() => {
      updateScreen();
      window.requestAnimationFrame(() => setPageLeaving(false));
      screenTransitionTimerRef.current = null;
    }, 150);
  }

  function openProtected(target: Exclude<Screen, "auth" | "welcome">, selectedMood?: MoodId) {
    if (selectedMood) setMood(selectedMood);
    if (user?.is_anonymous === false) changeScreen(target);
    else {
      setPendingScreen(target);
      changeScreen("auth");
    }
  }

  function openTalk(selectedMood?: MoodId) {
    openProtected("talk", selectedMood);
  }

  const permanentUser = user?.is_anonymous === false;
  const talkIsVisible = screen === "talk" && permanentUser;
  const effectiveSidebarWidth = sidebarCollapsed ? 68 : sidebarWidth;

  return (
    <div className={`app-shell ${talkIsVisible ? "app-shell--talk" : ""} ${pageLeaving ? "is-page-leaving" : ""}`} style={{ "--app-sidebar-width": `${effectiveSidebarWidth}px` } as CSSProperties}>
      <header className="topbar">
        <button className="desktop-brand" onClick={() => changeScreen("welcome")} aria-label="Clarita home"><BrandMark /></button>
        <div className="topbar__actions">
          <button className="theme-toggle" onClick={() => setActiveTheme(theme === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {!talkIsVisible && (
        <AppSidebar
          screen={screen}
          collapsed={sidebarCollapsed}
          width={sidebarWidth}
          onToggle={() => setSidebarCollapsed((current) => !current)}
          onWidth={setSidebarWidth}
          onHome={() => changeScreen("welcome")}
          onTalk={() => openTalk()}
          onSaved={() => openProtected("saved")}
          onYou={() => openProtected("settings")}
        />
      )}

      <main>
        {screen === "welcome" && <WelcomeScreen onTalk={openTalk} />}
        {screen === "auth" && <AuthScreen user={user} supabase={supabase} getCaptchaToken={getCaptchaToken} resetCaptcha={() => { turnstileRef.current?.reset(); setCaptchaStatus(turnstileSiteKey ? "ready" : "not-required"); }} captchaStatus={captchaStatus} onBack={() => changeScreen("welcome")} onNotice={setDataNotice} />}
        {screen === "talk" && permanentUser && <ConversationScreen mood={mood} user={user} supabase={supabase} onNotice={setDataNotice} historyEnabled={historyEnabled} sidebarCollapsed={sidebarCollapsed} sidebarWidth={sidebarWidth} onToggleSidebar={() => setSidebarCollapsed((current) => !current)} onSidebarWidth={setSidebarWidth} onHome={() => changeScreen("welcome")} onSaved={() => openProtected("saved")} onYou={() => openProtected("settings")} />}
        {screen === "saved" && user?.is_anonymous === false && <SavedScreen saved={savedPassages} notes={savedNotes} onRemovePassage={removeSavedPassage} onRemoveNote={removeSavedNote} onExplore={() => openTalk()} />}
        {screen === "settings" && user?.is_anonymous === false && <SettingsScreen user={user} supabase={supabase} onNotice={setDataNotice} theme={theme} onTheme={setActiveTheme} motion={motion} onMotion={setMotionEnabled} textSize={textSize} onTextSize={setTextSize} historyEnabled={historyEnabled} onHistoryEnabled={setHistoryEnabled} onSignedOut={() => changeScreen("welcome")} />}
      </main>

      {screen === "auth" && !user && turnstileSiteKey && (
        <div className="captcha-shell" aria-label="Clarita security check">
          <Turnstile
            ref={turnstileRef}
            siteKey={turnstileSiteKey}
            options={{ appearance: "interaction-only", size: "flexible", theme, refreshExpired: "auto" }}
            onWidgetLoad={() => setCaptchaStatus("ready")}
            onBeforeInteractive={() => setCaptchaStatus("verifying")}
            onSuccess={() => setCaptchaStatus("verified")}
            onExpire={() => setCaptchaStatus("ready")}
            onError={() => setCaptchaStatus("error")}
            onTimeout={() => setCaptchaStatus("error")}
            onUnsupported={() => setCaptchaStatus("error")}
          />
        </div>
      )}

      {dataNotice && <div className="data-toast" role="status" aria-live="polite"><span>{dataNotice}</span><button type="button" onClick={() => setDataNotice(null)} aria-label="Dismiss notification"><X size={15} /></button></div>}

      <MobileNav screen={screen} onHome={() => changeScreen("welcome")} onTalk={() => openTalk()} onSaved={() => openProtected("saved")} onSettings={() => openProtected("settings")} />
    </div>
  );
}

type AppSidebarProps = {
  screen: Screen;
  collapsed: boolean;
  width: number;
  onToggle: () => void;
  onWidth: (width: number) => void;
  onHome: () => void;
  onTalk: () => void;
  onSaved: () => void;
  onYou: () => void;
};

function AppSidebar({ screen, collapsed, width, onToggle, onWidth, onHome, onTalk, onSaved, onYou }: AppSidebarProps) {
  return (
    <aside id="app-sidebar" className={`app-sidebar ${collapsed ? "is-collapsed" : ""}`} aria-label="Clarita navigation">
      <div className="app-sidebar__top">
        <SidebarToggle collapsed={collapsed} onToggle={onToggle} controls="app-sidebar" />
        <nav className="app-sidebar__nav" aria-label="Primary navigation">
          <button type="button" onClick={onHome} className={screen === "welcome" ? "active" : ""} aria-current={screen === "welcome" ? "page" : undefined} title="Home"><Home size={18} /><span>Home</span></button>
          <button type="button" onClick={onTalk} className={screen === "talk" ? "active" : ""} aria-current={screen === "talk" ? "page" : undefined} title="Talk"><MessageCircle size={18} /><span>Talk</span></button>
          <button type="button" onClick={onSaved} className={screen === "saved" ? "active" : ""} aria-current={screen === "saved" ? "page" : undefined} title="Saved"><Bookmark size={18} /><span>Saved</span></button>
        </nav>
      </div>
      <div className="app-sidebar__bottom">
        <button type="button" className={`app-sidebar__you ${screen === "settings" ? "active" : ""}`} onClick={onYou} aria-current={screen === "settings" ? "page" : undefined} title="You"><UserRound size={18} /><span>You</span></button>
      </div>
      {!collapsed && <SidebarResizer width={width} onWidth={onWidth} />}
    </aside>
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
  motion: boolean;
  onMotion: (enabled: boolean) => void;
  textSize: TextSize;
  onTextSize: (size: TextSize) => void;
  historyEnabled: boolean;
  onHistoryEnabled: (enabled: boolean) => void;
  onSignedOut: () => void;
};

function SettingsScreen({ user, supabase, onNotice, theme, onTheme, motion, onMotion, textSize, onTextSize, historyEnabled, onHistoryEnabled, onSignedOut }: SettingsProps) {
  const [accountBusy, setAccountBusy] = useState(false);
  const [openPanel, setOpenPanel] = useState<"accessibility" | "privacy" | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [accountDeleteConfirmation, setAccountDeleteConfirmation] = useState("");

  async function toggleHistory() {
    setAccountBusy(true);
    const nextValue = !historyEnabled;
    try {
      const { error } = await supabase.from("profiles").upsert(
        { user_id: user.id, history_enabled: nextValue },
        { onConflict: "user_id" },
      );
      if (error) throw error;
      onHistoryEnabled(nextValue);
      onNotice(nextValue ? "New conversations will be saved to your account." : "Temporary chat is on. New conversations will stay only on this device until you leave the page.");
    } catch {
      onNotice("Clarita could not change your history preference. Please try again.");
    } finally {
      setAccountBusy(false);
    }
  }

  async function exportData() {
    setAccountBusy(true);
    try {
      const [profile, conversations, passages, notes, feedback] = await Promise.all([
        supabase.from("profiles").select("display_name, preferred_translation, history_enabled, created_at, updated_at").eq("user_id", user.id),
        supabase.from("conversations").select("id, title, pinned_at, archived_at, created_at, updated_at").eq("user_id", user.id).order("created_at"),
        supabase.from("saved_passages").select("reference, translation, excerpt, context_note, created_at").eq("user_id", user.id).order("created_at"),
        supabase.from("private_notes").select("passage_reference, body, created_at, updated_at").eq("user_id", user.id).order("created_at"),
        supabase.from("response_feedback").select("rating, safety_level, response_source, detail, consent_to_review, created_at").eq("user_id", user.id).order("created_at"),
      ]);
      const failed = [profile, conversations, passages, notes, feedback].find((result) => result.error);
      if (failed?.error) throw failed.error;
      const conversationIds = (conversations.data ?? []).map((conversation) => conversation.id);
      const messages = conversationIds.length
        ? await supabase.from("conversation_messages").select("conversation_id, role, content, response_data, source, created_at").in("conversation_id", conversationIds).order("created_at")
        : { data: [], error: null };
      if (messages.error) throw messages.error;

      const payload = {
        exported_at: new Date().toISOString(),
        account_email: user.email ?? null,
        profile: profile.data ?? [],
        conversations: conversations.data ?? [],
        conversation_messages: messages.data ?? [],
        saved_passages: passages.data ?? [],
        private_notes: notes.data ?? [],
        response_feedback: feedback.data ?? [],
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `clarita-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      onNotice("Your Clarita data export is ready.");
    } catch {
      onNotice("Clarita could not export your data. Please try again.");
    } finally {
      setAccountBusy(false);
    }
  }

  async function deleteSavedData() {
    if (deleteConfirmation !== "DELETE") return;
    setAccountBusy(true);
    try {
      const operations = await Promise.all([
        supabase.from("conversations").delete().eq("user_id", user.id),
        supabase.from("saved_passages").delete().eq("user_id", user.id),
        supabase.from("private_notes").delete().eq("user_id", user.id),
        supabase.from("response_feedback").delete().eq("user_id", user.id),
        supabase.from("profiles").delete().eq("user_id", user.id),
      ]);
      const failure = operations.find((result) => result.error);
      if (failure?.error) throw failure.error;
      setDeleteConfirmation("");
      onNotice("Your saved Clarita data has been deleted. Your sign-in account remains active.");
    } catch {
      onNotice("Clarita could not delete all saved data. Please try again.");
    } finally {
      setAccountBusy(false);
    }
  }

  async function deleteAccount() {
    if (accountDeleteConfirmation !== "DELETE MY ACCOUNT") return;
    setAccountBusy(true);
    try {
      const { error } = await supabase.rpc("delete_my_clarita_account");
      if (error) throw error;
      await supabase.auth.signOut().catch(() => undefined);
      setAccountDeleteConfirmation("");
      onSignedOut();
      onNotice("Your Clarita account and saved data have been permanently deleted.");
    } catch {
      onNotice("Clarita could not delete your account. Your data has not been intentionally changed; please try again.");
    } finally {
      setAccountBusy(false);
    }
  }

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
        <div><span><BookOpen /><span><strong>Bible translation</strong><small>World English Bible · verified prototype content</small></span></span><span className="setting-status">WEB</span></div>
        <div><span><LockKeyhole /><span><strong>Conversation history</strong><small>{historyEnabled ? "New conversations are saved automatically" : "Temporary chat—new conversations are not saved"}</small></span></span><button className={`switch ${historyEnabled ? "on" : ""}`} onClick={() => void toggleHistory()} aria-pressed={historyEnabled} aria-label="Toggle conversation history" disabled={accountBusy}><i /></button></div>
        <div><span><Sparkles /><span><strong>Gentle motion</strong><small>Subtle transitions and ambient light</small></span></span><button className={`switch ${motion ? "on" : ""}`} onClick={() => onMotion(!motion)} aria-pressed={motion} aria-label="Toggle gentle motion"><i /></button></div>
        <div><span><SlidersHorizontal /><span><strong>Accessibility</strong><small>Text size and reduced-motion controls</small></span></span><button onClick={() => setOpenPanel(openPanel === "accessibility" ? null : "accessibility")} aria-expanded={openPanel === "accessibility"}>Open</button></div>
        <div><span><ShieldCheck /><span><strong>Privacy and data</strong><small>Export or delete the information you save</small></span></span><button onClick={() => setOpenPanel(openPanel === "privacy" ? null : "privacy")} aria-expanded={openPanel === "privacy"}>Open</button></div>
      </div>
      {openPanel === "accessibility" && (
        <section className="settings-panel" aria-labelledby="accessibility-title">
          <div className="settings-panel__heading"><div><Type size={20} /><h2 id="accessibility-title">Reading preferences</h2></div><button type="button" onClick={() => setOpenPanel(null)} aria-label="Close accessibility settings"><X size={17} /></button></div>
          <p>Choose a comfortable text size. Motion can also be reduced using the switch above or your device preference.</p>
          <div className="segmented-control" aria-label="Text size">
            <button className={textSize === "standard" ? "active" : ""} onClick={() => onTextSize("standard")} aria-pressed={textSize === "standard"}>Standard</button>
            <button className={textSize === "large" ? "active" : ""} onClick={() => onTextSize("large")} aria-pressed={textSize === "large"}>Large</button>
          </div>
        </section>
      )}
      {openPanel === "privacy" && (
        <section className="settings-panel" aria-labelledby="privacy-title">
          <div className="settings-panel__heading"><div><ShieldCheck size={20} /><h2 id="privacy-title">Your data</h2></div><button type="button" onClick={() => setOpenPanel(null)} aria-label="Close privacy settings"><X size={17} /></button></div>
          <p>Download a readable JSON copy of your conversations, saved passages, notes, feedback, and preferences.</p>
          <button className="settings-action" type="button" onClick={() => void exportData()} disabled={accountBusy}><Download size={16} /> Export my data</button>
          <div className="settings-danger">
            <strong>Delete saved Clarita data</strong>
            <p>This permanently deletes conversations, passages, notes, feedback, and preferences. Your email sign-in account will remain available.</p>
            <label htmlFor="delete-data-confirmation">Type DELETE to confirm</label>
            <input id="delete-data-confirmation" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" />
            <button type="button" onClick={() => void deleteSavedData()} disabled={deleteConfirmation !== "DELETE" || accountBusy}><Trash2 size={16} /> Delete saved data</button>
          </div>
          <div className="settings-danger settings-danger--account">
            <strong>Delete my account</strong>
            <p>This permanently removes your sign-in account and all Clarita data. This cannot be undone.</p>
            <label htmlFor="delete-account-confirmation">Type DELETE MY ACCOUNT to confirm</label>
            <input id="delete-account-confirmation" value={accountDeleteConfirmation} onChange={(event) => setAccountDeleteConfirmation(event.target.value)} autoComplete="off" />
            <button type="button" onClick={() => void deleteAccount()} disabled={accountDeleteConfirmation !== "DELETE MY ACCOUNT" || accountBusy}><Trash2 size={16} /> Delete my account</button>
          </div>
        </section>
      )}
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
      <button onClick={onHome} className={screen === "welcome" ? "active" : ""} aria-current={screen === "welcome" ? "page" : undefined}><Home /><span>Home</span></button>
      <button onClick={() => onTalk()} className={screen === "talk" ? "active" : ""} aria-label="Talk to Clarita" aria-current={screen === "talk" ? "page" : undefined}><MessageCircle /><span>Talk</span></button>
      <button onClick={onSaved} className={screen === "saved" ? "active" : ""} aria-current={screen === "saved" ? "page" : undefined}><Bookmark /><span>Saved</span></button>
      <button onClick={onSettings} className={screen === "settings" ? "active" : ""} aria-current={screen === "settings" ? "page" : undefined}><UserRound /><span>You</span></button>
    </nav>
  );
}
