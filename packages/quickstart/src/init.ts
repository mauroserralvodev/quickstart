import pc from "picocolors";
import { join } from "node:path";
import { detectAppRouterRoot, detectNextProject } from "./detect.js";
import { exists, readText, writeForce, writeIfMissing } from "./fs.js";

type InitOptions = { force: boolean };

function template(name: string): string {
  // Embebemos templates como strings simples.
  // (Alternativa: import fs + path + readFileSync de /templates en runtime)
  if (name === "lib/brinpage.ts") return BRINPAGE_TS;
  if (name === "api/chat/route.ts") return API_CHAT_ROUTE_TS;
  if (name === "demo/page.tsx") return DEMO_PAGE_TSX;
  if (name === ".env.local") return ENV_LOCAL;
  throw new Error(`Unknown template: ${name}`);
}

export async function init(opts: InitOptions) {
  const cwd = process.cwd();
  detectNextProject(cwd);

  const appRoot = detectAppRouterRoot(cwd); // "app" | "src/app"
  const appDir = join(cwd, ...appRoot.split("/"));

  // 1) lib/brinpage.ts
  const libFile = join(cwd, "lib", "brinpage.ts");
  const libRes = opts.force ? writeForce(libFile, template("lib/brinpage.ts")) : writeIfMissing(libFile, template("lib/brinpage.ts"));

  // 2) api/chat/route.ts (server)
  const apiFile = join(appDir, "api", "chat", "route.ts");
  const apiRes = opts.force ? writeForce(apiFile, template("api/chat/route.ts")) : writeIfMissing(apiFile, template("api/chat/route.ts"));

  // 3) demo UI page: /brinpage
  const demoFile = join(appDir, "brinpage", "page.tsx");
  const demoRes = opts.force ? writeForce(demoFile, template("demo/page.tsx")) : writeIfMissing(demoFile, template("demo/page.tsx"));

  // 4) .env.local
  const envFile = join(cwd, ".env.local");
  const envRes = upsertEnv(envFile);

  // Output
  console.log(pc.bold("\nBrinpage Quickstart initialized.\n"));

  logWrite("lib/brinpage.ts", libRes);
  logWrite(`${appRoot}/api/chat/route.ts`, apiRes);
  logWrite(`${appRoot}/brinpage/page.tsx`, demoRes);
  logWrite(".env.local", envRes);

  console.log("\nNext steps:");
  console.log(`1) Set ${pc.cyan("BRINPAGE_LICENSE_KEY")} in ${pc.cyan(".env.local")}`);
  console.log(`2) Run ${pc.cyan("npm run dev")}`);
  console.log(`3) Open ${pc.cyan("http://localhost:3000/brinpage")}\n`);
}

function logWrite(file: string, r: { written: boolean; reason: string }) {
  const status = r.written ? pc.green("WRITE") : pc.yellow("SKIP");
  console.log(`${status} ${pc.dim(file)} ${pc.dim(`(${r.reason})`)}`);
}

function upsertEnv(envFile: string) {
  const requiredLines = [
    `BRINPAGE_LICENSE_KEY="bp_xxxx"`,
    `BRINPAGE_API_BASE="https://platform.brinpage.com"`,
    `BRINPAGE_ASK_TIMEOUT_MS=30000`
  ];

  if (!exists(envFile)) {
    writeForce(envFile, template(".env.local"));
    return { written: true, reason: "created" };
  }

  const cur = readText(envFile);
  let next = cur;
  let changed = false;

  for (const line of requiredLines) {
    const key = line.split("=")[0]?.trim();
    const has = new RegExp(`^\\s*${escapeReg(key)}\\s*=`, "m").test(next);
    if (!has) {
      next = next.replace(/\s*$/, "") + "\n" + line + "\n";
      changed = true;
    }
  }

  if (!changed) return { written: false, reason: "exists" };
  writeForce(envFile, next);
  return { written: true, reason: "updated" };
}

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** TEMPLATES (inline) **/

const ENV_LOCAL = `# Required (server-side only)
BRINPAGE_LICENSE_KEY="bp_xxxx"

# Optional
BRINPAGE_API_BASE="https://platform.brinpage.com"
BRINPAGE_ASK_TIMEOUT_MS=30000
`;

const BRINPAGE_TS = `// lib/brinpage.ts

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const API_BASE = process.env.BRINPAGE_API_BASE || "https://platform.brinpage.com";
const LICENSE = process.env.BRINPAGE_LICENSE_KEY || "";

export type AskOptions = {
  question?: string;
  messages?: ChatMessage[];
  provider?: string;
  model?: string;
  context?: Record<string, unknown>;
  extraPrompts?: string[];
  tags?: string[];
  debugEcho?: boolean;
};

export type AskResult = {
  text: string;
  raw: unknown;
};

function toQuestion(messages?: ChatMessage[]) {
  if (!messages?.length) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "user" && m.content?.trim()) return m.content.trim();
  }
  return messages.map((m) => \`\${m.role}: \${m.content}\`).join("\\n").trim();
}

function safeJsonParse(rawText: string): unknown {
  if (!rawText) return null;
  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    return null;
  }
}

function pickText(data: unknown): string {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const candidates = [obj.text, obj.answer, obj.message, obj.output];
    for (const c of candidates) {
      if (typeof c === "string" && c.trim()) return c;
      if (typeof c === "number" || typeof c === "boolean") return String(c);
    }
  }
  return "";
}

function pickErrorMessage(data: unknown, rawText: string, status: number): string {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const err = obj.error;
    const msg = obj.message;
    if (typeof err === "string" && err.trim()) return err.trim();
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  }
  if (rawText?.trim()) return rawText.slice(0, 400);
  return \`ask failed (\${status})\`;
}

export async function ask(opts: AskOptions): Promise<AskResult> {
  if (!LICENSE) throw new Error("Missing BRINPAGE_LICENSE_KEY");

  const q = (opts.question ?? toQuestion(opts.messages)).trim();
  if (!q) throw new Error("Missing 'question' input");

  const url = \`\${API_BASE}/api/sdk/ask\`;

  const timeoutMs = Number(process.env.BRINPAGE_ASK_TIMEOUT_MS ?? 30000);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: \`Bearer \${LICENSE}\`,
      },
      body: JSON.stringify({
        question: q,
        history: Array.isArray(opts.messages) ? opts.messages : [],
        provider: opts.provider,
        model: opts.model,
        stream: false,
        context: opts.context ?? {},
        extraPrompts: opts.extraPrompts,
        tags: opts.tags,
        debugEcho: opts.debugEcho,
      }),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (e: unknown) {
    const msg =
      e instanceof Error
        ? e.name === "AbortError"
          ? \`ask timeout after \${timeoutMs}ms\`
          : e.message
        : "ask failed (network error)";
    throw new Error(msg);
  } finally {
    clearTimeout(t);
  }

  const rawText = await res.text();
  const data = safeJsonParse(rawText);

  if (!res.ok) {
    throw new Error(pickErrorMessage(data, rawText, res.status));
  }

  return {
    text: pickText(data),
    raw: data ?? rawText,
  };
}
`;

const API_CHAT_ROUTE_TS = `// app/api/chat/route.ts (or src/app/api/chat/route.ts)
import { NextResponse } from "next/server";
import { ask, type ChatMessage } from "@/lib/brinpage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ChatBody = {
  question?: string;
  messages?: ChatMessage[];
  provider?: string;
  model?: string;
  context?: Record<string, unknown>;
  tags?: string[];
  extraPrompts?: string[];
  debugEcho?: boolean;
};

export async function POST(req: Request) {
  let body: ChatBody | null = null;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    body = null;
  }

  if (!body) {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const out = await ask({
      question: body.question,
      messages: body.messages,
      provider: body.provider,
      model: body.model,
      context: body.context,
      tags: body.tags,
      extraPrompts: body.extraPrompts,
      debugEcho: body.debugEcho,
    });

    return NextResponse.json({ ok: true, text: out.text, raw: out.raw }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
`;

const DEMO_PAGE_TSX = `// app/brinpage/page.tsx (or src/app/brinpage/page.tsx)
"use client";

import { useEffect, useRef, useState } from "react";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300"],
});

type Msg = {
  role: "user" | "assistant";
  content: string;
};

export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function send() {
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput("");

    const userMsg: Msg = { role: "user", content: question };
    const nextMessages: Msg[] = [...messages, userMsg];

    setMessages(nextMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, messages: nextMessages }),
      });

      const json = (await res.json()) as any;
      if (!json?.ok) throw new Error(json?.error || "Request failed");

      const assistantMsg: Msg = {
        role: "assistant",
        content: json.text || "(no response)",
      };

      setMessages((m) => [...m, assistantMsg]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: \`Error: \${e.message}\` }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <main className={\`h-screen bg-neutral-50 \${inter.className}\`}>
      <div className="mx-auto flex h-full max-w-4xl flex-col border-x border-black/10 bg-neutral-50">
        <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-8">
          {messages.map((m, i) => (
            <div
              key={i}
              className={["flex w-full", m.role === "user" ? "justify-end" : "justify-start"].join(" ")}
            >
              <div
                className={[
                  "max-w-[70%] w-fit rounded-4xl border border-black/8 px-4 py-2 text-sm leading-relaxed",
                  "bg-white text-neutral-900",
                ].join(" ")}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex w-full justify-start">
              <div className="max-w-[70%] w-fit rounded-4xl border border-black/10 bg-neutral-50 px-4 py-2 text-sm text-neutral-500">
                …
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-8 border-t border-dashed border-black/10 bg-linear-to-t from-white to-transparent">
          <div className="relative mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-4xl border border-black/10 bg-white hover:shadow-lg transition p-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Write a message..."
                className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none text-black"
              />

              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className={[
                  "grid px-4 py-2 place-items-center text-sm  rounded-full transition",
                  input.trim() && !loading
                    ? "bg-[#ff7a00] text-white hover:opacity-80 cursor-pointer"
                    : "bg-neutral-50 text-neutral-400 cursor-not-allowed border border-black/5",
                ].join(" ")}
                aria-label="Send"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
`;
