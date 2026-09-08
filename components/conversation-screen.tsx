"use client";

import { FormEvent, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Archive, BookOpen, Bookmark, Check, ChevronLeft, ChevronRight, Clipboard, Flag, History, Home, LoaderCircle, MessageCircle, MoreHorizontal, Pencil, Pin, PinOff, Plus, RotateCcw, Send, Share2, Sparkles, ThumbsDown, ThumbsUp, Trash2, UserRound, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { BrandMark } from "@/components/brand-mark";
import type { MoodId } from "@/data/clarita-content";
import { ensurePrayerEnding, type ChatHistoryItem, type ChatReply, type SuggestedAction, type SuggestedActionId } from "@/lib/chat";
import { createClient, type Json } from "@/lib/supabase";

type Conversation = {
  id: string;
  title: string;
  pinned_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  reply: ChatReply | null;
  createdAt: string;
};

type ConversationScreenProps = {
  mood: MoodId;
  user: User;
  supabase: ReturnType<typeof createClient>;
  historyEnabled: boolean;
  onNotice: (message: string | null) => void;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  onToggleSidebar: () => void;
  onSidebarWidth: (width: number) => void;
  onHome: () => void;
  onSaved: () => void;
  onYou: () => void;
};

function subscribeToMobileHistory(callback: () => void) {
  const query = window.matchMedia("(max-width: 900px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function readMobileHistory() {
  return window.matchMedia("(max-width: 900px)").matches;
}

function readServerMobileHistory() {
  return false;
}

function isChatReply(value: Json | null): value is Json & ChatReply {
  if (!value || Array.isArray(value) || typeof value !== "object") return false;
  return typeof value.message === "string" && Array.isArray(value.biblicalConnections) && typeof value.question === "string";
}

function toMessage(row: {
  id: string;
  role: "user" | "assistant";
  content: string;
  response_data: Json | null;
  created_at: string;
}): Message {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    reply: isChatReply(row.response_data) ? (row.response_data as unknown as ChatReply) : null,
    createdAt: row.created_at,
  };
}

function makeTitle(message: string) {
  const clean = message.replace(/\s+/g, " ").trim();
  return clean.length > 62 ? `${clean.slice(0, 59)}…` : clean;
}

function sortConversations(items: Conversation[]) {
  return [...items].sort((first, second) => {
    if (Boolean(first.pinned_at) !== Boolean(second.pinned_at)) return first.pinned_at ? -1 : 1;
    return second.updated_at.localeCompare(first.updated_at);
  });
}

function assistantHistoryContent(message: Message) {
  const reply = message.reply;
  if (!reply) return message.content;
  const prayer = ensurePrayerEnding(reply.prayer);

  const discussedScripture = reply.biblicalConnections
    .map((connection) => `${connection.name} (${connection.reference}): ${connection.connection}`)
    .join("\n");

  return [
    reply.message,
    reply.scriptureTransition,
    discussedScripture ? `Scripture already discussed:\n${discussedScripture}` : "",
    prayer ? `Prayer offered: ${prayer}` : "",
    `Follow-up question: ${reply.question}`,
  ].filter(Boolean).join("\n\n");
}

const suggestedActionPrompts: Record<SuggestedActionId, string> = {
  pray: "Yes, let’s pray together now.",
  talk_more: "I would like to keep talking about this.",
  encouragement: "I would like some encouragement.",
  scripture: "I would like to explore more Scripture about this.",
  practical_steps: "Please help me think through a practical next step.",
};
const validSuggestedActionIds = new Set<SuggestedActionId>(Object.keys(suggestedActionPrompts) as SuggestedActionId[]);

function actionsForReply(reply: ChatReply | null): SuggestedAction[] {
  if (!reply) return [];
  if (reply.suggestedActions?.length) {
    return reply.suggestedActions
      .filter((action) => validSuggestedActionIds.has(action.id) && typeof action.label === "string" && action.label.trim().length > 0)
      .slice(0, 3);
  }
  const question = reply.question.toLowerCase();
  const actions: SuggestedAction[] = [];
  if (/pray|prayer/.test(question)) actions.push({ id: "pray", label: "Pray together" });
  if (/talk|share|tell me|listen/.test(question)) actions.push({ id: "talk_more", label: "Keep talking" });
  if (/encourag|comfort/.test(question)) actions.push({ id: "encouragement", label: "Encourage me" });
  return actions.slice(0, 3);
}

export function ConversationScreen({ mood, user, supabase, historyEnabled, onNotice, sidebarCollapsed, sidebarWidth, onToggleSidebar, onSidebarWidth, onHome, onSaved, onYou }: ConversationScreenProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replyFailure, setReplyFailure] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyView, setHistoryView] = useState<"active" | "archived">("active");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const historyCloseRef = useRef<HTMLButtonElement>(null);
  const isMobileHistory = useSyncExternalStore(subscribeToMobileHistory, readMobileHistory, readServerMobileHistory);
  const userId = user?.id;

  const openConversation = useCallback(async (conversationId: string) => {
    setActiveId(conversationId);
    setReplyFailure(null);
    setIsLoadingHistory(true);
    const { data, error } = await supabase
      .from("conversation_messages")
      .select("id, role, content, response_data, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setIsLoadingHistory(false);
    if (error) return onNotice("Clarita could not open that conversation.");
    const loadedMessages = (data ?? []).map(toMessage);
    setMessages(loadedMessages);
    setReplyFailure(loadedMessages.at(-1)?.role === "user" ? "Your message is saved, but Clarita has not answered it yet." : null);
  }, [onNotice, supabase]);

  useEffect(() => {
    if (!userId || !historyEnabled) return;
    let cancelled = false;

    async function initializeHistory() {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, pinned_at, archived_at, created_at, updated_at")
        .eq("user_id", userId as string)
        .order("updated_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        onNotice("Clarita could not load your conversation history.");
        return;
      }
      const threads = sortConversations(data ?? []);
      setConversations(threads);
      const firstActive = threads.find((thread) => !thread.archived_at);
      if (firstActive) await openConversation(firstActive.id);
    }

    void initializeHistory();
    return () => { cancelled = true; };
  }, [historyEnabled, onNotice, openConversation, supabase, userId]);

  useEffect(() => {
    function closeConversationMenu(event: PointerEvent) {
      if (!(event.target instanceof Element) || !event.target.closest("[data-conversation-menu]")) {
        setOpenMenuId(null);
      }
    }

    function closeConversationMenuWithKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenuId(null);
        setHistoryOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeConversationMenu);
    document.addEventListener("keydown", closeConversationMenuWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeConversationMenu);
      document.removeEventListener("keydown", closeConversationMenuWithKeyboard);
    };
  }, []);

  useEffect(() => {
    if (historyOpen && isMobileHistory) historyCloseRef.current?.focus();
  }, [historyOpen, isMobileHistory]);

  useEffect(() => {
    const stream = streamRef.current;
    if (stream) stream.scrollTo({ top: stream.scrollHeight, behavior: "smooth" });
    if (!isSending && messages.at(-1)?.role === "assistant") {
      composerRef.current?.focus({ preventScroll: true });
    }
  }, [isSending, messages]);

  function startNewConversation(seed = "") {
    setActiveId(null);
    setMessages([]);
    setDraft(seed);
    setReplyFailure(null);
    setHistoryOpen(false);
    setHistoryView("active");
    setOpenMenuId(null);
    setRenamingId(null);
    setPendingDeleteId(null);
  }

  function beginRename(thread: Conversation) {
    setRenameDraft(thread.title);
    setRenamingId(thread.id);
    setOpenMenuId(null);
    setPendingDeleteId(null);
  }

  async function renameConversation(event: FormEvent, conversationId: string) {
    event.preventDefault();
    const title = renameDraft.replace(/\s+/g, " ").trim().slice(0, 80);
    if (!title || updatingId) return;
    setUpdatingId(conversationId);

    try {
      const { data, error } = await supabase
        .from("conversations")
        .update({ title })
        .eq("id", conversationId)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();
      if (error || !data) throw error ?? new Error("Conversation was not renamed.");
      setConversations((current) => current.map((thread) => thread.id === conversationId ? { ...thread, title } : thread));
      setRenamingId(null);
      onNotice("Conversation renamed.");
    } catch {
      onNotice("Clarita could not rename that conversation. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function togglePin(thread: Conversation) {
    if (updatingId) return;
    setUpdatingId(thread.id);
    const pinnedAt = thread.pinned_at ? null : new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from("conversations")
        .update({ pinned_at: pinnedAt })
        .eq("id", thread.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();
      if (error || !data) throw error ?? new Error("Conversation pin was not updated.");
      setConversations((current) => sortConversations(current.map((item) => item.id === thread.id ? { ...item, pinned_at: pinnedAt } : item)));
      setOpenMenuId(null);
      onNotice(pinnedAt ? "Conversation pinned." : "Conversation unpinned.");
    } catch {
      onNotice("Clarita could not update that conversation. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function setConversationArchived(thread: Conversation, archive: boolean) {
    if (updatingId) return;
    setUpdatingId(thread.id);
    const archivedAt = archive ? new Date().toISOString() : null;

    try {
      const { data, error } = await supabase
        .from("conversations")
        .update({ archived_at: archivedAt })
        .eq("id", thread.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();
      if (error || !data) throw error ?? new Error("Conversation archive was not updated.");

      const updated = sortConversations(conversations.map((item) => item.id === thread.id ? { ...item, archived_at: archivedAt } : item));
      setConversations(updated);
      setOpenMenuId(null);

      if (archive && activeId === thread.id) {
        const nextActive = updated.find((item) => !item.archived_at);
        if (nextActive) await openConversation(nextActive.id);
        else startNewConversation();
      } else if (!archive && activeId === thread.id) {
        setHistoryView("active");
      }

      onNotice(archive ? "Conversation archived." : "Conversation restored.");
    } catch {
      onNotice("Clarita could not update that conversation. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function shareConversation(thread: Conversation) {
    setOpenMenuId(null);
    try {
      const { data, error } = await supabase
        .from("conversation_messages")
        .select("id, role, content, response_data, created_at")
        .eq("conversation_id", thread.id)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const transcript = (data ?? []).map((row) => {
        if (row.role === "user") return `You:\n${row.content}`;
        const reply = isChatReply(row.response_data) ? (row.response_data as unknown as ChatReply) : null;
        const prayer = ensurePrayerEnding(reply?.prayer ?? null);
        const biblicalConnections = reply?.biblicalConnections.map((connection) =>
          `${connection.name} — ${connection.reference}\n${connection.testimony}\n${connection.connection}`
        ).join("\n\n");
        const response = reply
          ? [reply.message, reply.scriptureTransition, biblicalConnections, prayer ? `Prayer:\n${prayer}` : "", reply.question]
              .filter(Boolean)
              .join("\n\n")
          : row.content;
        return `Clarita:\n${response}`;
      }).join("\n\n———\n\n");

      const shareText = `Clarita conversation: ${thread.title}\n\n${transcript}`;
      if (navigator.share) {
        await navigator.share({ title: `Clarita — ${thread.title}`, text: shareText });
        onNotice("Conversation shared.");
      } else {
        await navigator.clipboard.writeText(shareText);
        onNotice("Conversation copied. You can paste it where you want to share it.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      onNotice("Clarita could not prepare that conversation for sharing.");
    }
  }

  async function deleteConversation(conversationId: string) {
    if (isSending || deletingId) return;
    setDeletingId(conversationId);

    try {
      const { data: deletedConversation, error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (error || !deletedConversation) throw error ?? new Error("Conversation was not deleted.");

      const remaining = conversations.filter((thread) => thread.id !== conversationId);
      setConversations(remaining);
      setPendingDeleteId(null);
      setOpenMenuId(null);

      if (activeId === conversationId) {
        setHistoryOpen(false);
        const nextConversation = remaining.find((thread) => historyView === "archived" ? Boolean(thread.archived_at) : !thread.archived_at)
          ?? remaining.find((thread) => !thread.archived_at);
        if (nextConversation) {
          setHistoryView(nextConversation.archived_at ? "archived" : "active");
          await openConversation(nextConversation.id);
        } else {
          startNewConversation();
        }
      }

      onNotice("Conversation deleted.");
    } catch {
      onNotice("Clarita could not delete that conversation. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  async function requestAssistantReply(conversationId: string | null, text: string, priorMessages: Message[]) {
    const history: ChatHistoryItem[] = priorMessages.slice(-10).map((item) => ({
      role: item.role,
      content: item.role === "assistant" ? assistantHistoryContent(item) : item.content,
    }));
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, mood, history }),
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(failure?.error ?? "Clarita could not reply.");
    }
    const reply = (await response.json()) as ChatReply;

    if (!historyEnabled || !conversationId) {
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply.message,
        reply,
        createdAt: new Date().toISOString(),
      }]);
      setReplyFailure(null);
      return;
    }

    const { data: savedReply, error: replyError } = await supabase
      .from("conversation_messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: reply.message,
        response_data: reply as unknown as Json,
        source: reply.source,
      })
      .select("id, role, content, response_data, created_at")
      .single();
    if (replyError || !savedReply) throw replyError ?? new Error("Reply could not be saved.");

    const updatedAt = new Date().toISOString();
    await supabase.from("conversations").update({ updated_at: updatedAt }).eq("id", conversationId).eq("user_id", user.id);
    setConversations((current) => current
      .map((thread) => thread.id === conversationId ? { ...thread, updated_at: updatedAt } : thread)
      .sort((a, b) => {
        if (Boolean(a.pinned_at) !== Boolean(b.pinned_at)) return a.pinned_at ? -1 : 1;
        return b.updated_at.localeCompare(a.updated_at);
      }));
    setMessages((current) => [...current, toMessage(savedReply)]);
    setReplyFailure(null);
  }

  async function retryLastReply() {
    if ((!activeId && historyEnabled) || isSending) return;
    const lastMessage = messages.at(-1);
    if (!lastMessage || lastMessage.role !== "user") return;

    setIsSending(true);
    setReplyFailure(null);
    try {
      await requestAssistantReply(activeId, lastMessage.content, messages.slice(0, -1));
    } catch (error) {
      setReplyFailure(error instanceof Error ? error.message : "Clarita could not answer yet. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  async function sendMessage(rawText: string) {
    const text = rawText.trim();
    if (!text || isSending) return;
    setDraft("");
    setIsSending(true);
    setReplyFailure(null);
    let userMessageSaved = false;
    let optimisticId: string | null = null;

    try {
      let conversationId = activeId;

      if (historyEnabled && !conversationId) {
        const { data, error } = await supabase
          .from("conversations")
          .insert({ user_id: user.id, title: makeTitle(text) })
          .select("id, title, pinned_at, archived_at, created_at, updated_at")
          .single();
        if (error || !data) throw new Error("Conversation could not be created.");
        conversationId = data.id;
        setActiveId(data.id);
        setConversations((current) => [data, ...current]);
      } else if (historyEnabled && conversationId) {
        const currentConversation = conversations.find((thread) => thread.id === conversationId);
        if (currentConversation?.archived_at) {
          const { error } = await supabase
            .from("conversations")
            .update({ archived_at: null })
            .eq("id", conversationId)
            .eq("user_id", user.id);
          if (error) throw error;
          setConversations((current) => current.map((thread) => thread.id === conversationId ? { ...thread, archived_at: null } : thread));
          setHistoryView("active");
          onNotice("Conversation restored because you continued it.");
        }
      }

      const now = new Date().toISOString();
      optimisticId = crypto.randomUUID();
      const optimisticUser: Message = { id: optimisticId, role: "user", content: text, reply: null, createdAt: now };
      const priorMessages = messages;
      setMessages((current) => [...current, optimisticUser]);

      if (historyEnabled && conversationId) {
        const { data: savedUser, error: userMessageError } = await supabase
          .from("conversation_messages")
          .insert({
            conversation_id: conversationId,
            role: "user",
            content: text,
          })
          .select("id, role, content, response_data, created_at")
          .single();
        if (userMessageError || !savedUser) throw userMessageError ?? new Error("Message could not be saved.");
        setMessages((current) => current.map((item) => item.id === optimisticId ? toMessage(savedUser) : item));
      }
      userMessageSaved = true;

      await requestAssistantReply(conversationId, text, priorMessages);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clarita could not answer yet. Please try again.";
      if (userMessageSaved) {
        setReplyFailure(message);
      } else {
        if (optimisticId) setMessages((current) => current.filter((item) => item.id !== optimisticId));
        setDraft(text);
        onNotice("Clarita could not save that message. Please try again.");
      }
    } finally {
      setIsSending(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(draft);
  }

  const saveLabel = historyEnabled ? "Saved to your account" : "Temporary chat · not saved";
  const visibleConversations = conversations.filter((thread) => historyView === "archived" ? Boolean(thread.archived_at) : !thread.archived_at);

  return (
    <section className={`conversation page-enter ${historyEnabled ? "" : "conversation--temporary"} ${sidebarCollapsed ? "conversation--sidebar-collapsed" : ""}`}>
      {historyEnabled && historyOpen && isMobileHistory && (
        <button
          type="button"
          className="conversation__backdrop"
          aria-label="Close conversation history"
          onClick={() => setHistoryOpen(false)}
        />
      )}
      <aside
        id="conversation-history"
        className={`conversation__sidebar ${historyOpen ? "is-open" : ""} ${sidebarCollapsed ? "is-collapsed" : ""}`}
        aria-hidden={isMobileHistory && !historyOpen}
        inert={isMobileHistory && !historyOpen}
      >
        <div className="conversation-sidebar__global">
          <button
            type="button"
            className="desktop-sidebar-toggle"
            onClick={onToggleSidebar}
            aria-label={sidebarCollapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"}
            aria-controls="conversation-history"
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span>Collapse</span></>}
          </button>
          <nav className="conversation-sidebar__nav" aria-label="Primary navigation">
            <button type="button" onClick={onHome} title="Home"><Home size={18} /><span>Home</span></button>
            <button type="button" className="active" aria-current="page" title="Talk"><MessageCircle size={18} /><span>Talk</span></button>
            <button type="button" onClick={onSaved} title="Saved"><Bookmark size={18} /><span>Saved</span></button>
          </nav>
        </div>
        {historyEnabled && <div className="conversation-sidebar__history">
          <div className="conversation__sidebar-heading">
            <span><History size={16} /> Conversations</span>
            <button ref={historyCloseRef} className="mobile-history-close" onClick={() => setHistoryOpen(false)} aria-label="Close conversation history"><X size={17} /></button>
          </div>
          <button className="new-conversation" onClick={() => startNewConversation()} title="New conversation"><MessageCircle size={16} /><span>New conversation</span></button>
          <div className="conversation-list__filters" aria-label="Conversation history views">
          <button
            type="button"
            className={historyView === "active" ? "active" : ""}
            onClick={() => { setHistoryView("active"); setOpenMenuId(null); setRenamingId(null); setPendingDeleteId(null); }}
          >
            <MessageCircle size={13} /> Chats
          </button>
          <button
            type="button"
            className={historyView === "archived" ? "active" : ""}
            onClick={() => { setHistoryView("archived"); setOpenMenuId(null); setRenamingId(null); setPendingDeleteId(null); }}
          >
            <Archive size={13} /> Archived
          </button>
          </div>
          <div className="conversation-list">
          {visibleConversations.length === 0 && (
            <p>{historyView === "archived" ? "Chats you archive will be kept safely here until you restore or delete them." : "Your conversations will appear here and remain available for future reference."}</p>
          )}
          {visibleConversations.map((thread) => (
            <div key={thread.id} className={`conversation-list__item ${activeId === thread.id ? "active" : ""}`}>
              {renamingId === thread.id ? (
                <form className="conversation-list__rename" onSubmit={(event) => void renameConversation(event, thread.id)}>
                  <label htmlFor={`rename-${thread.id}`}>Rename chat</label>
                  <input
                    id={`rename-${thread.id}`}
                    value={renameDraft}
                    onChange={(event) => setRenameDraft(event.target.value)}
                    maxLength={80}
                    autoFocus
                  />
                  <div>
                    <button type="button" onClick={() => setRenamingId(null)} disabled={updatingId === thread.id}><X size={13} /> Cancel</button>
                    <button type="submit" disabled={!renameDraft.trim() || updatingId === thread.id}>
                      {updatingId === thread.id ? <LoaderCircle className="spin" size={13} /> : <Check size={13} />} Save
                    </button>
                  </div>
                </form>
              ) : pendingDeleteId === thread.id ? (
                <div className="conversation-list__confirm" role="alert">
                  <span>Delete this chat?</span>
                  <div>
                    <button type="button" onClick={() => setPendingDeleteId(null)} disabled={deletingId === thread.id}>Cancel</button>
                    <button
                      type="button"
                      className="conversation-list__confirm-delete"
                      onClick={() => void deleteConversation(thread.id)}
                      disabled={deletingId === thread.id}
                    >
                      {deletingId === thread.id ? <LoaderCircle className="spin" size={13} /> : <Trash2 size={13} />}
                      {deletingId === thread.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="conversation-list__open"
                    onClick={() => { setHistoryOpen(false); setOpenMenuId(null); setPendingDeleteId(null); void openConversation(thread.id); }}
                  >
                    <span>{thread.pinned_at && <Pin size={10} aria-label="Pinned" />}{thread.title}</span>
                    <small>{new Date(thread.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small>
                  </button>
                  <div className="conversation-list__actions" data-conversation-menu>
                    <button
                      type="button"
                      className="conversation-list__more"
                      onClick={() => setOpenMenuId((current) => current === thread.id ? null : thread.id)}
                      disabled={isSending || Boolean(deletingId) || Boolean(updatingId)}
                      aria-label={`More options for ${thread.title}`}
                      aria-expanded={openMenuId === thread.id}
                      aria-haspopup="menu"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {openMenuId === thread.id && (
                      <div className="conversation-list__menu" role="menu" aria-label={`Options for ${thread.title}`}>
                        <button type="button" role="menuitem" onClick={() => void shareConversation(thread)}><Share2 size={15} /> Share</button>
                        <button type="button" role="menuitem" onClick={() => beginRename(thread)}><Pencil size={15} /> Rename</button>
                        <button type="button" role="menuitem" onClick={() => void togglePin(thread)}>
                          {thread.pinned_at ? <PinOff size={15} /> : <Pin size={15} />}{thread.pinned_at ? "Unpin chat" : "Pin chat"}
                        </button>
                        <button type="button" role="menuitem" onClick={() => void setConversationArchived(thread, !thread.archived_at)}>
                          {thread.archived_at ? <RotateCcw size={15} /> : <Archive size={15} />}{thread.archived_at ? "Restore" : "Archive"}
                        </button>
                        <span className="conversation-list__menu-divider" />
                        <button
                          type="button"
                          role="menuitem"
                          className="danger"
                          onClick={() => { setOpenMenuId(null); setPendingDeleteId(thread.id); }}
                        >
                          <Trash2 size={15} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          </div>
        </div>}
        <div className="conversation-sidebar__footer">
          {!sidebarCollapsed && (
            <label className="sidebar-width-control">
              <span>Sidebar width</span>
              <input type="range" min="190" max="300" step="10" value={sidebarWidth} onChange={(event) => onSidebarWidth(Number(event.target.value))} />
            </label>
          )}
          <button type="button" className="conversation-sidebar__you" onClick={onYou} title="You"><UserRound size={18} /><span>You</span></button>
        </div>
      </aside>

      <div className="conversation__main">
        <header className="conversation__header">
          <div><span><strong>Talk with Clarita</strong><small><Check size={12} /> {saveLabel}</small></span></div>
          <div className="conversation__header-actions">
            {historyEnabled && (
              <button
                className="mobile-history-toggle"
                onClick={() => setHistoryOpen(true)}
                aria-controls="conversation-history"
                aria-expanded={historyOpen}
              >
                <History size={15} /> History
              </button>
            )}
            <button onClick={() => startNewConversation()}><Plus size={15} /> New</button>
          </div>
        </header>

        <div className="message-stream" aria-live="polite" ref={streamRef}>
          {isLoadingHistory ? (
            <div className="conversation-loading"><LoaderCircle className="spin" /> Opening your conversation…</div>
          ) : messages.length === 0 ? (
            <div className="conversation-welcome">
              <BrandMark compact />
              <span className="section-kicker">A conversation, kept for you</span>
              <h1>I’m here. What would you like to share?</h1>
              <p>Talk naturally. Clarita will listen, respond as a Christian companion, and help you explore Scripture and the lives of people in the Bible.</p>
              <div className="conversation-starters">
                <button onClick={() => startNewConversation("I’m just grateful today because ")}>I’m grateful today</button>
                <button onClick={() => startNewConversation("Something has been worrying me: ")}>Something worries me</button>
                <button onClick={() => startNewConversation("I need God’s direction about ")}>I need direction</button>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <ConversationMessage
                key={message.id}
                message={message}
                user={user}
                supabase={supabase}
                onNotice={onNotice}
                isLatest={message.id === messages.at(-1)?.id}
                actionDisabled={isSending}
                onSuggestedAction={(action) => void sendMessage(suggestedActionPrompts[action])}
              />
            ))
          )}
          {isSending && <div className="assistant-thinking"><BrandMark compact /><span>Clarita is listening and reflecting…</span></div>}
          {!isSending && replyFailure && (
            <div className="reply-recovery" role="status">
              <span>{replyFailure}</span>
              <button type="button" onClick={() => void retryLastReply()}>Try the response again</button>
            </div>
          )}
        </div>

        <form className="conversation-composer" onSubmit={submit}>
          <textarea
            ref={composerRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Share what’s on your heart…"
            aria-label="Message Clarita"
            rows={2}
            maxLength={3000}
          />
          <button type="submit" disabled={!draft.trim() || isSending} aria-label="Send message"><Send size={18} /></button>
          <small><Sparkles size={11} /> {messages.at(-1)?.role === "assistant" ? "Clarita is listening · Take your time" : "Enter to send · Shift + Enter for a new line"}</small>
        </form>
      </div>
    </section>
  );
}

type ConversationMessageProps = {
  message: Message;
  user: User;
  supabase: ReturnType<typeof createClient>;
  onNotice: (message: string | null) => void;
  isLatest: boolean;
  actionDisabled: boolean;
  onSuggestedAction: (action: SuggestedActionId) => void;
};

function ConversationMessage({ message, user, supabase, onNotice, isLatest, actionDisabled, onSuggestedAction }: ConversationMessageProps) {
  const [feedback, setFeedback] = useState<"helpful" | "not_helpful" | "concern" | null>(null);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDetail, setReportDetail] = useState("");

  async function copyResponse() {
    const reply = message.reply;
    const prayer = ensurePrayerEnding(reply?.prayer ?? null);
    const text = reply
      ? [
          reply.message,
          reply.scriptureTransition,
          ...reply.biblicalConnections.map((connection) => `${connection.name} — ${connection.reference}\n${connection.testimony}\n${connection.connection}`),
          prayer ? `Prayer\n${prayer}` : "",
          reply.question,
        ].filter(Boolean).join("\n\n")
      : message.content;
    try {
      await navigator.clipboard.writeText(text);
      onNotice("Clarita’s response was copied.");
    } catch {
      onNotice("Your browser could not copy that response.");
    }
  }

  async function submitFeedback(rating: "helpful" | "not_helpful" | "concern", detail: string | null = null) {
    if (feedbackBusy || feedback) return;
    setFeedbackBusy(true);
    try {
      const { error } = await supabase.from("response_feedback").insert({
        user_id: user.id,
        rating,
        safety_level: message.reply?.safetyLevel ?? null,
        response_source: message.reply?.source ?? null,
        detail,
        consent_to_review: rating === "concern",
      });
      if (error) throw error;
      setFeedback(rating);
      setReportOpen(false);
      setReportDetail("");
      onNotice(rating === "concern" ? "Thank you. Your concern was recorded for review." : "Thank you for helping Clarita improve.");
    } catch {
      onNotice("Clarita could not save that feedback. Please try again.");
    } finally {
      setFeedbackBusy(false);
    }
  }

  if (message.role === "user") return <article className="chat-message chat-message--user"><p>{message.content}</p></article>;
  const reply = message.reply;
  const prayer = ensurePrayerEnding(reply?.prayer ?? null);
  return (
    <article className="chat-message chat-message--assistant">
      <div className="chat-message__identity"><BrandMark compact /><span>Clarita</span></div>
      <p className="chat-message__body">{reply?.message ?? message.content}</p>
      {reply?.scriptureTransition && <p className="scripture-transition">{reply.scriptureTransition}</p>}
      {reply?.biblicalConnections.map((connection) => (
        <div className="biblical-connection" key={`${connection.name}-${connection.reference}`}>
          <div><BookOpen size={15} /><span><strong>{connection.name}</strong><small>{connection.reference}</small></span></div>
          <p>{connection.testimony}</p>
          <p>{connection.connection}</p>
        </div>
      ))}
      {prayer && <div className="chat-prayer"><span>A prayer you can make your own</span><p>{prayer}</p></div>}
      {reply?.supportNote && <p className="emergency-notice">{reply.supportNote}</p>}
      {reply?.question && <p className="chat-question">{reply.question}</p>}
      {isLatest && actionsForReply(reply).length > 0 && (
        <div className="suggested-actions" aria-label="Choose how to continue">
          {actionsForReply(reply).map((action) => (
            <button key={action.id} type="button" onClick={() => onSuggestedAction(action.id)} disabled={actionDisabled}>
              {action.label}
            </button>
          ))}
        </div>
      )}
      {reply && <small className="chat-source">{reply.source === "generated" ? "AI-assisted response" : reply.source === "safety" ? "Safety response" : "Reviewed response"}</small>}
      <div className="message-actions" aria-label="Response actions">
        <button type="button" onClick={() => void copyResponse()}><Clipboard size={14} /> Copy</button>
        {feedback ? (
          <span role="status"><Check size={14} /> Feedback sent</span>
        ) : (
          <>
            <button type="button" onClick={() => void submitFeedback("helpful")} disabled={feedbackBusy}><ThumbsUp size={14} /> Helpful</button>
            <button type="button" onClick={() => void submitFeedback("not_helpful")} disabled={feedbackBusy}><ThumbsDown size={14} /> Not helpful</button>
            <button type="button" onClick={() => setReportOpen((current) => !current)} aria-expanded={reportOpen} disabled={feedbackBusy}><Flag size={14} /> Report concern</button>
          </>
        )}
      </div>
      {reportOpen && !feedback && (
        <form
          className="message-report"
          onSubmit={(event) => {
            event.preventDefault();
            void submitFeedback("concern", reportDetail.trim());
          }}
        >
          <label htmlFor={`report-${message.id}`}>What felt concerning or unsafe?</label>
          <textarea id={`report-${message.id}`} value={reportDetail} onChange={(event) => setReportDetail(event.target.value)} maxLength={1000} rows={3} required />
          <div>
            <button type="button" onClick={() => { setReportOpen(false); setReportDetail(""); }}>Cancel</button>
            <button type="submit" disabled={!reportDetail.trim() || feedbackBusy}>{feedbackBusy ? "Sending…" : "Send concern"}</button>
          </div>
        </form>
      )}
    </article>
  );
}
