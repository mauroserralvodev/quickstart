# @brinpage/quickstart

Scaffold a minimal **Brinpage Quick Start** into a Next.js App Router project in seconds.

This package generates the required server route, HTTP client, demo UI, and environment variables to start using **Brinpage Platform** without installing the full SDK or running a local panel.

---

## What is this?

`@brinpage/quickstart` is a small CLI that helps you bootstrap a **direct integration with Brinpage Platform** in a Next.js App Router project.

It creates:
- A server-side Brinpage HTTP client
- A secure API route (license key stays server-side)
- A minimal chat demo page
- Required environment variables

All with a single command.

---

## Requirements

- Node.js **18+** (20+ recommended)
- Next.js **App Router**
  - `app/` or `src/app/`
- A valid **Brinpage Platform license key**

---

## Installation

```bash
npm install @brinpage/quickstart
```

## Usage

Run the initializer from the root of your Next.js project:

```bash
npx brinpage-quickstart init
```

This will scaffold the following files (if they don’t already exist):

```bash
lib/brinpage.ts
app/api/chat/route.ts        (or src/app/api/chat/route.ts)
app/brinpage/page.tsx        (or src/app/brinpage/page.tsx)
.env.local                  (only missing keys are added)
```

Existing files are never overwritten unless you use --force.

## Environment Variables

After running the init command, open .env.local and set your license key:

```bash
BRINPAGE_LICENSE_KEY="bp_xxxx"
```

Optional settings:

```bash
BRINPAGE_API_BASE="https://platform.brinpage.com"
BRINPAGE_ASK_TIMEOUT_MS=30000
```

## ⚠️ Important:
Never expose BRINPAGE_LICENSE_KEY to the browser.
It must only be used in server routes or server actions.

## Run the Demo

Start your dev server:

```bash
npm run dev
```

Open:

```bash
http://localhost:3000/brinpage
```

You should see a minimal chat UI connected to Brinpage Platform.

## Flags

```bash
npx brinpage-quickstart init --force
```

--force
Overwrites existing generated files (useful for demos or resets).

## What this package does NOT do

- It does not install the Brinpage SDK

- It does not create a local panel or dashboard

- It does not manage agents, tools, or contexts

This is intentionally a minimal, copy-free quick start.

## When should I use this?

Use @brinpage/quickstart if you want to:

- Quickly test Brinpage Platform

- Build your own UI on top of Brinpage

- Keep full control over your API routes

- Avoid installing extra SDK layers

## License

MIT

## Links

Brinpage Platform: https://platform.brinpage.com

npm package: https://www.npmjs.com/package/@brinpage/quickstart