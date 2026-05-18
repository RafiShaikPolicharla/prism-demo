# Modular UI Deployment and Agentflow Integration Notes

## Purpose

This document explains a reusable approach for deploying a Lovable-generated app, Vite React app, or similar frontend, and integrating Agentflow APIs into it.

Prism / Advisor Co-pilot is used only as the current sample implementation. The same deployment and integration pattern can be reused for another business use case where the UI, agent, API response shape, and dashboard sections may be different.

It intentionally avoids a full code-change history. It focuses on the deployment model, API/auth handling, environment variables, and where the UI is customized after an API is available.

## 1. Deployment Approach

The current sample app is deployed using Vercel. The same approach can be used for most static React/Vite applications.

Current setup:

- Source code is pushed to GitHub.
- Vercel is connected to the GitHub repository.
- The production branch is `main`.
- When code is pushed to `main`, Vercel automatically builds and deploys the latest version.
- The app is a Vite React application, so Vercel auto-detects the framework and uses the standard Vite build.

Typical Vercel deployment flow:

1. Push the codebase to GitHub.
2. In Vercel, import/connect the GitHub repository.
3. Select the production branch, usually `main`.
4. Confirm build settings:
   - Framework: Vite
   - Build command: `npm run build`
   - Output directory: `dist`
5. Add required environment variables in Vercel Project Settings.
6. Push changes to `main`; Vercel creates a new production deployment automatically.

For this demo, deployment was also tested manually using the Vercel CLI:

```bash
vercel
```

After the GitHub repository was connected, future production deployments should happen automatically from `main`.

## 2. Recommended Modular Architecture

For any future app, keep the integration split into four layers:

```txt
UI Components
  -> Frontend service / adapter
  -> Protected backend proxy
  -> Agentflow API
```

Each layer has a separate responsibility:

- UI components render cards, tables, charts, loaders, and detail views.
- Frontend services call internal app routes and map API data into the UI shape.
- Backend proxy stores auth securely and calls Agentflow.
- Agentflow owns agent execution, orchestration, data access, and response generation.

This modular split makes it easier to reuse the pattern for another use case without rewriting the entire frontend.

## 3. Why the Agent API Is Called Through a Protected Backend Proxy

The frontend should not call Agentflow directly with the API key.

Reason:

- React/Vite frontend code runs in the browser.
- Anything exposed through browser JavaScript can be inspected by users.
- API keys should not be shipped to the browser bundle.

Instead, the app uses a protected server-side proxy:

```txt
Browser UI
  -> /api/<internal-agent-route>
  -> Agentflow create_session
  -> Agentflow stream_question
  -> streamed response back to UI
```

In Vercel, files under the `api/` folder run as serverless functions. This allows the app to keep Agentflow API keys in server-side environment variables.

Current proxy file:

```txt
api/ask-prism.js
```

The proxy handles:

- Reading the target feature from the UI request, for example `ask-prism` or `today`.
- Selecting the correct Agentflow base URL and API key from env variables.
- Creating an Agentflow chat session.
- Calling the streaming question endpoint.
- Forwarding the streaming response back to the frontend.

For a future app, this route can be renamed to a more generic name such as:

```txt
api/agentflow.js
api/chat.js
api/dashboard-agent.js
```

## 4. Agentflow API Calling Pattern

Agentflow requires two calls:

### Step 1: Create Session

```http
POST /chat/create_session
```

Body:

```json
{
  "session_name": "Prism ask-prism - 2026-05-15T..."
}
```

The response should include:

```json
{
  "data": {
    "session_id": "..."
  }
}
```

### Step 2: Stream Question

```http
POST /chat/stream_question
```

Body:

```json
{
  "query": "User question or static dashboard sync query",
  "session_id": "SESSION_ID_FROM_STEP_1"
}
```

The response is streamed as server-sent events.

## 5. Current Code Snapshot

The following code locations are from the current Prism sample app. For another UI, the filenames may change, but the same structure should be followed.

### Server-side proxy sample

Current proxy location:

```txt
api/ask-prism.js
```

Important behavior:

```js
const target = req.body?.target === 'today' ? 'today' : 'ask-prism';

const baseUrl =
  target === 'today'
    ? process.env.TODAY_AGENTFLOW_API_BASE_URL
    : process.env.ASK_PRISM_AGENTFLOW_API_BASE_URL;

const apiKey =
  target === 'today'
    ? process.env.TODAY_AGENTFLOW_API_KEY
    : process.env.ASK_PRISM_AGENTFLOW_API_KEY;
```

The actual file also keeps fallback env names for local/demo convenience.

### Frontend Agentflow service sample

Current client service:

```txt
src/services/agentflow.ts
```

The browser calls only the internal proxy:

```ts
fetch('/api/ask-prism', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query,
    target: options.target ?? 'ask-prism',
  }),
});
```

This keeps the external Agentflow URL and API key outside browser code.

## 6. Environment Variables

Environment variables are required both locally and in Vercel.

For production, add these in:

```txt
Vercel Project -> Settings -> Environment Variables
```

Recommended production variables:

```txt
<FEATURE_1>_AGENTFLOW_API_BASE_URL=
<FEATURE_1>_AGENTFLOW_API_KEY=

<FEATURE_2>_AGENTFLOW_API_BASE_URL=
<FEATURE_2>_AGENTFLOW_API_KEY=
```

For the current Prism app, use this setup in Vercel production:

```txt
ASK_PRISM_AGENTFLOW_API_BASE_URL=
ASK_PRISM_AGENTFLOW_API_KEY=

TODAY_AGENTFLOW_API_BASE_URL=
TODAY_AGENTFLOW_API_KEY=

VITE_TODAY_PATRICIA_QUERY=Sync the dashboard for Patricia
VITE_TODAY_MARCUS_QUERY=Sync the dashboard for Marcus
VITE_TODAY_JORDAN_QUERY=Sync the dashboard for Jordan
```

For local development, the current app also supports `VITE_` names, which can be placed in `.env.local`:

```txt
VITE_ASK_PRISM_AGENTFLOW_API_BASE_URL=
VITE_ASK_PRISM_AGENTFLOW_API_KEY=

VITE_TODAY_AGENTFLOW_API_BASE_URL=
VITE_TODAY_AGENTFLOW_API_KEY=
VITE_TODAY_PATRICIA_QUERY=Sync the dashboard for Patricia
VITE_TODAY_MARCUS_QUERY=Sync the dashboard for Marcus
VITE_TODAY_JORDAN_QUERY=Sync the dashboard for Jordan
```

Notes:

- The code supports both `VITE_` and non-`VITE_` names for the Agentflow base URL and API key.
- For Vercel production, prefer non-`VITE_` names for Agentflow base URLs and API keys.
- API keys should be treated as secrets and kept server-side.
- `VITE_` variables are normally intended for values that are safe to expose to the browser.
- Static query text can use `VITE_` because it is not secret.
- The frontend still calls only the protected proxy route, not Agentflow directly.
- Local secrets should stay in `.env.local`.
- `.env.local` should not be committed to Git.
- `.env.dev` can be used as a DevOps reference/template, but should not contain real secrets.

## 7. Interactive Agent Feature Pattern

This pattern applies to any chat-like or question-answer feature. In the current Prism sample, this is called Ask Prism.

Flow:

1. User types or clicks a suggested question.
2. UI sends the question to the protected internal API route.
3. Proxy creates a new Agentflow session.
4. Proxy streams the question response.
5. UI reads the final useful Agentflow response and renders it.

For interactive Q&A, the current sample implementation uses the final node response from Agentflow.

Current Prism sample questions:

```txt
Show me clients with a household income over $150k who do not participate in online trading
Which families with kids have no life coverage?
Show me clients turning 65 with no annuity
Who are our top 10 clients by Total Account Value?
List few clients who are currently renters
```

Future apps can replace these suggestions with use-case-specific prompts.

## 8. Dashboard / Static Query Feature Pattern

This pattern applies to dashboard pages where there is no user-entered question, but the UI still needs agent-generated data.

Instead of waiting for text input, the UI sends a predefined query based on context such as:

- selected user
- selected persona
- selected region
- selected workflow
- selected dashboard tab

In the current Prism sample, the Today tab sends a static query based on the selected advisor/persona:

```txt
Patricia -> Sync the dashboard for Patricia
Marcus   -> Sync the dashboard for Marcus
Jordan   -> Sync the dashboard for Jordan
```

These can be controlled through env variables:

```txt
VITE_TODAY_PATRICIA_QUERY=
VITE_TODAY_MARCUS_QUERY=
VITE_TODAY_JORDAN_QUERY=
```

For Today, the UI does not use the last node. It looks for the Agentflow node whose name includes:

```txt
Parse SQL
```

The expected response shape from that node is:

```json
{
  "dashboard_data": {
    "priorities": [],
    "summary": {
      "totalAum": 14848521,
      "reviewedPct": 0,
      "gapsByTheme": {
        "Retirement": 2,
        "Protection": 7,
        "Retention": 5
      }
    }
  }
}
```

The UI maps `priorities` into Today action cards and maps `summary` into the dashboard metrics.

For a future use case, this response shape should be changed to match the required dashboard sections.

## 9. Mapping API Data vs Demo Data

This is the main modular decision for any new app.

When integrating an agent into a demo UI, each screen should be classified into one of these categories:

```txt
Fully API-driven
Partially API-driven with demo fallback
Fully demo/static
```

Recommended mapping table:

| UI Area | Data Source | Notes |
| --- | --- | --- |
| Interactive Q&A | Agent API | Usually uses final agent response |
| Dashboard cards | Agent API or mapped API response | Best when agent returns structured JSON |
| Summary metrics | Agent API preferred | API should return already-calculated metrics |
| Charts | Agent API preferred | Return chart-ready aggregates |
| Tables | API or local dataset | Depends on whether backend can return full row-level data |
| Detail pages | API mapped into existing UI type | Avoid mixing API card data with unrelated demo fixture details |
| Static labels/buttons | UI code | Usually remain hardcoded unless configurable |

Current Prism sample status:

| UI Area | Current Source |
| --- | --- |
| Ask Prism answer response | Agent API |
| Today action cards | Agent API |
| Today total AUM | Agent API |
| Today review progress percentage | Agent API |
| Today gaps by theme | Agent API |
| Share of Wallet breakdown | Local demo data |
| Explore table | Local demo data |
| Overview / Branch view | Local demo data |
| Static labels and action buttons | UI code |

For future use cases, do not assume this same split. Decide per screen what the agent/API will own and what can remain static for demo purposes.

If the goal is to make the full dashboard API-driven, the agent/API should return every dashboard section in structured JSON, for example:

```json
{
  "cards": [],
  "summary": {},
  "charts": {},
  "tables": {},
  "details": {}
}
```

## 10. Customizing Any Lovable App After API/Auth Is Ready

For any Lovable-generated app or similar frontend, the recommended customization steps are:

1. Identify where demo/static data is stored.
   - Usually under `src/data`, `src/constants`, or directly inside page components.

2. Identify the service layer.
   - Prefer adding API calls inside `src/services/*`.
   - Avoid calling APIs directly from many components.

3. Add a protected backend proxy.
   - For Vercel, create a file under `api/`.
   - Store API keys in Vercel environment variables.
   - Let the frontend call the internal route, not the external API directly.

4. Map API responses into the existing UI data shape.
   - This avoids rewriting the whole UI.
   - Example: map Agentflow `priorities[]` into the app's existing action card type.

5. Add loading and fallback behavior.
   - Show loading state while the API is fetching.
   - If the API fails, optionally fall back to demo data.

6. Add caching if needed.
   - For dashboard tabs, avoid calling the API again on every page back/navigation.
   - Cache per persona/advisor for a short time.
   - Add a refresh button for manual re-sync.

7. Add env templates.
   - Keep real values in `.env.local` and Vercel.
   - Keep `.env.dev` or `.env.example` as a blank reference for DevOps.

## 11. Deployment Checklist

Before deploying:

- Confirm the app builds locally:

```bash
npm run build
```

- Confirm `.env.local` is not committed.
- Confirm Vercel env variables are configured.
- Confirm GitHub repo is connected to Vercel.
- Confirm `main` is the production branch.
- Push changes to `main`.
- Verify the Vercel deployment URL.
- Test:
  - App loads.
  - Ask Prism works.
  - Today tab loads Agentflow cards.
  - Refresh/retry behavior works.
  - Fallback behavior is acceptable if Agentflow is unavailable.
