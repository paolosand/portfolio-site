import { useState } from 'react';

// The build-log post-it: lemon paper scrap, tape mark, tickable rows that are
// also the chapter nav. Collapses to a chip on narrow viewports.
export default function LedgerPostit({ chapters, activeIndex, onJump, collapsed = false }) {
  const [open, setOpen] = useState(false);
  const shipped = activeIndex === chapters.length - 1;

  const rows = (
    <ul className="ledger-rows">
      {chapters.map((c, i) => (
        <li key={i}>
          <button
            type="button"
            className={`ledger-row ${i < activeIndex ? 'done' : ''} ${i === activeIndex ? 'now' : ''} ${c.detour ? 'detour' : ''}`}
            aria-current={i === activeIndex ? 'step' : undefined}
            onClick={() => { onJump(i); setOpen(false); }}
          >
            <span className="ledger-tick" aria-hidden="true">
              {c.detour ? '↩' : i === chapters.length - 1 ? '★' : '✓'}
            </span>
            {c.kicker}
          </button>
        </li>
      ))}
    </ul>
  );

  if (collapsed) {
    return (
      <div className="ledger-chipwrap">
        <button
          type="button"
          className="ledger-chip"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          § {String(activeIndex + 1).padStart(2, '0')} / {String(chapters.length).padStart(2, '0')} · {chapters[activeIndex].kicker} {open ? '▴' : '▾'}
        </button>
        {open && <aside className="ledger-postit">{rows}</aside>}
      </div>
    );
  }

  return (
    <aside className="ledger-postit">
      <h4 className="ledger-head">build log</h4>
      {rows}
      <span className={`ledger-stamp ${shipped ? 'show' : ''}`} aria-hidden={!shipped}>
        ● shipped
      </span>
    </aside>
  );
}
