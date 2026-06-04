import portfolioData from '../../../data/portfolio.json';
import './CitationChip.css';

const WORK_TITLES = {
  'nuts-and-bolts-ai': 'Nuts and Bolts AI',
  'stratpoint': 'Stratpoint Technologies',
};
const GLYPHS = { project: '◆', work: '■', music: '♪' };

function resolveTitle(type, id) {
  if (type === 'project') return portfolioData.projects.find(p => p.id === id)?.title ?? id;
  if (type === 'work') return WORK_TITLES[id] ?? id;
  if (type === 'music') return 'Paolo Sandejas';
  return id;
}

export default function CitationChip({ type, id, onExpand }) {
  return (
    <button className="citation-chip" onClick={() => onExpand({ type, id })}>
      <span className="citation-glyph">{GLYPHS[type] ?? '◆'}</span>
      <span className="citation-title">{resolveTitle(type, id)}</span>
      <span className="citation-expand">⤢ expand</span>
    </button>
  );
}
