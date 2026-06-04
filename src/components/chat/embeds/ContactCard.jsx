import './ContactCard.css';

const EMAIL = 'pjsandejas@gmail.com';
const DEFAULT_SUBJECT = 'Question from your portfolio';

export default function ContactCard({ subject }) {
  const href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject || DEFAULT_SUBJECT)}`;
  return (
    <a className="contact-card" href={href}>
      <span className="contact-rail" aria-hidden="true"></span>
      <span className="contact-main">
        <span className="contact-left"><span className="contact-glyph">✉</span> ask Paolo directly</span>
        <span className="contact-go">email →</span>
      </span>
    </a>
  );
}
