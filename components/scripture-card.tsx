"use client";

import { useState } from "react";
import { Bookmark, Check, ChevronDown, ExternalLink, Headphones } from "lucide-react";
import type { ScriptureCardData } from "@/data/clarita-content";

export function ScriptureCard({ passage, onSave }: { passage: ScriptureCardData; onSave?: (passage: ScriptureCardData, saved: boolean) => Promise<boolean> }) {
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function toggleSave() {
    if (saving) return;
    const next = !saved;
    if (!onSave) return setSaved(next);
    setSaving(true);
    const accepted = await onSave(passage, next);
    if (accepted) setSaved(next);
    setSaving(false);
  }

  return (
    <article className="scripture-card">
      <div className="scripture-card__topline">
        <span>{passage.translation}</span>
        <span className="verified-label"><Check size={12} /> Reviewed demo</span>
      </div>
      <p className="scripture-card__reference">{passage.reference}</p>
      <blockquote>“{passage.excerpt}”</blockquote>
      <button
        type="button"
        className="context-toggle"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        Read the context
        <ChevronDown size={18} className={expanded ? "rotated" : ""} />
      </button>
      {expanded && (
        <div className="context-panel">
          <p><strong>In context</strong>{passage.context}</p>
          <p><strong>Why this may help</strong>{passage.relevance}</p>
          <a href={`https://ebible.org/web/${passage.reference.split(" ")[0].toLowerCase()}.htm`} target="_blank" rel="noreferrer">
            Read full passage <ExternalLink size={14} />
          </a>
        </div>
      )}
      <div className="card-actions">
        <button type="button" onClick={toggleSave} disabled={saving} className={saved ? "is-saved" : ""}>
          {saved ? <Check size={16} /> : <Bookmark size={16} />} {saving ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
        <button type="button" disabled title="Audio is planned after the MVP prototype">
          <Headphones size={16} /> Listen
        </button>
      </div>
    </article>
  );
}
