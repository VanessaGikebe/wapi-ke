"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";

import { BackLink } from "@/components/site/back-link";
import { SiteHeader } from "@/components/site/site-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  sendAssistantMessage,
  type AssistantResponse,
} from "@/lib/api/assistant";
import { cn } from "@/lib/utils";

/*
 * AI Assistant chat — recreated from the `wapike_ai_assistant` Stitch export.
 * Calls POST /api/v1/assistant/message per message; when the assistant returns
 * a suggestion, renders a CTA that deep-links to the matching category listing
 * pre-filtered with the suggested filters.
 */

type Suggestion = { slug: string; filters: Record<string, unknown> | null };

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  suggestion?: Suggestion | null;
}

const SUGGESTED_PROMPTS = [
  "Romantic rooftop dinner in Nairobi",
  "Weekend hike near the city",
  "Family-friendly day out",
];

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'm your Wapike concierge. Tell me your mood, the occasion, who you're with, and roughly your budget — I'll find the perfect experience.",
};

function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildQuery(filters: Record<string, unknown> | null): string {
  const params = new URLSearchParams();
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, String(v)));
      } else if (typeof value === "boolean") {
        if (value) params.set(key, "true");
      } else if (value != null) {
        params.set(key, String(value));
      }
    }
  }
  return params.toString();
}

export default function AssistantPage() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = React.useState("");
  const sessionId = React.useRef<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: (text: string) => sendAssistantMessage(text, sessionId.current),
    onSuccess: (data: AssistantResponse) => {
      sessionId.current = data.session_id;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          suggestion: data.suggested_category
            ? { slug: data.suggested_category, filters: data.suggested_filters }
            : null,
        },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry — I couldn't reach the assistant just now. Please try again in a moment.",
        },
      ]);
    },
  });

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, mutation.isPending]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || mutation.isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    mutation.mutate(trimmed);
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center px-margin-mobile py-8 md:px-margin-desktop">
        <div className="mb-4 w-full max-w-4xl">
          <BackLink href="/" label="Back to Home" />
        </div>
        <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-lowest shadow-tonal md:flex-row">
          {/* Sidebar */}
          <aside className="border-b border-outline-variant/30 bg-surface-container-low/60 p-6 md:w-1/3 md:border-b-0 md:border-r md:p-8">
            <SparkleIcon className="h-8 w-8 text-primary" />
            <h1 className="mt-3 font-headline-sm text-headline-sm text-primary">
              Wapike AI
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Your personal concierge.
            </p>
            <div className="mt-6 hidden md:block">
              <p className="mb-3 font-label-md text-label-md uppercase text-on-surface-variant">
                Try asking
              </p>
              <div className="flex flex-col items-start gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => send(prompt)}
                    disabled={mutation.isPending}
                    className="transition-subtle rounded-full bg-savannah-mist px-3 py-1.5 text-left font-caption text-caption text-primary hover:bg-secondary-container disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Chat */}
          <div className="flex h-[70vh] flex-1 flex-col md:h-[78vh]">
            <div
              ref={scrollRef}
              className="flex-1 space-y-6 overflow-y-auto p-6 md:p-8"
            >
              {messages.map((message, index) => (
                <MessageBubble key={index} message={message} />
              ))}
              {mutation.isPending && <TypingBubble />}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                send(input);
              }}
              className="border-t border-outline-variant/30 bg-surface-container-lowest p-4 md:p-6"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Tell me what you're in the mood for…"
                  aria-label="Message the assistant"
                  disabled={mutation.isPending}
                />
                <Button
                  type="submit"
                  size="icon"
                  aria-label="Send message"
                  disabled={mutation.isPending || !input.trim()}
                >
                  <SendIcon className="h-5 w-5" />
                </Button>
              </div>
              <p className="mt-2 text-center font-caption text-caption text-on-surface-variant/70">
                Wapike AI can make mistakes. Verify important details.
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 font-body-md text-body-md text-on-primary shadow-tonal">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
        <SparkleIcon className="h-4 w-4" />
      </span>
      <div className="flex w-full max-w-[85%] flex-col gap-3">
        <div className="w-fit rounded-2xl rounded-tl-sm bg-savannah-mist px-4 py-3 font-body-md text-body-md text-primary shadow-tonal">
          {message.content}
        </div>
        {message.suggestion && (
          <SuggestionCard suggestion={message.suggestion} />
        )}
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const query = buildQuery(suggestion.filters);
  const href = `/categories/${suggestion.slug}${query ? `?${query}` : ""}`;
  const chips = (
    suggestion.filters
      ? Object.values(suggestion.filters)
          .flatMap((v) => (Array.isArray(v) ? v : [v]))
          .filter((v): v is string => typeof v === "string")
      : []
  ).slice(0, 4);

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-tonal">
      <div
        aria-hidden
        className="h-24 bg-gradient-to-tr from-primary via-primary-container to-secondary/40"
      />
      <div className="flex flex-col gap-3 p-5">
        <div>
          <p className="font-label-md text-label-md uppercase text-secondary">
            Recommended for you
          </p>
          <h3 className="font-headline-sm text-headline-sm text-primary">
            {titleCase(suggestion.slug)}
          </h3>
        </div>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <Badge key={chip} variant="subtle" shape="chip">
                {chip}
              </Badge>
            ))}
          </div>
        )}
        <Link
          href={href}
          className={cn(
            buttonVariants({ variant: "primary", size: "sm" }),
            "w-full",
          )}
        >
          View matching experiences
        </Link>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
        <SparkleIcon className="h-4 w-4" />
      </span>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-savannah-mist px-4 py-4 shadow-tonal">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-2 w-2 animate-bounce rounded-full bg-on-surface-variant/60"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 2l1.9 5.3L19 9.2l-5.1 1.9L12 16l-1.9-4.9L5 9.2l5.1-1.9L12 2z" />
      <path d="M19 14l.9 2.4 2.4.9-2.4.9L19 21l-.9-2.8-2.4-.9 2.4-.9L19 14z" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M4 12l16-8-6 16-2.5-6.5L4 12z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
