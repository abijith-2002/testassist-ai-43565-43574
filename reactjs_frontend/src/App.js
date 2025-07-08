import React, { useRef, useState, useEffect } from "react";
import "./ChatPage.css";

// SVG icon components for header and send button (inline for no deps)
const ReloadIcon = ({size=20}) => (
  <svg width={size} height={size} fill="none" aria-label="Reload" viewBox="0 0 20 20" role="img">
    <path d="M16.98 10.59A7 7 0 1 1 10 3V1.1a.85.85 0 0 1 1.3-.7l3.14 2.13a.85.85 0 0 1 0 1.4l-3.14 2.14A.85.85 0 0 1 10 5.36V3a6 6 0 1 0 5.31 8.76" stroke="#3F6E8D" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);
const StopIcon = ({size=20}) => (
  <svg width={size} height={size} viewBox="0 0 20 20" aria-label="Stop" role="img">
    <rect x="5" y="5" width="10" height="10" rx="3" fill="#3F6E8D"/>
  </svg>
);
const SendArrowIcon = ({size=26}) => (
  <svg width={size} height={size} viewBox="0 0 26 26" fill="none" aria-label="Send" role="img">
    <path d="M3 22.5L24 13L3 3.5V10.75L17 13L3 15.25V22.5Z" fill="#FFF"/>
  </svg>
);

// PUBLIC_INTERFACE
function App() {
  /**
   * Redesigned AI chat UI per design notes: header, chat, and input/footer.
   */
  // Chat logic
  const [messages, setMessages] = useState([
    // Example: {role: 'assistant', content:'Hello! How can I assist you today?', timestamp: new Date().toISOString()},
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);

  // PUBLIC_INTERFACE: Scroll to latest message
  useEffect(() => { if(chatEndRef.current) chatEndRef.current.scrollIntoView({behavior:"smooth"}); }, [messages]);

  // Simulate send (for demo), integration logic would call backend
  // PUBLIC_INTERFACE
  const sendMessage = async e => {
    e && e.preventDefault();
    if(!input.trim() || isLoading) return;
    setIsLoading(true);
    setError("");
    // Push user message
    const userMsg = {role:"user", content:input, timestamp: new Date().toISOString()};
    setMessages(prev=>[...prev, userMsg]);
    setInput("");
    // Simulate backend response delay
    setTimeout(() => {
      const aiResp = [
        "I'm your AI assistant! Ask me anything about software testing.",
        "That's an interesting question. Can you share more details?"
      ];
      setMessages(prev=>[...prev,
        {role:"assistant", content:aiResp[Math.floor(Math.random()*aiResp.length)], timestamp: new Date().toISOString()}
      ]);
      setIsLoading(false);
    }, 1000);
  };

  // Keydown handler: submit on Enter w/o Shift
  const onInputKeyDown = e=>{
    if(e.key==="Enter" && !e.shiftKey){
      e.preventDefault();
      sendMessage(e);
    }
  };

  // Header action handlers (demo stub)
  const handleReload = ()=>window.location.reload();
  const handleStop = ()=>setError("✋ AI stopped (demo)");

  // Focus effect
  const inputRef = useRef(null);

  // Format time am/pm
  const formatTime = iso=>{
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"});
  };

  return (
    <div className="chatpage-root">
      {/* Header */}
      <header className="header-bar">
        <div className="header-left">
          <span className="avatar" aria-label="Assistant">🤖</span>
          <span className="titlebox">
            <span className="ai-title">AI Assistant</span>
            <span className="ai-sub">Always here to help</span>
          </span>
        </div>
        <div className="header-actions">
          <button className="header-icon-btn" tabIndex={0} onClick={handleReload} aria-label="Reload chat">
            <ReloadIcon size={19}/>
          </button>
          <button className="header-icon-btn" tabIndex={0} onClick={handleStop} aria-label="Stop response">
            <StopIcon size={19}/>
          </button>
        </div>
      </header>

      {/* Main chat area */}
      <main className="main-chat-section">
        <div className="chat-content-list" id="chat-messages">
          {messages.length === 0 && (
            <div style={{
              color:"var(--muted-text)",textAlign:"center",margin:"20% 0 0 0",
              fontSize:"1.11rem",fontWeight:400
            }}>
              <p>
                Need help with Application Testing?
                <br/>
                Just ask your question below!
              </p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`chat-bubble-row ${msg.role}`}
              style={{justifyContent: msg.role==="user"?"flex-end":"flex-start"}}
            >
              <div
                className={`chat-bubble ${msg.role}`}
              >
                {/* Avatar for assistant bubble only */}
                {msg.role==="assistant" && (
                  <span className="bubble-avatar assistant" aria-label="AI avatar">🤖</span>
                )}
                <span className="bubble-txt">{msg.content}</span>
              </div>
              {/* Optionally show time and sender */}
              <span style={{
                fontSize:"0.92rem",
                color: "var(--muted-text)", marginLeft: msg.role==="user"?"14px":"7px",
                marginTop: "1.1em", fontWeight:400,
                alignSelf:"flex-end"
              }}>
                {(msg.role==="user"?"You":"AI")}&nbsp;•&nbsp;{formatTime(msg.timestamp)}
              </span>
            </div>
          ))}
          <div ref={chatEndRef}/>
        </div>
      </main>

      {/* Error state */}
      {error && (
        <div style={{
          background:"#7e2e2e12", color:"#e55", border:"1.2px solid #bb3333",
          margin:"9px auto 0 auto", padding:"8px 20px", borderRadius:"13px", maxWidth:"420px",
          fontWeight:600, textAlign:"center"
        }}>{error}</div>
      )}

      {/* Input bar and footer note */}
      <footer className="input-footer-bar">
        <form className="input-bar-wrap" onSubmit={sendMessage} autoComplete="off" spellCheck={true}>
          <input
            className="chat-input-main"
            ref={inputRef}
            type="text"
            aria-label="Type your message"
            placeholder="Type your message…"
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={onInputKeyDown}
            disabled={isLoading}
            maxLength={1024}
          />
          <button
            className="send-btn"
            type="submit"
            aria-label="Send"
            disabled={!input.trim()||isLoading}
            tabIndex={0}
          >
            <SendArrowIcon size={26}/>
          </button>
        </form>
        <span className="footer-disclaimer">
          AI responses are simulated for demonstration purposes.
        </span>
      </footer>
    </div>
  );
}

export default App;
