import './ChipBar.css';

const DEFAULT_CHIPS = [
  'how does CHULOOPA work?',
  'what AI has Paolo shipped to production?',
  'tell me about the music and art side',
  'what is Paolo looking for in his next role?',
];

export default function ChipBar({ onPick }) {
  return (
    <div className="chip-bar" role="navigation" aria-label="Quick questions">
      {DEFAULT_CHIPS.map(chip => (
        <button
          key={chip}
          className="chip-pill"
          onClick={() => onPick(chip)}
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
