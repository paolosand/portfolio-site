// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import portfolioData from '../data/portfolio.json';
import './Navigation.css';

const Navigation = () => {
  const { personal } = portfolioData;

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <motion.nav
      className="navigation"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.6, 0.05, 0.01, 0.9] }}
    >
      <div className="container nav-container">
        <div className="nav-brand">
          <span className="nav-name">{personal.name}</span>
          <span className="nav-divider">/</span>
          <span className="nav-location">{personal.location}</span>
        </div>

        <div className="nav-links">
          <button onClick={() => scrollToSection('projects')} className="nav-link">
            Projects
          </button>
          <button onClick={() => scrollToSection('skills')} className="nav-link">
            Skills
          </button>
          <button onClick={() => scrollToSection('experience')} className="nav-link">
            Experience
          </button>
          <a
            href="/Paolo_Sandejas_Resume.pdf"
            download
            className="nav-link nav-link-accent"
          >
            Resume ↓
          </a>
          <a
            href={personal.github}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
          >
            GitHub ↗
          </a>
          <a
            href={personal.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
          >
            LinkedIn ↗
          </a>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navigation;
