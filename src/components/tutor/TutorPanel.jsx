// src/components/tutor/TutorPanel.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import katex from "katex";
import {
  PROVIDERS,
  getProvider,
  STORAGE_KEY,
  DEFAULT_SETTINGS,
} from "./tutorProviders.js";
import { useTour } from "../../context/TourContext.jsx";

// ─── WebLLM ──────────────────────────────────────────────────────────────────
// The app-wide engine (hooks/webLLMSingleton.js): one model in memory at a time, and choosing a
// different model unloads the old one and deletes its cached files.
let _readyModel = null;   // the model this panel last saw finish loading (for its status only)

async function loadWebLLMEngine(modelId, onProgress = () => {}) {
  const { getSharedEngine } = await import("../../hooks/webLLMSingleton.js");
  const engine = await getSharedEngine((_, fraction) => onProgress(Math.round(fraction * 100)), modelId);
  _readyModel = modelId;
  return engine;
}

function hasWebGPU() {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

// ─── SSE / API callers ───────────────────────────────────────────────────────
async function* parseSSE(response) {
  const reader = response.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const d = line.slice(6).trim();
        if (d === "[DONE]") return;
        try {
          yield JSON.parse(d);
        } catch {
          /* skip */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function buildApiError(res, label) {
  let msg = `${label} error (${res.status})`;
  try {
    const b = await res.json();
    msg = b.error?.message ?? b.message ?? msg;
  } catch {
    /* */
  }
  if (res.status === 401 || res.status === 403)
    msg = `Invalid API key for ${label}. Open settings to fix it.`;
  else if (res.status === 429)
    msg = `Rate limit reached on ${label}. Wait a moment and try again.`;
  return new Error(msg);
}

async function* callOpenAICompat(endpoint, key, model, sysPrompt, msgs) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      max_tokens: 1024,
      temperature: 0.7,
      messages: [{ role: "system", content: sysPrompt }, ...msgs],
    }),
  });
  if (!res.ok) throw await buildApiError(res, "API");
  for await (const chunk of parseSSE(res)) {
    const t = chunk.choices?.[0]?.delta?.content;
    if (t) yield t;
  }
}

async function* callAnthropic(key, model, sysPrompt, msgs) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      stream: true,
      max_tokens: 1024,
      system: sysPrompt,
      messages: msgs.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) throw await buildApiError(res, "Anthropic");
  for await (const chunk of parseSSE(res)) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta?.type === "text_delta"
    )
      yield chunk.delta.text;
  }
}

async function* callHuggingFace(key, model, sysPrompt, msgs) {
  const { HfInference } = await import("@huggingface/inference");
  const hf = new HfInference(key);
  const allMsgs = sysPrompt
    ? [{ role: "system", content: sysPrompt }, ...msgs]
    : msgs;
  const stream = hf.chatCompletionStream({
    model,
    messages: allMsgs,
    max_tokens: 1024,
    temperature: 0.7,
  });
  for await (const chunk of stream) {
    const t = chunk.choices?.[0]?.delta?.content;
    if (t) yield t;
  }
}

async function* callGoogle(key, model, sysPrompt, msgs) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: msgs.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      systemInstruction: { parts: [{ text: sysPrompt }] },
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
    }),
  });
  if (!res.ok) throw await buildApiError(res, "Gemini");
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (text) yield text;
}

export async function* callProvider(settings, msgs, sysPrompt = "") {
  const p = getProvider(settings.provider);
  const allMsgs = sysPrompt
    ? [{ role: "system", content: sysPrompt }, ...msgs]
    : msgs;
  if (settings.provider === "webllm") {
    // Returns at once if the model is loaded; reloads it if another feature swapped models meanwhile.
    const engine = await loadWebLLMEngine(settings.model);
    const stream = await engine.chat.completions.create({
      messages: allMsgs,
      stream: true,
      temperature: 0.7,
      max_tokens: 512,
    });
    for await (const chunk of stream) {
      const t = chunk.choices?.[0]?.delta?.content;
      if (t) yield t;
    }
    return;
  }
  const key = settings.keys?.[settings.provider];
  if (!key)
    throw new Error("No API key configured. Open settings (⚙) to add one.");
  if (p.protocol === "openai")
    yield* callOpenAICompat(p.endpoint, key, settings.model, sysPrompt, msgs);
  else if (p.protocol === "anthropic")
    yield* callAnthropic(key, settings.model, sysPrompt, msgs);
  else if (p.protocol === "google")
    yield* callGoogle(key, settings.model, sysPrompt, msgs);
  else if (p.protocol === "huggingface")
    yield* callHuggingFace(key, settings.model, sysPrompt, msgs);
}

// ─── Dynamic system prompt ────────────────────────────────────────────────────
function buildSystemPrompt(lesson, context = null) {
  if (context) {
    const lines = [
      `You are a helpful OpenMAT assistant inside Open Calc.`,
      `Your job is to help users translate MATLAB ideas into OpenMAT syntax and workflow honestly.`,
      `Prefer practical debugging, short rewrites, and blunt notes about current limitations over vague encouragement.`,
      `When a feature is not supported yet, say so clearly and suggest the closest working OpenMAT alternative.`,
      `Do not invent parser limitations that are not true.`,
      `OpenMAT currently supports ^ and .^ for power, title/xlabel/ylabel with string arguments, and whitespace-normalized element-wise operators in many common cases.`,
      ``,
      `Current workspace: ${context.title ?? "OpenMAT Workspace"}`,
    ];

    if (context.summary) lines.push(`Summary: ${context.summary}`);
    if (context.lastRunStatus)
      lines.push(`Last run status: ${context.lastRunStatus}`);
    if (context.lastRunSource)
      lines.push(`Last run source: ${context.lastRunSource}`);
    if (context.lastRunFigureKind)
      lines.push(`Last figure kind: ${context.lastRunFigureKind}`);
    if (context.lastRunPreview)
      lines.push(`Last run preview: ${context.lastRunPreview}`);

    if (context.docsExcerpt) {
      lines.push(``);
      lines.push(`Relevant OpenMAT docs excerpt:`);
      lines.push(context.docsExcerpt);
    }

    if (context.activeCode) {
      lines.push(``);
      lines.push(`Active script on screen:`);
      lines.push("```matlab");
      lines.push(context.activeCode);
      lines.push("```");
    }

    if (context.output) {
      lines.push(``);
      lines.push(`Current console/output text:`);
      lines.push("```text");
      lines.push(context.output);
      lines.push("```");
    }

    lines.push(``);
    lines.push(`When helping with syntax:`);
    lines.push(
      `- point out whether the issue is parser syntax, unsupported MATLAB behavior, or plotting workflow`,
    );
    lines.push(`- if possible, give a corrected OpenMAT script block`);
    lines.push(`- keep answers concise but useful`);
    lines.push(
      `- use $...$ for inline math and $$...$$ for display math when helpful`,
    );

    return lines.join("\n");
  }

  if (!lesson)
    return "You are a helpful tutor. Answer questions directly and concisely.";

  const lines = [
    `You are a helpful tutor for an interactive STEM learning platform.`,
    `The student is currently on the "${lesson.title}" lesson.`,
  ];

  // Hook — the motivating question
  if (lesson.hook?.question) {
    lines.push(
      `The lesson opens with: "${lesson.hook.question.replace(/[*_`]/g, "").slice(0, 200)}"`,
    );
  }

  // Key concepts from intuition prose
  const prose = lesson.intuition?.prose ?? [];
  if (prose.length > 0) {
    lines.push(`Key concepts covered:`);
    prose.slice(0, 4).forEach((p) => {
      const clean = p
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/[`]/g, "")
        .trim();
      if (clean.length > 20) lines.push(`- ${clean.slice(0, 200)}`);
    });
  }

  // First worked example problem statement
  const ex = lesson.workedExamples?.[0];
  if (ex?.problem) {
    lines.push(
      `Example problem on this page: "${ex.problem.replace(/[*_`]/g, "").slice(0, 200)}"`,
    );
  }

  lines.push(``);
  lines.push(
    `The student can ask you anything about this page or related concepts. If they ask "what's on this page" or "what is this lesson about", give a friendly 2–3 sentence summary. Keep all other answers concise. Use $...$ for inline math and $$...$$ for display math.`,
  );

  return lines.join("\n");
}

function splitMessageBlocks(content) {
  const blocks = [];
  const regex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: "text",
        content: content.slice(lastIndex, match.index),
      });
    }
    blocks.push({
      type: "codeblock",
      language: match[1] || "",
      content: match[2].replace(/\s+$/, ""),
    });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    blocks.push({ type: "text", content: content.slice(lastIndex) });
  }
  return blocks.filter((block) => block.content?.trim?.());
}

// ─── Markdown + LaTeX message renderer ───────────────────────────────────────
function renderKatex(expr, display) {
  try {
    return katex.renderToString(expr.trim(), {
      displayMode: display,
      throwOnError: false,
      trust: false,
      strict: false,
    });
  } catch {
    return `<span style="color:#ef4444">[math error]</span>`;
  }
}

// Parse AI message text into segments: plain text, inline math, display math, bold, inline code
// Handles both $...$ / $$...$$ and \(...\) / \[...\] delimiter styles
function parseMessage(text) {
  const segments = [];
  let i = 0;

  while (i < text.length) {
    // Display math \[...\]
    if (text[i] === "\\" && text[i + 1] === "[") {
      const end = text.indexOf("\\]", i + 2);
      if (end !== -1) {
        segments.push({
          type: "display-math",
          content: text.slice(i + 2, end),
        });
        i = end + 2;
        continue;
      }
    }
    // Inline math \(...\)
    if (text[i] === "\\" && text[i + 1] === "(") {
      const end = text.indexOf("\\)", i + 2);
      if (end !== -1) {
        segments.push({ type: "inline-math", content: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    // Display math $$...$$
    if (text[i] === "$" && text[i + 1] === "$") {
      const end = text.indexOf("$$", i + 2);
      if (end !== -1) {
        segments.push({
          type: "display-math",
          content: text.slice(i + 2, end),
        });
        i = end + 2;
        continue;
      }
    }
    // Inline math $...$ (must not span a newline)
    if (text[i] === "$" && text[i + 1] !== "$") {
      const rest = text.slice(i + 1);
      const nl = rest.indexOf("\n");
      const closing = rest.indexOf("$");
      if (closing > 0 && (nl === -1 || closing < nl)) {
        segments.push({ type: "inline-math", content: rest.slice(0, closing) });
        i = i + 1 + closing + 1;
        continue;
      }
    }
    // Inline code `...`
    if (text[i] === "`") {
      const end = text.indexOf("`", i + 1);
      if (end !== -1) {
        segments.push({ type: "code", content: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    // Bold **...**
    if (text[i] === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2);
      if (end !== -1) {
        segments.push({ type: "bold", content: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    // Accumulate plain text
    const last = segments[segments.length - 1];
    if (last?.type === "text") {
      last.content += text[i];
    } else {
      segments.push({ type: "text", content: text[i] });
    }
    i++;
  }
  return segments;
}

// Split into lines/paragraphs and render segments within each
function TutorMessage({ content, isUser, onApplyCode }) {
  const rendered = useMemo(() => {
    if (isUser) return null;
    const blocks = splitMessageBlocks(content);
    return blocks.map((block, blockIndex) => {
      if (block.type === "codeblock") {
        const language = (block.language || "").toLowerCase();
        const isScriptLike = ["matlab", "openmat", "m", "text", ""].includes(
          language,
        );
        return (
          <div
            key={blockIndex}
            className={`${blockIndex > 0 ? "mt-3" : ""} rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 overflow-hidden`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-700">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {language || "code"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(block.content)}
                  className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                >
                  Copy
                </button>
                {onApplyCode && isScriptLike && (
                  <button
                    type="button"
                    onClick={() => onApplyCode(block.content)}
                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                  >
                    Apply
                  </button>
                )}
              </div>
            </div>
            <pre className="overflow-x-auto px-3 py-3 text-[12px] leading-6 text-slate-800 dark:text-slate-200">
              <code>{block.content}</code>
            </pre>
          </div>
        );
      }

      const paragraphs = block.content.split(/\n{2,}/);
      return paragraphs.map((para, pi) => {
        const isNumbered = /^\d+\.\s/.test(para.trim());
        const isBullet = /^[-*]\s/.test(para.trim());
        const lines = para.split("\n");
        return (
          <p
            key={`${blockIndex}-${pi}`}
            className={`${blockIndex > 0 || pi > 0 ? "mt-2" : ""} ${isNumbered || isBullet ? "pl-3" : ""}`}
          >
            {lines.map((line, li) => {
              const segs = parseMessage(line);
              return (
                <span key={li}>
                  {li > 0 && <br />}
                  {segs.map((seg, si) => {
                    if (seg.type === "display-math") {
                      return (
                        <span
                          key={si}
                          className="block my-2 overflow-x-auto text-center"
                          dangerouslySetInnerHTML={{
                            __html: renderKatex(seg.content, true),
                          }}
                        />
                      );
                    }
                    if (seg.type === "inline-math") {
                      return (
                        <span
                          key={si}
                          dangerouslySetInnerHTML={{
                            __html: renderKatex(seg.content, false),
                          }}
                        />
                      );
                    }
                    if (seg.type === "code") {
                      return (
                        <code
                          key={si}
                          className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[12px] font-mono text-slate-700 dark:text-slate-300 mx-0.5"
                        >
                          {seg.content}
                        </code>
                      );
                    }
                    if (seg.type === "bold") {
                      return (
                        <strong key={si} className="font-semibold">
                          {seg.content}
                        </strong>
                      );
                    }
                    return <span key={si}>{seg.content}</span>;
                  })}
                </span>
              );
            })}
          </p>
        );
      });
    });
  }, [content, isUser, onApplyCode]);

  if (isUser) {
    return <span>{content}</span>;
  }
  return <div>{rendered}</div>;
}

// ─── Settings persistence ─────────────────────────────────────────────────────
export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
      : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
function persistSettings(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* */
  }
}

// ─── Drag & Resize hook ───────────────────────────────────────────────────────
const DEFAULT_SIZE = { w: 380, h: 560 };
const MIN_SIZE = { w: 280, h: 360 };

function useDragResize() {
  const [pos, setPos] = useState(() => ({
    x: Math.max(16, window.innerWidth - DEFAULT_SIZE.w - 24),
    y: 16,
  }));
  const [size, setSize] = useState(DEFAULT_SIZE);

  // Keep mutable refs so event handlers never close over stale state
  const posRef = useRef(pos);
  const sizeRef = useRef(size);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);
  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  const onDragStart = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startPosX = posRef.current.x;
    const startPosY = posRef.current.y;

    const onMove = (me) => {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      setPos({
        x: Math.max(
          0,
          Math.min(window.innerWidth - MIN_SIZE.w, startPosX + dx),
        ),
        y: Math.max(0, startPosY - dy),
      });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const onResizeStart = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = sizeRef.current.w;
    const startH = sizeRef.current.h;

    const onMove = (me) => {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      setSize({
        w: Math.max(MIN_SIZE.w, startW + dx),
        h: Math.max(MIN_SIZE.h, startH - dy), // top-right handle: drag up = taller
      });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  return { pos, size, onDragStart, onResizeStart };
}

// ─── SettingsView ─────────────────────────────────────────────────────────────

function SettingsView({
  settings,
  onChange,
  voices = [],
  voiceURI,
  onVoiceChange,
  onPreviewVoice,
}) {
  const [showKey, setShowKey] = useState(false);
  const provider = getProvider(settings.provider);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1 mb-3">
        AI Provider
      </p>

      {PROVIDERS.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange({ provider: p.id, model: p.models[0].id })}
          className={`w-full text-left p-3 rounded-xl border transition-colors ${
            settings.provider === p.id
              ? "border-brand-400 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-600"
              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex-1">
              {p.label}
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                p.badge === "Free"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                  : p.badge === "Free tier"
                    ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {p.badge}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {p.description}
          </p>
        </button>
      ))}

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1 mb-2">
          Model
        </p>
        <select
          value={settings.model}
          onChange={(e) => onChange({ model: e.target.value })}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          {provider.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
              {m.note ? ` — ${m.note}` : ""}
            </option>
          ))}
        </select>
      </div>

      {provider.requiresKey && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              API Key
            </p>
            {provider.keyHref && (
              <a
                href={provider.keyHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
              >
                Get a key ↗
              </a>
            )}
          </div>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={settings.keys?.[settings.provider] ?? ""}
              onChange={(e) =>
                onChange({
                  keys: {
                    ...settings.keys,
                    [settings.provider]: e.target.value,
                  },
                })
              }
              placeholder={provider.keyPlaceholder}
              autoComplete="off"
              className="w-full px-3 py-2 pr-14 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {showKey ? "hide" : "show"}
            </button>
          </div>
          <div className="mt-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              🔒 Your key is stored only in{" "}
              <strong>this browser's localStorage</strong>. It is never sent to
              any server except the AI provider you choose.
            </p>
          </div>
        </div>
      )}

      {settings.provider === "webllm" && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
            <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
              🔒 <strong>Fully private.</strong> Runs entirely on your device.
              Requires WebGPU (Chrome/Edge desktop).
            </p>
          </div>
        </div>
      )}

      {/* ── Voice / TTS ── */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1 mb-2">
          Read-Aloud Voice
        </p>
        {voices.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 px-1">
            No voices found — check your browser / OS voice settings.
          </p>
        ) : (
          <div className="space-y-1">
            {voices.map((v) => {
              const quality = (() => {
                const n = v.name.toLowerCase();
                if (n.includes("natural"))
                  return {
                    label: "Neural",
                    cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
                  };
                if (n.includes("enhanced"))
                  return {
                    label: "Enhanced",
                    cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
                  };
                if (n.includes("premium"))
                  return {
                    label: "Premium",
                    cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
                  };
                if (n.includes("siri"))
                  return {
                    label: "Siri",
                    cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
                  };
                if (n.includes("google"))
                  return {
                    label: "Google",
                    cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400",
                  };
                return null;
              })();
              const active = voiceURI === v.voiceURI;
              return (
                <div
                  key={v.voiceURI}
                  onClick={() => onVoiceChange(v.voiceURI)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border cursor-pointer transition-colors ${
                    active
                      ? "border-brand-400 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-600"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <Volume2
                    className={`w-3.5 h-3.5 shrink-0 ${active ? "text-brand-500" : "text-slate-400"}`}
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 truncate">
                    {v.name}
                  </span>
                  {quality && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${quality.cls}`}
                    >
                      {quality.label}
                    </span>
                  )}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onPreviewVoice(v.voiceURI);
                    }}
                    className="text-[10px] text-slate-400 hover:text-brand-500 dark:hover:text-brand-400 shrink-0 transition-colors"
                    title="Preview this voice"
                  >
                    ▶
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import { useSpeech } from "../../utils/useSpeech.js";

// Icons
import {
  Settings,
  X,
  Send,
  GraduationCap,
  Sparkles,
  Maximize2,
  Volume2,
  Square,
  Compass,
} from "lucide-react";

// ─── TutorPanel ───────────────────────────────────────────────────────────────
function useChatPanelOpen() {
  const [chatOpen, setChatPanelOpen] = useState(
    () => document.body.dataset.chatOpen === "1",
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setChatPanelOpen(document.body.dataset.chatOpen === "1");
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-chat-open"],
    });
    return () => observer.disconnect();
  }, []);
  return chatOpen;
}

export default function TutorPanel({
  lesson: lessonProp = null,
  context = null,
  onApplyCode = null,
}) {
  const [open, setOpen] = useState(false);
  const [lessonFromPage, setLessonFromPage] = useState(null);
  const lesson = lessonFromPage ?? lessonProp;
  const chatPanelOpen = useChatPanelOpen();
  const [view, setView] = useState("chat");
  const { startTour } = useTour();
  const [settings, setSettings] = useState(loadSettings);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle");
  const [loadProgress, setLoadProgress] = useState(0);
  const [streamContent, setStreamContent] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const {
    speak,
    stop: stopSpeech,
    isSpeaking,
    supported: ttsSupported,
    englishVoices,
    voiceURI,
    setVoiceURI,
  } = useSpeech();
  const [speakingIdx, setSpeakingIdx] = useState(null);

  // Clear speaking highlight when audio ends naturally
  useEffect(() => {
    if (!isSpeaking) setSpeakingIdx(null);
  }, [isSpeaking]);

  // Stop audio when panel is closed
  useEffect(() => {
    if (!open) stopSpeech();
  }, [open, stopSpeech]);

  const handleSpeak = useCallback(
    (content, idx) => {
      if (speakingIdx === idx && isSpeaking) {
        stopSpeech();
      } else {
        setSpeakingIdx(idx);
        speak(content);
      }
    },
    [speakingIdx, isSpeaking, stopSpeech, speak],
  );

  const accRef = useRef("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const provider = getProvider(settings.provider);
  const hasKey = !provider.requiresKey || !!settings.keys?.[settings.provider];
  const canSend = !!input.trim() && status === "ready";

  const { pos, size, onDragStart, onResizeStart } = useDragResize();

  useEffect(() => {
    persistSettings(settings);
  }, [settings]);

  // Allow taskbar to toggle this panel via custom event
  useEffect(() => {
    const handler = () => setOpen((o) => !o);
    window.addEventListener("oc-toggle-tutor", handler);
    return () => window.removeEventListener("oc-toggle-tutor", handler);
  }, []);

  // Receive lesson context broadcast from LessonPage
  useEffect(() => {
    const handler = (e) => setLessonFromPage(e.detail ?? null);
    window.addEventListener("oc-lesson-context", handler);
    return () => window.removeEventListener("oc-lesson-context", handler);
  }, []);

  // Reset chat history when navigating to a different lesson
  useEffect(() => {
    setMessages([]);
    setStreamContent("");
    setErrorMsg("");
  }, [lesson?.id, context?.id]);

  // Scroll to bottom — debounced so fast streaming doesn't thrash the layout
  const scrollTimer = useRef(null);
  useEffect(() => {
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 80);
    return () => clearTimeout(scrollTimer.current);
  }, [messages, streamContent]);

  useEffect(() => {
    if (open && view === "chat" && status !== "unsupported" && hasKey) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, view]);

  // Unified effect: handle provider/model/key changes and load the WebLLM model.
  // The model (0.9–2 GB) is loaded into memory only once the panel is opened. It used to be
  // prefetched in the background a few seconds after every page load, which kept a large model in
  // RAM (on a Mac, GPU memory is system memory) even for people who never opened the tutor.
  useEffect(() => {
    if (settings.provider !== "webllm") {
      setStatus(hasKey ? "ready" : "needs-key");
      return;
    }
    if (!hasWebGPU()) {
      setStatus("unsupported");
      return;
    }
    if (_readyModel === settings.model) {
      setStatus("ready");
      return;
    }
    if (!open) {
      setStatus("idle");
      return;
    }
    setStatus("loading-model");
    setLoadProgress(0);
    loadWebLLMEngine(settings.model, setLoadProgress)
      .then(() => setStatus("ready"))
      .catch((e) => {
        setStatus("error");
        setErrorMsg(e?.message ?? "Failed to load model");
      });
  }, [open, settings.provider, settings.model, hasKey]);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const updateSettings = useCallback((updates) => {
    const prev = settingsRef.current;
    // Switching away from an in-browser model: delete its cached files (0.9–2 GB) unless it is the
    // app's shared default, which the other AI features still need.
    if (prev.provider === "webllm" && updates.model && updates.model !== prev.model) {
      import("../../hooks/webLLMSingleton.js").then(({ forgetModel }) => forgetModel(prev.model));
      _readyModel = null;
    }
    setSettings((p) => ({ ...p, ...updates }));
  }, []);

  function adjustHeight() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || status !== "ready") return;
    const userMsg = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setStatus("thinking");
    setErrorMsg("");
    accRef.current = "";
    setStreamContent("");
    try {
      const gen = callProvider(
        settings,
        history,
        buildSystemPrompt(lesson, context),
      );
      let rafPending = false;
      for await (const token of gen) {
        accRef.current += token;
        if (!rafPending) {
          rafPending = true;
          requestAnimationFrame(() => {
            setStreamContent(accRef.current);
            rafPending = false;
          });
        }
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: accRef.current },
      ]);
      setStreamContent("");
      setStatus("ready");
    } catch (e) {
      setErrorMsg(e?.message ?? "Something went wrong. Try again.");
      setStatus("error");
      setStreamContent("");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const clampedLeft = Math.max(
    0,
    Math.min(pos.x, window.innerWidth - MIN_SIZE.w - 8),
  );
  const clampedBottom = Math.max(0, pos.y);
  const availableHeight = Math.max(
    MIN_SIZE.h,
    window.innerHeight - clampedBottom - 72,
  );
  const panelStyle = {
    position: "fixed",
    left: clampedLeft,
    bottom: clampedBottom,
    width: Math.min(size.w, window.innerWidth - clampedLeft - 8),
    height: Math.min(size.h, availableHeight),
    zIndex: 9998,
  };

  return (
    <>
      {/* Panel */}
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          style={panelStyle}
          className="flex flex-col rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.15)] dark:shadow-[0_0_100px_rgba(0,0,0,0.5)] bg-white/70 dark:bg-slate-950/60 backdrop-blur-xl border border-white/20 dark:border-white/5 overflow-hidden select-none min-h-0 ring-1 ring-black/5"
        >
          {/* Header - Scientific Handle */}
          <div
            onMouseDown={onDragStart}
            className="flex items-center gap-3 px-6 py-5 border-b border-white/10 shrink-0 cursor-grab active:cursor-grabbing bg-gradient-to-r from-transparent via-white/5 to-transparent"
          >
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.4)] flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] leading-none mb-1">
                Delta
              </span>
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest opacity-80 truncate">
                {provider.label} STEM Tutor
              </span>
            </div>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => {
                setOpen(false);
                startTour();
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 dark:text-slate-500"
              title="Show me around again"
            >
              <Compass className="w-4 h-4" />
            </button>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() =>
                setView((v) => (v === "settings" ? "chat" : "settings"))
              }
              className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                view === "settings"
                  ? "text-brand-600 dark:text-brand-400"
                  : "text-slate-400 dark:text-slate-500"
              }`}
              title={view === "settings" ? "Back to chat" : "Settings"}
            >
              {view === "settings" ? (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M19 12H5M5 12l7 7M5 12l7-7" />
                </svg>
              ) : (
                <Settings className="w-4 h-4" />
              )}
            </button>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setOpen(false)}
              className="p-2 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Content ── */}
          {view === "settings" ? (
            <SettingsView
              settings={settings}
              onChange={updateSettings}
              voices={englishVoices}
              voiceURI={voiceURI}
              onVoiceChange={setVoiceURI}
              onPreviewVoice={(uri) => {
                setVoiceURI(uri);
                speak("Hello! This is how I sound.");
              }}
            />
          ) : (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Status banners */}
              {status === "loading-model" && (
                <div className="px-3 py-2 bg-sky-50 dark:bg-sky-900/20 border-b border-sky-100 dark:border-sky-800 shrink-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span className="text-xs text-sky-700 dark:text-sky-300">
                      Downloading model… {loadProgress}%
                    </span>
                  </div>
                  <div className="h-1 bg-sky-100 dark:bg-sky-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 transition-all duration-300"
                      style={{ width: `${loadProgress}%` }}
                    />
                  </div>
                </div>
              )}
              {status === "unsupported" && (
                <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 shrink-0">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    WebGPU not available.{" "}
                    <button
                      onClick={() => setView("settings")}
                      className="underline font-medium"
                    >
                      Add an API key
                    </button>{" "}
                    for a cloud model.
                  </p>
                </div>
              )}
              {status === "needs-key" && (
                <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 shrink-0">
                  <button
                    onClick={() => setView("settings")}
                    className="text-xs text-amber-700 dark:text-amber-300 hover:underline"
                  >
                    Add an API key in settings to start chatting →
                  </button>
                </div>
              )}
              {status === "error" && errorMsg && (
                <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800 shrink-0 flex items-start gap-2">
                  <p className="text-xs text-red-700 dark:text-red-300 flex-1">
                    {errorMsg}
                  </p>
                  <button
                    onClick={() => {
                      setStatus(hasKey ? "ready" : "needs-key");
                      setErrorMsg("");
                    }}
                    className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-300 shrink-0"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
                {messages.length === 0 && !streamContent && (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-6">
                    <span className="text-3xl select-none">📐</span>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Ask anything about{" "}
                      <span className="text-brand-600 dark:text-brand-400">
                        {context?.title ?? lesson?.title ?? "this lesson"}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[220px]">
                      "Walk me through step by step" · "Give me a harder
                      example" · "Why does this work?"
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <a
                        href="https://discord.gg/epd2kYBDVt"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-sky-400 hover:text-sky-300 transition-colors"
                      >
                        🎮 Community Discord
                      </a>
                      <span className="text-slate-600 text-[10px]">·</span>
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] px-3 py-2 text-sm leading-relaxed break-words ${
                        msg.role === "user"
                          ? "bg-brand-600 text-white rounded-2xl rounded-br-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl rounded-bl-sm"
                      }`}
                    >
                      <TutorMessage
                        content={msg.content}
                        isUser={msg.role === "user"}
                        onApplyCode={msg.role === "user" ? null : onApplyCode}
                      />
                      {msg.role === "assistant" && (
                        <div className="flex justify-end mt-1.5 -mb-0.5">
                          <button
                            onClick={() => handleSpeak(msg.content, i)}
                            disabled={!ttsSupported}
                            title={
                              speakingIdx === i && isSpeaking
                                ? "Stop reading"
                                : "Read aloud"
                            }
                            className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-lg transition-colors disabled:opacity-30 ${
                              speakingIdx === i && isSpeaking
                                ? "text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/40"
                                : "text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                          >
                            {speakingIdx === i && isSpeaking ? (
                              <>
                                <Square className="w-2.5 h-2.5 fill-current" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-2.5 h-2.5" />
                                <span>Listen</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Streaming */}
                {streamContent && (
                  <div className="flex justify-start">
                    <div className="max-w-[88%] px-3 py-2 rounded-2xl rounded-bl-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm leading-relaxed break-words">
                      <TutorMessage
                        content={streamContent}
                        isUser={false}
                        onApplyCode={onApplyCode}
                      />
                      <span className="inline-block w-0.5 h-3.5 ml-0.5 bg-slate-400 dark:bg-slate-500 animate-pulse rounded-full align-middle" />
                    </div>
                  </div>
                )}

                {/* Thinking dots */}
                {status === "thinking" && !streamContent && (
                  <div className="flex justify-start">
                    <div className="px-3 py-3 rounded-2xl rounded-bl-sm bg-slate-100 dark:bg-slate-800">
                      <span className="flex gap-1 items-center">
                        {[0, 150, 300].map((delay) => (
                          <span
                            key={delay}
                            className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-3 py-2.5 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      adjustHeight();
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={
                      status === "thinking" ||
                      status === "unsupported" ||
                      !hasKey
                    }
                    placeholder={
                      status === "loading-model"
                        ? `Model loading ${loadProgress}% — type your question now`
                        : status === "unsupported" || !hasKey
                          ? "Add an API key in settings ↑"
                          : status === "error"
                            ? "Fix the error above, then try again"
                            : "Ask a question… (Enter to send)"
                    }
                    className="flex-1 resize-none overflow-hidden px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent max-h-[120px] leading-relaxed"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!canSend}
                    className="px-3 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 self-end"
                  >
                    {status === "thinking" ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {/* Model switcher */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 dark:text-slate-600 shrink-0">
                    Model:
                  </span>
                  <select
                    value={`${settings.provider}:${settings.model}`}
                    onChange={(e) => {
                      const [pid, ...rest] = e.target.value.split(":");
                      updateSettings({ provider: pid, model: rest.join(":") });
                    }}
                    className="flex-1 min-w-0 text-[10px] px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-400 cursor-pointer"
                  >
                    {PROVIDERS.map((p) => (
                      <optgroup key={p.id} label={`${p.label} (${p.badge})`}>
                        {p.models.map((m) => (
                          <option key={m.id} value={`${p.id}:${m.id}`}>
                            {m.label}
                            {m.note ? ` — ${m.note}` : ""}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1 text-center">
                  AI can make mistakes — verify important answers.
                </p>
                <div className="flex items-center justify-center gap-3 mt-1">
                  <a
                    href="https://discord.gg/epd2kYBDVt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    🎮 Discord community
                  </a>
                  <span className="text-slate-700 text-[10px]">·</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Resize handle (top-right: drag right=wider, drag up=taller) ── */}
          <div
            onMouseDown={onResizeStart}
            className="absolute top-0 right-0 w-5 h-5 cursor-ne-resize flex items-start justify-end p-1"
            title="Resize"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="currentColor"
              className="text-slate-300 dark:text-slate-600"
            >
              <path d="M0 0h10v2H2v8H0z" />
            </svg>
          </div>
        </motion.div>
      )}

      {/* Toggle button — Luminous Advisor Orb */}
    </>
  );
}
