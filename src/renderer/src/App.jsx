import React, { useState, useEffect } from 'react';
import { Bell, Settings, History, Trash2, Plus, Terminal, ExternalLink, Moon, Sun, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [activeTab, setActiveTab] = useState('history');
  const [history, setHistory] = useState([]);
  const [topics, setTopics] = useState([]);
  const [theme, setTheme] = useState('system');
  const [browserPath, setBrowserPath] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    // Initial data fetch
    window.api.getHistory().then(setHistory);
    window.api.getTopics().then(setTopics);
    window.api.getTheme().then(setTheme);
    window.api.getBrowserPath().then(setBrowserPath);

    // Listeners
    window.api.onHistoryUpdated(setHistory);
    window.api.onGoToSettings(() => setActiveTab('settings'));
    window.api.onShowToast((data) => showToast(data.message));
  }, []);

  const addTopic = () => {
    const newTopics = [...topics, { name: '', server: 'https://ntfy.sh', id: Date.now() }];
    setTopics(newTopics);
  };

  const removeTopic = (id) => {
    const newTopics = topics.filter(t => t.id !== id);
    setTopics(newTopics);
    window.api.saveTopics(newTopics);
  };

  const updateTopic = (id, field, value) => {
    const newTopics = topics.map(t => t.id === id ? { ...t, [field]: value } : t);
    setTopics(newTopics);
  };

  const saveSettings = () => {
    window.api.saveTopics(topics);
    window.api.saveBrowserPath(browserPath);
  };

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
    window.api.saveTheme(newTheme);
  };

  const copyMessage = (msg) => {
    if (!msg.click) {
      window.api.copyToClipboard(msg.message);
      showToast('Copied to clipboard!');
    }
  };

  return (
    <div className={`app-container ${theme}-theme`}>
      <header className="mica-bg">
        <div className="header-content">
          <h1>Ntfy Desktop</h1>
          <nav>
            <button 
              className={activeTab === 'history' ? 'active' : ''} 
              onClick={() => setActiveTab('history')}
            >
              <History size={18} /> History
            </button>
            <button 
              className={activeTab === 'settings' ? 'active' : ''} 
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={18} /> Settings
            </button>
          </nav>
        </div>
      </header>

      <main>
        <AnimatePresence mode="wait">
          {activeTab === 'history' && (
            <motion.section 
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="history-view"
            >
              {history.length === 0 ? (
                <div className="empty-state">
                  <Bell size={48} />
                  <p>No messages yet.</p>
                </div>
              ) : (
                <div className="message-list">
                  {history.map(msg => (
                    <div 
                      key={msg.id} 
                      className={`message-card mica-bg ${!msg.click ? 'clickable' : ''}`}
                      onClick={() => copyMessage(msg)}
                    >
                      <div className="message-header">
                        <span className="topic-badge">{msg.topic}</span>
                        <span className="time">{new Date(msg.time).toLocaleTimeString()}</span>
                      </div>
                      <h3>{msg.title}</h3>
                      <p>{msg.message}</p>
                      {msg.click && (
                        <a href={msg.click} target="_blank" rel="noreferrer" className="action-link" onClick={(e) => e.stopPropagation()}>
                          <ExternalLink size={14} /> Open Link
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.section>
          )}

          {activeTab === 'settings' && (
            <motion.section 
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="settings-view"
            >
              <div className="settings-card mica-bg">
                <h2>Topics & Servers</h2>
                {topics.map(topic => (
                  <div key={topic.id} className="topic-item">
                    <input 
                      placeholder="Topic Name" 
                      value={topic.name} 
                      onChange={(e) => updateTopic(topic.id, 'name', e.target.value)} 
                    />
                    <input 
                      placeholder="Server (e.g. https://ntfy.sh)" 
                      value={topic.server} 
                      onChange={(e) => updateTopic(topic.id, 'server', e.target.value)} 
                    />
                    <button className="icon-btn delete" onClick={() => removeTopic(topic.id)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                <div className="settings-actions">
                  <button className="primary-btn" onClick={addTopic}>
                    <Plus size={18} /> Add Topic
                  </button>
                </div>
              </div>

              <div className="settings-card mica-bg">
                <h2>Custom Browser</h2>
                <div className="browser-setting">
                  <p className="setting-desc">Enter the full path to an executable (e.g. C:\...\chrome.exe) to open links in a specific browser. Leave empty for system default.</p>
                  <div className="input-group">
                    <Terminal size={18} />
                    <input 
                      className="full-width"
                      placeholder="e.g. C:\Program Files\Google\Chrome\Application\chrome.exe" 
                      value={browserPath} 
                      onChange={(e) => setBrowserPath(e.target.value)} 
                    />
                  </div>
                </div>
                <div className="settings-actions">
                  <button className="primary-btn" onClick={saveSettings}>
                    Save All Settings
                  </button>
                </div>
              </div>

              <div className="settings-card mica-bg">
                <h2>Appearance</h2>
                <div className="theme-toggle">
                  <button className={theme === 'light' ? 'active' : ''} onClick={() => toggleTheme('light')}>
                    <Sun size={18} /> Light
                  </button>
                  <button className={theme === 'dark' ? 'active' : ''} onClick={() => toggleTheme('dark')}>
                    <Moon size={18} /> Dark
                  </button>
                  <button className={theme === 'system' ? 'active' : ''} onClick={() => toggleTheme('system')}>
                    <Monitor size={18} /> System
                  </button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="toast-container"
          >
            <div className="toast">
              <Terminal size={16} /> {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
