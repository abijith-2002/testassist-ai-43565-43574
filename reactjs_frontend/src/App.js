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

  /**
   * PUBLIC_INTERFACE
   * Send chat message to backend API, append user question and AI response to chat UI.
   * Robust error and loading handling.
   */
  const sendMessage = async e => {
    e && e.preventDefault();
    if(!input.trim() || isLoading) return;
    setIsLoading(true);
    setError("");
    // Add user message optimistically
    const userMsg = {role:"user", content:input, timestamp: new Date().toISOString()};
    setMessages(prev=>[...prev, userMsg]);
    setInput("");

    try {
      // POST to FastAPI backend (assume on same host, adjust as needed)
      const resp = await fetch('/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({message: userMsg.content})
      });

      if (!resp.ok) {
        // Try to parse error from backend, fallback to status
        let err = `${resp.status} ${resp.statusText}`;
        try {
          const data = await resp.json();
          err = data.detail || JSON.stringify(data);
        } catch {}
        throw new Error(`Backend error: ${err}`);
      }

      // Get backend reply (assume: {reply: str})
      const data = await resp.json();
      const assistantMsg = {
        role: "assistant",
        content: data.reply || (data.content ?? "[No reply returned]"),
        timestamp: new Date().toISOString(),
      };
      setMessages(prev=>[...prev, assistantMsg]);
    } catch (err) {
      setError("Sorry, failed to fetch AI response. " + (err?.message || ""));
    } finally {
      setIsLoading(false);
    }
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
          {/* Monochromatic logo avatar SVG */}
          <span className="avatar" aria-label="Logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="TestAssist logo" role="img">
              <circle cx="14" cy="14" r="13" stroke="#3F6E8D" strokeWidth="2.2" fill="#203947"/>
              <path d="M11.6 21c.19-2.2.36-4.46.96-7.37.11-.54.73-.81 1.2-.53 2.09 1.21 3.82.69 5.1-1.26.51-.8.7-1.53.77-2.3.05-.57-.54-.99-1.06-.73-1.66.87-3.04 1.34-4.5 1.34S9.8 9.98 8.14 9.12c-.52-.26-1.11.16-1.06.73a6.48 6.48 0 0 0 .77 2.3c1.28 1.95 3.01 2.47 5.1 1.26a.89.89 0 0 1 1.2.53c.6 2.91.77 5.17.96 7.37" fill="#3F6E8D"/>
              <circle cx="10.5" cy="10.5" r="1.3" fill="#BCC6D0"/>
              <circle cx="17.5" cy="10.5" r="1.3" fill="#BCC6D0"/>
            </svg>
          </span>
          <span className="titlebox">
            <span className="ai-title">TestAssist</span>
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
          {/* No empty-state help text to display */}
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
                  <span className="bubble-avatar assistant" aria-label="AI logo">
                    <svg width="20" height="20" viewBox="0 0 28 28" fill="none" aria-label="TestAssist logo" role="img">
                      <circle cx="14" cy="14" r="13" stroke="#3F6E8D" strokeWidth="2.2" fill="#203947"/>
                      <path d="M11.6 21c.19-2.2.36-4.46.96-7.37.11-.54.73-.81 1.2-.53 2.09 1.21 3.82.69 5.1-1.26.51-.8.7-1.53.77-2.3.05-.57-.54-.99-1.06-.73-1.66.87-3.04 1.34-4.5 1.34S9.8 9.98 8.14 9.12c-.52-.26-1.11.16-1.06.73a6.48 6.48 0 0 0 .77 2.3c1.28 1.95 3.01 2.47 5.1 1.26a.89.89 0 0 1 1.2.53c.6 2.91.77 5.17.96 7.37" fill="#3F6E8D"/>
                      <circle cx="10.5" cy="10.5" r="1.3" fill="#BCC6D0"/>
                      <circle cx="17.5" cy="10.5" r="1.3" fill="#BCC6D0"/>
                    </svg>
                  </span>
                )}
                <span className="bubble-txt">{msg.content}</span>
              </div>
              {/* Optionally show time and sender */}
              <span style={{
                fontSize:"0.92rem",
                color: "#2F4858", marginLeft: msg.role==="user"?"14px":"7px",
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
          background:"#8DB58022", 
          color:"#2F4858", 
          border:"1.2px solid #8DB580", 
          margin:"9px auto 0 auto", 
          padding:"8px 20px", 
          borderRadius:"13px", 
          maxWidth:"420px",
          fontWeight:600, 
          textAlign:"center"
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
          Answers are powered by TestAssist AI and Google Gemini.
        </span>
      </footer>
    </div>
  );
}

export default App;
