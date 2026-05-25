import { useState, useEffect } from 'react';
import TopBar from './components/layout/TopBar';
import ChatInterface from './components/chat/ChatInterface';
import Hero from './components/Hero';
import Projects from './components/Projects';
import Skills from './components/Skills';
import Experience from './components/Experience';
import Contact from './components/Contact';
import './App.css';

function App() {
  const [view, setView] = useState('portfolio');

  useEffect(() => {
    document.body.style.overflow = view === 'chat' ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [view]);

  return (
    <div className={`app ${view === 'chat' ? 'is-chat' : ''}`}>
      <TopBar view={view} setView={setView} />

      {view === 'portfolio' && (
        <>
          <Hero onChatClick={() => setView('chat')} />
          <Projects />
          <Skills />
          <Experience />
          <Contact />
          <footer className="app-footer">
            <span>© paolo sandejas · made by hand & by machine</span>
            <span>printed in glendale, ca · 2026<span className="blink"></span></span>
          </footer>
        </>
      )}

      {view === 'chat' && <ChatInterface />}
    </div>
  );
}

export default App;
