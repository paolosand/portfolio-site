import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import TopBar from './components/layout/TopBar';
import ChatInterface from './components/chat/ChatInterface';
import Hero from './components/Hero';
import Projects from './components/Projects';
import Skills from './components/Skills';
import Experience from './components/Experience';
import Education from './components/Education';
import Contact from './components/Contact';
import './styles/chatgpt-theme.css';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('chat');

  useEffect(() => {
    document.body.style.overflow = currentView === 'chat' ? 'hidden' : 'auto';
  }, [currentView]);

  return (
    <div className="app">
      <TopBar
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      {currentView === 'chat' && (
        <div style={{ marginTop: '60px', height: 'calc(100vh - 60px)' }}>
          <ChatInterface />
        </div>
      )}

      {currentView === 'portfolio' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ marginTop: '60px' }}
        >
          <main>
            <Hero onChatClick={() => setCurrentView('chat')} />
            <Projects />
            <Skills />
            <Experience />
            <Education />
            <Contact />
          </main>
        </motion.div>
      )}
    </div>
  );
}

export default App;
