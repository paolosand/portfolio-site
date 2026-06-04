# pao-gpt — Personality, Email Card & Citation Embeds

**Date:** 2026-06-03
**Scope:** A second pass on the pao-gpt chat, fixing factual/voice problems surfaced in live testing and adding two UX affordances. Builds on the RAG + UX work in `2026-06-03-paogpt-rag-and-ux-design.md` (already shipped to production).

---

## Problem Statement

Live testing of the deployed chat exposed five issues:

1. **Wrong, self-contradicting label.** Responses say *"signed to Universal Records Philippines"* (present tense) while the music card says *"Independent (Symphonic Distribution)."* The knowledge base (`music.md`) is correct; the stale few-shot examples in `personality.js` override it.
2. **Dead-end on the most important question.** *"What is Paolo looking for in his next role?"* — a featured chip in both the greeting and the ChipBar — returns *"I don't have specific details… in the provided context,"* because no such content exists in the knowledge base. It also leaks the near-banned "provided context" phrasing.
3. **Lifeless deflections.** Off-topic/playful asks ("tell me a joke") get a flat *"I don't have any jokes in my context, sorry"* — no personality, and again the banned phrasing.
4. **Impersonation.** The assistant speaks as Paolo in first person ("I built CHULOOPA"). It should be an assistant built *from* his work, not a Paolo costume.
5. **Repeated cards.** The full CHULOOPA card re-rendered three times in one conversation — visually noisy.

---

## Decisions (from brainstorm)

### A. Persona: third-person assistant *with* personality
- The assistant speaks as **itself** — "I" / "me" refers to pao-gpt, the AI (consistent with the greeting *"i'm an AI built on top of paolo's actual work"*). **Paolo is always third person** ("Paolo", "he", "his work"). Never "I built CHULOOPA."
- **Personality:** casual, technically sharp, warm, playful — mirroring Paolo's manner of speech.
- **Energy-matching:** lean into the user's vibe when it's playful / excited / curious; stay crisp when neutral. **Do not match aggression** — stay composed (malicious input is already handled by `guard.js`, unchanged).
- **Never** say "in my context" / "in the provided context" or any meta-comment about the source of knowledge.

### B. Four response modes
1. **Confident, KB-grounded** → answer in personality, third person.
2. **Harmless off-topic / playful** (jokes, chit-chat) → personality + energy-match + a gentle redirect to what it *can* talk about. **No card.**
3. **Real substantive gap / personal / nuanced / forward-looking** (next role, availability, opinions, "would Paolo like X") → a short honest line **+ the email action card**.
4. **Aggressive / malicious** → existing `guard.js` witty rejections. Unchanged.

### C. Email action card
- **New block type:** `{ "type": "contact" }`. Optionally `{ "type": "contact", "content": "<suggested email subject>" }`.
- **Trigger:** the model emits it on **mode 3**. The system prompt defines when (see B3) and gives a few-shot example.
- **Visual:** slim inline CTA bar (brainstorm "Variant A") with a **bold ~11px lemon (`--c-lemon`) rail down the left edge**, flush inside a 1.5px ink border with the standard `3px 3px 0` hard shadow, mono type. Content: `✉ ask Paolo directly` on the left, an `email →` pill on the right.
- **Behavior:** the whole bar is a link to `mailto:pjsandejas@gmail.com` with a **pre-filled subject** — `?subject=` defaults to *"Question from your portfolio"*, or uses the model-supplied `content` when present. Hover lifts via hard-shadow like other buttons.
- **Component:** new `ContactCard.jsx` + CSS, rendered by `MessageList` for `type === 'contact'`.

### D. Citation embeds — "first-full, then-cite" (brainstorm "Approach B")
- The **first** time a given project/work/music entity appears in a conversation → render the **full card** inline (existing `ProjectEmbed` / `WorkEmbed` / `MusicEmbed`).
- **Subsequent** mentions of the **same** entity → render a compact **citation chip**: `◆ <Title>  ⤢ expand` (ink border, hard shadow, mono, riso accent). Clicking opens the **full card in a modal**.
- **Entity key:** `` `${type}:${id}` `` (music is always `music:artist-profile`).
- **Dedup is per-conversation** and derived purely from message order — it resets on restart (no persisted state).

### E. `goals.md` knowledge content
- New file `api/knowledge/goals.md`. Picked up automatically by `ingest.mjs` (globs `*.md`) — no script change.
- **Framing:** *Software / AI Engineer building creative products and responsible AI tools for creatives* — a credible title plus a mission hook, not a bare "generalist."
- **Sections:** the work he's drawn to (creative + responsible AI for creators); what he brings (CS/ML foundations, AI-lab experience, rapid full-stack delivery, CS-×-musician blend); where he wants to grow (production-grade system architecture); current context (SWE at Nuts & Bolts while finishing his MFA).
- **Availability:** discreet openness only — *"always happy to talk to people building in that space."* No "actively job-hunting" language (his current employer may read it). Specifics (timing, location) are deferred to the email card.
- **NDA (hard rule):** the climate work is referred to only as *"a FAANG research lab"* — never the actual company or project name. Verified: existing knowledge files are already clean.
- With `goals.md` present, the "next role" question now has a real answer **and** still emits the contact card (it's a mode-3 question).

### F. Label fix
- In `personality.js`: remove the present-tense *"signed to Universal Records Philippines"* from the identity line, and rewrite the music few-shot example so it **demonstrates voice/structure without asserting specific label facts** — those come from `music.md` via RAG. The music card already shows the correct current status.

---

## Architecture

### Backend
- **`api/lib/personality.js`** — the core change. Rewrite `BASE_SYSTEM_PROMPT`:
  - Third-person assistant voice + personality + energy-matching rules.
  - The four response modes, explicit.
  - `contact` added to the allowed block-type list and output-format docs.
  - Replace the three few-shot examples with third-person versions covering: (1) a confident technical answer, (2) a playful off-topic redirect with no card, (3) a mode-3 gap that emits a `contact` card. Strip hard label facts from the music example.
  - `GREETING_BLOCKS`, `isGreetingSentinel`, `WITTY_REJECTIONS`, `buildSystemPrompt(projectIds, workIds)` keep their signatures.
- **`api/lib/rag.js` / response schema** — no schema change needed (`type` + optional `content` already cover `contact`). `chat.js` already passes non-text blocks straight through as embeds.
- **`api/knowledge/goals.md`** — new content file.
- **`api/lib/rag.test.js`** — add `contact` to the valid-types assertion.

### Frontend
- **`ContactCard.jsx` (+ css)** — pure presentational; builds the `mailto` href, optional `subject` prop.
- **`CitationChip.jsx` (+ css)** — compact chip; props `{ type, id, title, onExpand }`.
- **`EmbedModal.jsx` (+ css)** — portal/overlay that renders the full `ProjectEmbed`/`WorkEmbed`/`MusicEmbed` for a given `{type, id}`, with backdrop + close (Esc / click-outside / × button).
- **`MessageList.jsx`** — the integration point:
  - A small **pure helper** `annotateEmbeds(messages)` (testable) walks messages in order, tracks a `Set` of seen entity keys, and tags each embed occurrence as `full` or `cite`. Keeping this pure lets us unit-test the first-vs-repeat logic without rendering.
  - Render `full` → existing embed component; `cite` → `CitationChip`; `type === 'contact'` → `ContactCard`; `type === 'chips'` → existing `InlineChips`.
  - Local `useState` for the open modal entity; render one `<EmbedModal>` at the end.

### Data flow
```
query → chat.js → generate() → blocks[]            (text | project | work | music | chips | contact)
blocks → SSE → useChat → message.blocks
MessageList:
  annotateEmbeds(messages) → per-embed {render: full|cite}
  full  → ProjectEmbed / WorkEmbed / MusicEmbed (inline)
  cite  → CitationChip → onExpand → EmbedModal(full card)
  contact → ContactCard → mailto:
```

### Error / edge handling
- Unknown embed `id` → existing components already return `null`; `annotateEmbeds` still records the key so behavior is consistent.
- `contact` with no `content` → ContactCard uses the default subject.
- Modal open when messages update (streaming) → keyed by `{type,id}`, unaffected by new messages; Esc and backdrop always close.
- Restart clears messages → seen-set is recomputed from empty, so cards go full again. Correct.

### Testing
- **Unit (Node test runner):** `annotateEmbeds` — first occurrence `full`, repeats `cite`, distinct entities independent, music single-id, empty input. `rag.test.js` valid-types includes `contact`.
- **Manual:** label question (text matches card, no "Universal" present-tense); "tell me a joke" (playful, no card, no "in my context"); "next role" (real answer + contact card); repeated CHULOOPA mention (full then chip → modal opens); email card opens a pre-filled draft.

---

## File Changes Summary

### New
- `api/knowledge/goals.md`
- `src/components/chat/embeds/ContactCard.jsx` + `ContactCard.css`
- `src/components/chat/embeds/CitationChip.jsx` + `CitationChip.css`
- `src/components/chat/embeds/EmbedModal.jsx` + `EmbedModal.css`

### Modified
- `api/lib/personality.js` — system prompt rewrite (persona, modes, contact, third-person examples, label fix)
- `api/lib/rag.test.js` — add `contact` to valid types
- `src/components/chat/MessageList.jsx` — `annotateEmbeds`, citation/contact rendering, modal state
- `src/components/chat/MessageList.test.js` (new, or co-located) — `annotateEmbeds` unit tests

### Deploy
- Requires a redeploy (`vercel --prod`). The build runs `ingest.mjs`, which re-embeds including `goals.md`. `GOOGLE_API_KEY` is already set in the Vercel project env.

---

## Out of Scope
- Changing the persistent ChipBar contents (the "next role" chip now resolves well).
- Persisting conversation/seen-state across reloads.
- Making first-render full cards themselves clickable-to-modal (only citation chips open the modal).
- Approach C (live ReAct agent) — still a later phase.
