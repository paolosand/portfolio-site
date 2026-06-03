---
target: chat interface mobile view
total_score: 28
p0_count: 0
p1_count: 2
timestamp: 2026-06-03T04-23-25Z
slug: chat-interface-mobile
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Typing indicator present and sender labels clear; bounce animation undermines the technical feel |
| 2 | Match System / Real World | 3 | Sender labels work well; em dash in lead copy is a banned pattern |
| 3 | User Control and Freedom | 2 | ASCII banner permanently occupies scroll height with no skip affordance; no cancel-in-flight |
| 4 | Consistency and Standards | 2 | Three explicit design system violations: pink shadow on send, border-left bubble stripe, bounce easing on typing dots |
| 5 | Error Prevention | 4 | Disabled states correct, input validation solid, error recovery well-built |
| 6 | Recognition Rather Than Recall | 3 | Prompt cards help users understand what to ask; sender labels readable |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcut visible; prompt cards buried under scroll; pao-gpt from label likely wraps in 52px column |
| 8 | Aesthetic and Minimalist Design | 2 | ASCII banner renders broken on mobile; bounce dots are dated; multiple design system rule breaks accumulate |
| 9 | Error Recovery | 4 | Error bar has retry and dismiss, role=alert, correct disabled state on retry |
| 10 | Help and Documentation | 3 | Prompts are effective entry points; privacy note is appropriately placed |
| **Total** | | **28/40** | **Needs Work** |

## Anti-Patterns Verdict

Desktop does not read as AI-generated. Mobile is more uncertain: broken ASCII banner and bounce typing dots are the specific tells. Detector confirmed typing-bounce with ease-in-out at index.css:1135.

## Overall Impression

Chat interface is well-structured and has genuine personality on desktop. Mobile is where it unravels: ASCII banner becomes a horizontal-scroll mess, the heading star drops to an orphan line, and three design system rules are quietly broken in the message and input components.

## What's Working

1. Chat-shell frame is excellent: border 1.5px ink, 6px offset shadow, dark header with lemon PAO-GPT label. Looks like a terminal window printed on paper.
2. Error state is production-grade: pink-bordered error bar with role=alert, retry/dismiss, disabled-during-load retry, correct color usage.
3. Prompt card interaction: hover lift is snappy and on-brand. ASCII icons with per-child ink accent (blue/pink/mint/lemon) is exactly the right level of personality.

## Priority Issues

[P1] ASCII banner is a broken experience on mobile
- At 375px content width (~315px usable), the white-space:pre ASCII art overflows and creates a nested horizontal scroll inside the vertical chat-paper scroll.
- Fix: display:none on .welcome-banner inside @media (max-width: 880px). The h1 + lead paragraph are strong enough alone.
- Command: /impeccable adapt

[P1] h1 star orphans to its own line on mobile
- "hi, i'm pao-gpt" fills ~288px at 32px JetBrains Mono; the inline-block wave star wraps to line 2 becoming a stray glyph.
- Fix: Reduce font-size to 26px on mobile so the full h1 fits on one line.
- Command: /impeccable adapt

[P2] Message bubble border-left is the banned side-stripe anti-pattern
- .msg .bubble { border-left: 1.5px solid var(--ink) } violates the explicit ban on border-left > 1px as accent on list items.
- Fix: Implement DESIGN.md spec: user bubbles get ink bg/paper text/ink border/ink shadow; assistant bubbles get paper-2 bg/ink border/ink shadow.
- Command: /impeccable polish

[P2] Send button shadow uses pink - breaks Offset Shadow Rule
- .chat-input .send { box-shadow: 3px 3px 0 var(--c-pink) } - shadow must always be ink (#1A130A).
- Fix: box-shadow: 3px 3px 0 var(--ink).
- Command: /impeccable polish

[P2] Typing indicator uses bounce easing - banned
- typing-bounce with ease-in-out detected by detector at index.css:1135.
- Fix: Replace ease-in-out with cubic-bezier(0.22, 1, 0.36, 1). Consider replacing 3-dot indicator with a single blinking caret character to match input field.
- Command: /impeccable animate

## Persona Red Flags

The Rushed Recruiter (mobile): Sees broken ASCII graphic and orphaned star before reaching any useful content. First impression: not production-ready.

The Curious Engineer (desktop): Opens a conversation and sees border-left stripe on message bubbles - the exact banned template pattern that signals AI-assembled UI.

The First-Time Mobile Visitor (375px): Arrives on chat. Sees clipped banner, thinks something is broken. Succeeds via the input bar despite the welcome screen, not because of it.

## Minor Observations

- Em dash in lead copy: "...the wearable instruments — i'll answer in his voice." Rewrite with semicolon or period.
- pao-gpt from label (~70px) wraps in 52px mobile column. Add white-space:nowrap or widen to 68px.
- 12px webkit scrollbar on mobile consumes 4% of content width; inconsistent (shows on Android, not iOS).
- Restart and retry both use the same glyph. Minor copy consistency note.
