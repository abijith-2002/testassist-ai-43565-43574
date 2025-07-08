import React, { useRef, useState, useEffect } from "react";
import "./App.css";

// SVG icon components with new color palette
const ReloadIcon = ({size=20}) => (
  <svg width={size} height={size} fill="none" aria-label="Reload" viewBox="0 0 20 20" role="img">
    <path d="M16.98 10.59A7 7 0 1 1 10 3V1.1a.85.85 0 0 1 1.3-.7l3.14 2.13a.85.85 0 0 1 0 1.4l-3.14 2.14A.85.85 0 0 1 10 5.36V3a6 6 0 1 0 5.31 8.76" stroke="#1976d2" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);
const StopIcon = ({size=20}) => (
  <svg width={size} height={size} viewBox="0 0 20 20" aria-label="Stop" role="img">
    <rect x="5" y="5" width="10" height="10" rx="3" fill="#1976d2"/>
  </svg>
);
const SendArrowIcon = ({size=26}) => (
  <svg width={size} height={size} viewBox="0 0 26 26" fill="none" aria-label="Send" role="img">
    <path d="M3 22.5L24 13L3 3.5V10.75L17 13L3 15.25V22.5Z" fill="#FFFFFF"/>
  </svg>
);

// PUBLIC_INTERFACE
function App() {
  /**
   * Professional AI chat interface with modern design and specified color palette.
   * Features header, main chat area with page-level scrolling, and input footer.
   */
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // PUBLIC_INTERFACE: Scroll to latest message using main page scrollbar
  useEffect(() => { 
    if(chatEndRef.current) {
      chatEndRef.current.scrollIntoView({behavior:"smooth", block: "nearest"});
    }
  }, [messages]);

  /**
   * PUBLIC_INTERFACE
   * Send chat message to backend API with comprehensive error handling.
   */
  const sendMessage = async e => {
    e && e.preventDefault();
    if(!input.trim() || isLoading) return;
    
    setIsLoading(true);
    const userMsg = {role:"user", content:input, timestamp: new Date().toISOString()};
    setMessages(prev=>[...prev, userMsg]);
    setInput("");

    try {
      // Determine API base URL
      let API_BASE = process.env.REACT_APP_BACKEND_API_URL || 
        (window.location.hostname === "localhost" 
          ? "http://localhost:3001" 
          : "https://vscode-internal-8496-beta.beta01.cloud.kavia.ai:3001");

      const resp = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({question: userMsg.content})
      });

      if (!resp.ok) {
        let errMsg = `${resp.status} ${resp.statusText}`;
        try {
          const errData = await resp.json();
          if (errData?.detail) errMsg = errData.detail;
          else if (errData?.error?.message) errMsg = errData.error.message;
        } catch (_) {}
        throw new Error(`Backend error: ${errMsg}`);
      }

      const data = await resp.json();
      const replyText = data?.answer || "";

      setMessages(prev=>[...prev, {
        role: "assistant",
        content: replyText,
        timestamp: new Date().toISOString()
      }]);

    } catch (err) {
      setMessages(prev=>[...prev, {
        role: "assistant",
        content: `Sorry, I encountered an error: ${err.message}`,
        timestamp: new Date().toISOString(),
        error: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key submission
  const onInputKeyDown = e => {
    if(e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  // Header action handlers
  const handleReload = () => window.location.reload();
  const handleStop = () => {
    setMessages(prev => [...prev, {
      role: "assistant",
      content: "✋ AI response stopped",
      timestamp: new Date().toISOString(),
      error: true
    }]);
  };

  // Format timestamp
  const formatTime = iso => {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {hour:"2-digit", minute:"2-digit"});
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo-avatar">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="TestAssist AI">
                <circle cx="16" cy="16" r="14" fill="#1976d2" stroke="#ffd600" strokeWidth="2"/>
                <rect x="9" y="10" width="14" height="10" rx="5" fill="#ffd600"/>
                <circle cx="13" cy="15" r="1.5" fill="#1976d2"/>
                <circle cx="19" cy="15" r="1.5" fill="#1976d2"/>
                <rect x="14" y="18" width="4" height="1" rx="0.5" fill="#1976d2"/>
              </svg>
            </div>
            <div className="header-title">
              <h1>TestAssist AI</h1>
              <p>Your Testing Assistant</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="header-btn" onClick={handleReload} aria-label="Reload chat">
              <ReloadIcon size={18}/>
            </button>
            <button className="header-btn" onClick={handleStop} aria-label="Stop response">
              <StopIcon size={18}/>
            </button>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="chat-main">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="welcome-message">
              <h2>Welcome to TestAssist AI</h2>
              <p>I'm here to help you with all your testing questions. Ask me anything about application testing, test strategies, or quality assurance!</p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-row ${msg.role}`}>
              <div className={`message-bubble ${msg.role} ${msg.error ? 'error' : ''}`}>
                {msg.role === "assistant" && (
                  <div className="message-avatar">
                    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-label="AI">
                      <circle cx="16" cy="16" r="14" fill="#1976d2" stroke="#ffd600" strokeWidth="2"/>
                      <rect x="9" y="10" width="14" height="10" rx="5" fill="#ffd600"/>
                      <circle cx="13" cy="15" r="1.5" fill="#1976d2"/>
                      <circle cx="19" cy="15" r="1.5" fill="#1976d2"/>
                      <rect x="14" y="18" width="4" height="1" rx="0.5" fill="#1976d2"/>
                    </svg>
                  </div>
                )}
                <div className="message-content">
                  <div className="message-text">{msg.content}</div>
                  <div className="message-time">
                    {msg.role === "user" ? "You" : "AI"} • {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message-row assistant">
              <div className="message-bubble assistant">
                <div className="message-avatar">
                  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-label="AI">
                    <circle cx="16" cy="16" r="14" fill="#1976d2" stroke="#ffd600" strokeWidth="2"/>
                    <rect x="9" y="10" width="14" height="10" rx="5" fill="#ffd600"/>
                    <circle cx="13" cy="15" r="1.5" fill="#1976d2"/>
                    <circle cx="19" cy="15" r="1.5" fill="#1976d2"/>
                    <rect x="14" y="18" width="4" height="1" rx="0.5" fill="#1976d2"/>
                  </svg>
                </div>
                <div className="message-content">
                  <div className="message-text typing">
                    <span className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef}/>
        </div>
      </main>

      {/* Input Footer */}
      <footer className="input-footer">
        <div className="input-container">
          <form className="input-form" onSubmit={sendMessage}>
            <input
              ref={inputRef}
              className="message-input"
              type="text"
              placeholder="Type your message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onInputKeyDown}
              disabled={isLoading}
              maxLength={2000}
              aria-label="Type your message"
            />
            <button
              type="submit"
              className="send-button"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
            >
              <SendArrowIcon size={20}/>
            </button>
          </form>
          <div className="footer-text">
            Powered by TestAssist AI and Google Gemini
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
