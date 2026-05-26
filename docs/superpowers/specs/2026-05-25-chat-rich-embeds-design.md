# Chat Rich Embeds Design

**Date:** 2026-05-25  
**Status:** Approved

## Summary

Upgrade the portfolio chat so AI responses can include inline project and work/experience cards. The AI decides when to embed a card (on-demand, only when a project or job is the main focus). Cards appear inline between paragraphs, not appended at the end.

## Interaction Pattern

- **Trigger:** On-demand — the AI embeds a card only when a project or company is the clear subject of the answer, not a passing mention.
- **Placement:** Inline, between paragraphs of text. Text can appear before and after a card in the same message.
- **Card types:** `project` (from `portfolio.json` projects array) and `work` (from `portfolio.json` experience array).

## Architecture

```
User message
  → api/chat.js  (guard check, unchanged)
  → rag.js generate()  →  Gemini with responseSchema
  → returns Block[]
  → api/chat.js sends { blocks: Block[], blocked: false }
  → useChat.js stores assistant msg as { role: 'assistant', blocks: Block[] }
  → Message.jsx renders blocks in order:
      type "text"    → <ReactMarkdown>
      type "project" → <ProjectEmbed id={block.id} />
      type "work"    → <WorkEmbed id={block.id} />
```

## Data Model

### Block type

```ts
type Block =
  | { type: 'text';    content: string }
  | { type: 'project'; id: string }
  | { type: 'work';    id: string }
```

### Gemini responseSchema

```js
{
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      type:    { type: Type.STRING },   // "text" | "project" | "work"
      content: { type: Type.STRING },   // text blocks
      id:      { type: Type.STRING },   // card blocks
    },
    required: ['type'],
  }
}
```

### API response contract

Before: `{ response: string, blocked: boolean }`  
After:  `{ blocks: Block[], blocked: boolean }`

### Message state (useChat.js)

User messages: `{ role: 'user', content: string, timestamp: string }`  
Assistant messages: `{ role: 'assistant', blocks: Block[], timestamp: string }`

When building history to send to the API, assistant blocks are reconstructed into a plain string by joining all `type: 'text'` block content values. The `{ role, content }` history wire format is unchanged.

## Valid Card IDs

The system prompt instructs the AI to use only these IDs:

**Projects** (from `portfolio.json`):
- `chuloopa`
- `video-analysis`
- `geospatial-ml`
- `hai`
- `ascii-drone`
- `parallel-paths`

**Work** (explicitly defined IDs, not derived algorithmically):
- `nuts-and-bolts-ai` → Nuts and Bolts AI
- `stratpoint` → Stratpoint Technologies

## Card Visual Design

### ProjectEmbed

- **Header:** `◆` glyph (blue for `ml`, purple for `creative`) + title + subtitle + featured badge if applicable
- **Body:** description, tag pills (blue for ml, purple for creative), github/demo links
- **Border:** `1px solid #3a3a3a`, dark background `#141414`, radius `6px`

### WorkEmbed

- **Header:** `■` glyph (amber) + company + role + date range
- **Body:** up to 3 bullet points from `bullets` array
- **Same border/background treatment as ProjectEmbed**

### Color scheme

| Category | Glyph | Accent color | Tag bg |
|----------|-------|-------------|--------|
| ml project | `◆` | `#7c9ef8` (blue) | `#1a2035` |
| creative project | `◆` | `#c084fc` (purple) | `#1e1224` |
| work | `■` | `#f59e0b` (amber) | — |

## Files Changed

| File | Change |
|------|--------|
| `api/lib/personality.js` | Add block format instructions + valid IDs to `SYSTEM_PROMPT` |
| `api/lib/rag.js` | Add `responseSchema` to Gemini config; update `generate()` to return `Block[]`; change `responseMimeType` to `'application/json'` |
| `api/chat.js` | Return `blocks` instead of `response` string |
| `src/hooks/useChat.js` | Store `blocks` on assistant messages; reconstruct history content from text blocks |
| `src/components/chat/Message.jsx` | Render `blocks` array instead of single `content` string |
| `src/components/chat/embeds/ProjectEmbed.jsx` | New — project card component |
| `src/components/chat/embeds/WorkEmbed.jsx` | New — work/experience card component |
| `src/components/chat/embeds/Embed.css` | New — shared card styles |

## Error Handling

- **Malformed Gemini response:** `generate()` wraps `JSON.parse(response.text)` in a try/catch; on failure it returns `[{ type: 'text', content: response.text }]` so the UI never breaks.
- **filterResponse:** Currently applied to the whole response string in `chat.js`. With blocks, `generate()` applies `filterResponse` to each `text` block's `content` field after parsing.
- **Unknown card ID:** `ProjectEmbed`/`WorkEmbed` look up the ID in `portfolio.json` at render time; if not found, the component returns `null` — silent skip.
- **Blocked response:** `blocked: true` path unchanged; `useChat.js` sets error state, no blocks rendered.

## Testing

- `api/lib/rag.test.js`: Update `generate()` test to assert it returns a `Block[]` with at least one `{ type: 'text' }` block.
- `api/lib/guard.test.js`: Unchanged.
- No new component tests — embeds are pure renders from static `portfolio.json` data.
