import portfolioData from '../data/portfolio.json';
import './Contact.css';

export default function Contact() {
  const { personal } = portfolioData;

  return (
    <section id="contact">
      <div className="section-head">
        <h2 className="title">say <span className="accent">hello</span></h2>
      </div>
      <div className="postcard reg-marks">
        <div className="left">
          <div className="pc-msg">
            thanks for stopping by. i'd love to hear what you're building, and where a creator fits in.
          </div>
          <div className="signoff">talk soon, paolo</div>
        </div>
        <div className="right">
          <div>
            <div className="addr">
              <span className="lbl">e-mail</span>
              <a href={`mailto:${personal.email}`}>{personal.email}</a>
            </div>
            <div className="addr">
              <span className="lbl">on the web</span>
              <a href={personal.github} target="_blank" rel="noopener noreferrer">github.com/paolosand</a><br />
              <a href={personal.linkedin} target="_blank" rel="noopener noreferrer">linkedin.com/in/paolosand</a>
            </div>
            <div className="addr last">
              <span className="lbl">based in</span>
              los angeles, california
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
