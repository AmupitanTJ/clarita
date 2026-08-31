"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Check, ChevronRight, History, LoaderCircle, MessageCircle, Plus, Send, Sparkles, Trash2, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { BrandMark } from "@/components/brand-mark";
import type { MoodId } from "@/data/clarita-content";
import type { ChatHistoryItem, ChatReply } from "@/lib/chat";
import { createClient, type Json } from "@/lib/supabase";

type Conversation = { id: string; title: string; created_at: string; updated_at: string };
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
  onNotice: (message: string | null) => void;
};

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

export function ConversationScreen({ mood, user, supabase, onNotice }: ConversationScreenProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const userId = user?.id;

  const openConversation = useCallback(async (conversationId: string) => {
    setActiveId(conversationId);
    setIsLoadingHistory(true);
    const { data, error } = await supabase
      .from("conversation_messages")
      .select("id, role, content, response_data, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setIsLoadingHistory(false);
    if (error) return onNotice("Clarita could not open that conversation.");
    setMessages((data ?? []).map(toMessage));
  }, [onNotice, supabase]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function initializeHistory() {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, created_at, updated_at")
        .eq("user_id", userId as string)
        .order("updated_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        onNotice("Clarita could not load your conversation history.");
        return;
      }
      const threads = data ?? [];
      setConversations(threads);
      if (threads[0]) await openConversation(threads[0].id);
    }

    void initializeHistory();
    return () => { cancelled = true; };
  }, [onNotice, openConversation, supabase, userId]);

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
    setHistoryOpen(false);
    setPendingDeleteId(null);
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

      if (activeId === conversationId) {
        setHistoryOpen(false);
        if (remaining[0]) {
          await openConversation(remaining[0].id);
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;
    setDraft("");
    setIsSending(true);

    try {
      let conversationId = activeId;

      if (!conversationId) {
        const { data, error } = await supabase
          .from("conversations")
          .insert({ user_id: user.id, title: makeTitle(text) })
          .select("id, title, created_at, updated_at")
          .single();
        if (error || !data) throw new Error("Conversation could not be created.");
        conversationId = data.id;
        setActiveId(data.id);
        setConversations((current) => [data, ...current]);
      }

      const now = new Date().toISOString();
      const optimisticUser: Message = { id: crypto.randomUUID(), role: "user", content: text, reply: null, createdAt: now };
      const priorMessages = messages;
      setMessages((current) => [...current, optimisticUser]);

      const { error: userMessageError } = await supabase.from("conversation_messages").insert({
        conversation_id: conversationId,
        role: "user",
        content: text,
      });
      if (userMessageError) throw userMessageError;

      const history: ChatHistoryItem[] = priorMessages.slice(-10).map((item) => ({
        role: item.role,
        content: item.role === "assistant" && item.reply?.question
          ? `${item.content}\nFollow-up question: ${item.reply.question}`
          : item.content,
      }));
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, mood, history }),
      });
      if (!response.ok) throw new Error("Clarita could not reply.");
      const reply = (await response.json()) as ChatReply;

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
      await supabase.from("conversations").update({ updated_at: updatedAt }).eq("id", conversationId);
      setConversations((current) => current
        .map((thread) => thread.id === conversationId ? { ...thread, updated_at: updatedAt } : thread)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
      setMessages((current) => [...current, toMessage(savedReply)]);
    } catch (error) {
      setDraft(text);
      onNotice(error instanceof Error && error.message.includes("security check")
        ? error.message
        : "Clarita could not save or answer that message. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  const saveLabel = "Saved to your account";

  return (
    <section className="conversation page-enter">
      <aside className={`conversation__sidebar ${historyOpen ? "is-open" : ""}`}>
        <div className="conversation__sidebar-heading">
          <span><History size={16} /> Conversations</span>
          <span className="conversation__sidebar-actions">
            <button onClick={() => startNewConversation()} aria-label="Start a new conversation"><Plus size={17} /></button>
            <button className="mobile-history-close" onClick={() => setHistoryOpen(false)} aria-label="Close conversation history"><X size={17} /></button>
          </span>
        </div>
        <button className="new-conversation" onClick={() => startNewConversation()}><MessageCircle size={16} /> New conversation</button>
        <div className="conversation-list">
          {conversations.length === 0 && <p>Your conversations will appear here and remain available for future reference.</p>}
          {conversations.map((thread) => (
            <div key={thread.id} className={`conversation-list__item ${activeId === thread.id ? "active" : ""}`}>
              {pendingDeleteId === thread.id ? (
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
                    onClick={() => { setHistoryOpen(false); setPendingDeleteId(null); void openConversation(thread.id); }}
                  >
                    <span>{thread.title}</span>
                    <small>{new Date(thread.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small>
                    <ChevronRight size={14} />
                  </button>
                  <button
                    type="button"
                    className="conversation-list__delete"
                    onClick={() => setPendingDeleteId(thread.id)}
                    disabled={isSending || Boolean(deletingId)}
                    aria-label={`Delete conversation: ${thread.title}`}
                    title="Delete conversation"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </aside>

      <div className="conversation__main">
        <header className="conversation__header">
          <div><BrandMark compact /><span><strong>Talk with Clarita</strong><small><Check size={12} /> {saveLabel}</small></span></div>
          <div className="conversation__header-actions">
            <button className="mobile-history-toggle" onClick={() => setHistoryOpen(true)}><History size={15} /> History</button>
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
            messages.map((message) => <ConversationMessage key={message.id} message={message} />)
          )}
          {isSending && <div className="assistant-thinking"><BrandMark compact /><span>Clarita is listening and reflecting…</span></div>}
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

function ConversationMessage({ message }: { message: Message }) {
  if (message.role === "user") return <article className="chat-message chat-message--user"><p>{message.content}</p></article>;
  const reply = message.reply;
  return (
    <article className="chat-message chat-message--assistant">
      <div className="chat-message__identity"><BrandMark compact /><span>Clarita</span></div>
      <p className="chat-message__body">{reply?.message ?? message.content}</p>
      {reply?.biblicalConnections.map((connection) => (
        <div className="biblical-connection" key={`${connection.name}-${connection.reference}`}>
          <div><BookOpen size={15} /><span><strong>{connection.name}</strong><small>{connection.reference}</small></span></div>
          <p>{connection.testimony}</p>
          <p>{connection.connection}</p>
        </div>
      ))}
      {reply?.prayer && <div className="chat-prayer"><span>A prayer you can make your own</span><p>{reply.prayer}</p></div>}
      {reply?.supportNote && <p className="emergency-notice">{reply.supportNote}</p>}
      {reply?.question && <p className="chat-question">{reply.question}</p>}
      {reply && <small className="chat-source">{reply.source === "generated" ? "AI-assisted response" : reply.source === "safety" ? "Safety response" : "Reviewed response"}</small>}
    </article>
  );
}
