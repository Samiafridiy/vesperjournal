# Market Intel 2.0 — Fundamental Intelligence

Extends the existing Market Intel page. No rebuild, no new colors, no new top-level navigation. Everything reuses the current dark/gold/amber cards, mono numbers, and animation utilities already in the app.

## What exists today

- Market Intel page with Live News (Google News RSS) and Economic Calendar (ForexFactory weekly JSON), impact filters, Today/Tomorrow/Week, AI analysis cached in the backend.
- Calendar tables already created for a push/sync pipeline, but no sync endpoint runs yet, so freshness still depends on the page fetching.
- AI analysis currently produces "Above forecast → Bullish USD" style directional labels.

## What changes

### 1. Section structure inside Market Intel
One page, six tabs reusing existing tab styling: **News · Calendar · Macro · Analysis · Scenarios · Thesis**. Mobile keeps the existing horizontal scrolling tab rail.

### 2. Live News reliability
- Provider abstraction: primary source → fallback source → last cached copy stored in the backend. A provider outage shows the last known stories with an honest "as of" time instead of an error.
- Near-duplicate stories collapsed (existing title-similarity logic reused).
- Each story shows source, published time, and, when the feed gives one, updated time.
- Category tabs: Macro & Politics, Forex & Metals, Crypto.
- Header shows a real "Synced HH:MM" timestamp — never claims live when the feed is delayed.

### 3. Economic calendar freshness
- A background sync endpoint pulls the calendar on a schedule (more frequently around release windows) and writes normalized rows into the existing calendar tables.
- The page subscribes to those rows, so Actual values appear shortly after release without aggressive polling.
- Each event stores previous, forecast, actual, release status, release time, source, and last-updated time. A revised previous is stored as revised, not as the original.
- Status becomes: Not released / Released / Revised, alongside the existing Soon and LIVE badges.
- Existing card design, impact filters, and Today/Tomorrow/Week controls stay exactly as they are.

### 4. Remove directional labels
Replace "Bullish JPY / Bearish JPY" outputs everywhere in Market Intel (news analysis, calendar scenarios, indices bias cards) with the neutral four-part structure:

```text
FACT           Actual 0.4% vs forecast 0.2%
INTERPRETATION Inflation rose more than expected
CONTEXT        What to check before concluding anything
POSSIBLE       What could follow, stated as possibility
UNCERTAINTY    What would invalidate this reading
```

The AI prompts are rewritten to forbid buy/sell/long/short/bullish/bearish conclusions and to state confidence and unknowns. The scenario highlighting on release stays, but shows the neutral reading rather than a direction.

### 5. Macro section
A consolidated view grouped into Inflation, Employment, Growth, Monetary Policy. Each indicator shows latest actual, prior, consensus, release date, a small trend sparkline (existing sparkline component), and next scheduled release. Values are derived from the normalized calendar history already being collected — nothing fabricated; an indicator with no data yet says so.

### 6. Scenarios
For an upcoming high-impact event, the trader sees the possible outcome bands (above / in line / below) with neutral interpretation and what evidence would support each — no recommendation, no signal.

### 7. Thesis / Research
A personal notes area where the trader writes their own read on the week, optionally pinning events or stories as evidence. Stored per user in the backend with private access. The AI can critique the thesis for missing evidence but never writes a direction for the trader.

### 8. Integration boundaries
No changes to Dashboard, New Trade, History, Analytics, AI Coach, Risk Engine, Rule Book, Weekly Review, or authentication. The only cross-feature touch is the existing "how this affects your traded pairs" block, which switches to neutral language.

## Build order

1. Calendar sync pipeline + normalized data + realtime reading (biggest freshness win).
2. Neutral-language rewrite across news and calendar AI output.
3. News provider fallback + categories + honest sync timestamp.
4. Macro section.
5. Scenarios.
6. Thesis / Research.

## Technical notes

- Sync runs as a scheduled public endpoint writing to `calendar_events` / `calendar_sync_state`; the page reads via realtime subscription with a cached first paint.
- AI stays on the existing Lovable AI setup with cached analyses keyed by event; prompts change, plumbing does not.
- New thesis table gets row-level ownership policies and grants, matching existing tables.
