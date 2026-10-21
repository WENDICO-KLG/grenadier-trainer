"use client";

import { CornerDownRight, MessageCircle, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { addComment, deleteComment } from "@/app/actions";
import { Avatar } from "@/components/avatar";
import type { ExerciseComment } from "@/lib/data";
import type { ExerciseId } from "@/lib/exercises";

const MAX = 1000;

export function CommentsSection({
  exerciseId,
  comments,
  currentUserId,
  available,
}: {
  exerciseId: ExerciseId;
  comments: ExerciseComment[];
  currentUserId: string;
  available: boolean;
}) {
  const [replyTo, setReplyTo] = useState<{ rootId: number; mention: string } | null>(null);

  if (!available) {
    return (
      <p className="rounded-3xl bg-card p-5 text-sm text-muted">
        Kommentare sind noch nicht aktiviert – die Datenbank-Migration <code>003_comments_members.sql</code> fehlt.
      </p>
    );
  }

  return (
    <div>
      <Composer exerciseId={exerciseId} placeholder="Tipp teilen oder Frage stellen…" />

      {comments.length === 0 ? (
        <div className="mt-3 flex flex-col items-center rounded-3xl bg-card px-5 py-8 text-center">
          <MessageCircle size={28} className="text-muted" />
          <p className="mt-3 font-medium">Noch keine Kommentare</p>
          <p className="mt-1 text-sm text-muted">Stell die erste Frage oder teile deinen besten Tipp.</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-3xl bg-card p-4">
              <CommentItem
                comment={c}
                exerciseId={exerciseId}
                own={c.userId === currentUserId}
                onReply={() => setReplyTo({ rootId: c.id, mention: "" })}
              />

              {(c.replies.length > 0 || replyTo?.rootId === c.id) && (
                <div className="mt-3 space-y-3 border-l-2 border-line pl-4">
                  {c.replies.map((r) => (
                    <CommentItem
                      key={r.id}
                      comment={r}
                      exerciseId={exerciseId}
                      own={r.userId === currentUserId}
                      small
                      onReply={() =>
                        setReplyTo({ rootId: c.id, mention: r.author?.display_name ? `@${r.author.display_name} ` : "" })
                      }
                    />
                  ))}
                  {replyTo?.rootId === c.id && (
                    <Composer
                      key={`${c.id}-${replyTo.mention}`}
                      exerciseId={exerciseId}
                      parentId={c.id}
                      initial={replyTo.mention}
                      placeholder={`Antwort an ${c.author?.display_name ?? "Unbekannt"}…`}
                      autoFocus
                      onDone={() => setReplyTo(null)}
                      onCancel={() => setReplyTo(null)}
                    />
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  exerciseId,
  own,
  small = false,
  onReply,
}: {
  comment: ExerciseComment;
  exerciseId: ExerciseId;
  own: boolean;
  small?: boolean;
  onReply: () => void;
}) {
  const [pending, start] = useTransition();
  const name = comment.author?.display_name ?? "Unbekannt";

  return (
    <div className={`flex gap-3 ${pending ? "opacity-50" : ""}`}>
      <Avatar url={comment.author?.avatar_url} name={name} size={small ? 28 : 36} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-semibold">{name}</span>
          {own && <span className="rounded-full bg-lime-dim px-1.5 text-[10px] font-semibold text-lime">Du</span>}
          <span className="text-xs text-muted">{comment.timeAgo}</span>
        </p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{comment.body}</p>
        <div className="mt-1.5 flex gap-4 text-xs font-medium text-muted">
          <button onClick={onReply} className="flex items-center gap-1 py-1 hover:text-white">
            <CornerDownRight size={13} /> Antworten
          </button>
          {own && (
            <button
              disabled={pending}
              onClick={() => {
                const msg = comment.replies.length
                  ? "Kommentar inkl. aller Antworten löschen?"
                  : "Kommentar löschen?";
                if (confirm(msg)) start(async () => void (await deleteComment(comment.id, exerciseId)));
              }}
              className="flex items-center gap-1 py-1 hover:text-red-400"
            >
              <Trash2 size={13} /> Löschen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Composer({
  exerciseId,
  parentId = null,
  placeholder,
  initial = "",
  autoFocus = false,
  onDone,
  onCancel,
}: {
  exerciseId: ExerciseId;
  parentId?: number | null;
  placeholder: string;
  initial?: string;
  autoFocus?: boolean;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);
  const trimmed = text.trim();

  // Cursor ans Ende setzen (hinter die @Erwähnung)
  useEffect(() => {
    const el = ref.current;
    if (autoFocus && el) el.setSelectionRange(el.value.length, el.value.length);
  }, [autoFocus]);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await addComment(exerciseId, trimmed, parentId);
      if ("error" in res && res.error) return setError(res.error);
      setText("");
      requestAnimationFrame(resize);
      onDone?.();
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed && !pending) submit();
      }}
      className={parentId ? "" : "rounded-3xl bg-card p-3"}
    >
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          value={text}
          rows={1}
          maxLength={MAX}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value);
            resize();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && trimmed && !pending) submit();
            if (e.key === "Escape") onCancel?.();
          }}
          className="max-h-[200px] min-h-11 min-w-0 flex-1 resize-none rounded-2xl border border-line bg-card-2 px-4 py-2.5 text-base leading-snug outline-none placeholder:text-muted focus:border-lime"
        />
        <button
          type="submit"
          aria-label="Senden"
          disabled={!trimmed || pending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime text-black disabled:bg-card-2 disabled:text-muted"
        >
          <Send size={18} className={pending ? "animate-pulse" : ""} />
        </button>
      </div>
      <div className="flex justify-between px-1 pt-1.5 text-xs text-muted">
        <span className="text-red-400">{error}</span>
        <span className="flex gap-3">
          {text.length > MAX - 150 && (
            <span>
              {text.length}/{MAX}
            </span>
          )}
          {onCancel && (
            <button type="button" onClick={onCancel} className="hover:text-white">
              Abbrechen
            </button>
          )}
        </span>
      </div>
    </form>
  );
}
