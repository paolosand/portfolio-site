import { useState, useEffect, useCallback } from 'react';
import TopBar from './components/layout/TopBar';
import ArtistModal from './components/music/ArtistModal';
import ChatInterface from './components/chat/ChatInterface';
import Hero from './components/Hero';
import Projects from './components/Projects';
import Skills from './components/Skills';
import Experience from './components/Experience';
import Contact from './components/Contact';
import { useVisualViewportHeight } from './hooks/useVisualViewportHeight';
import './App.css';

function App() {
  const [view, setView] = useState('portfolio');
  const [musicOpen, setMusicOpen] = useState(false);
  const closeMusic = useCallback(() => setMusicOpen(false), []);
  const vh = useVisualViewportHeight();

  useEffect(() => {
    if (view !== 'chat') return;
    // Pinning the body (not just overflow:hidden) stops iOS Safari from
    // rubber-banding/scrolling the page itself while the keyboard is up —
    // the only thing that should scroll in chat view is the message list.
    document.body.style.position = 'fixed';
    document.body.style.inset = '0';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.position = '';
      document.body.style.inset = '';
      document.body.style.overflow = 'auto';
    };
  }, [view]);

  return (
    <div
      className={`app ${view === 'chat' ? 'is-chat' : ''}`}
      style={view === 'chat' && vh ? { height: `${vh}px` } : undefined}
    >
      <TopBar view={view} setView={setView} onMusicClick={() => setMusicOpen(true)} />

      {musicOpen && <ArtistModal onClose={closeMusic} />}

      {view === 'portfolio' && (
        <>
          <Hero onChatClick={() => setView('chat')} />
          <Projects />
          <Skills />
          <Experience />
          <Contact />
          <footer className="app-footer">
            <span>© paolo sandejas · made by hand & by machine</span>
            <span>printed in los angeles, ca · 2026<span className="blink"></span></span>
          </footer>
        </>
      )}

      {view === 'chat' && <ChatInterface />}
    </div>
  );
}

export default App;
