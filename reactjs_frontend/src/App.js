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
      // Determine base URL: Use environment variable or fallback.
      // Default to Kavia cloud backend per requirements.
      // - Priority: REACT_APP_BACKEND_API_URL (env) -> default cloud URL -> localhost (for local dev).
      let API_BASE =
        process.env.REACT_APP_BACKEND_API_URL
        || (window.location.hostname === "localhost"
          ? "http://localhost:3001"
          : "https://vscode-internal-0867-beta.beta01.cloud.kavia.ai:3001"
        );

      let resp;
      try {
        resp = await fetch(`${API_BASE}/chat`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({question: userMsg.content})
        });
      } catch (err) {
        // Network or CORS error
        throw new Error(`Could not reach backend server at ${API_BASE}/chat. ${err?.message || ""}`);
      }

      // Surface ALL error responses, including 404s, with details if present
      if (!resp.ok) {
        let errMsg = `${resp.status} ${resp.statusText}`;
        try {
          // Try JSON error payloads: FastAPI {"detail": ...}, Gemini {"error": ...}, or custom
          const errData = await resp.json();
          if (errData && typeof errData === "object") {
            if (errData.detail) errMsg = errData.detail;
            else if (errData.error && errData.error.message) errMsg = errData.error.message;
            else if (errData.error) errMsg = JSON.stringify(errData.error);
            else errMsg = JSON.stringify(errData);
          }
        } catch (_) {
          // Not JSON, use statusText
        }
        // Surface all errors (including 404) to chat UI clearly
        throw new Error(`[Backend error] ${errMsg} (code ${resp.status})`);
      }

      // Get backend reply (expecting { answer: str, from_gemini: bool, ... })
      let data;
      try {
        data = await resp.json();
      } catch (_) {
        data = {};
      }
      // The UI should always display Gemini's reply if present, never fallback to generic message
      // Prefer: If 'answer' exists and is non-empty, display it, else show empty string (not "[No reply returned]")
      let replyText = "";
      if (data && typeof data.answer !== "undefined" && data.answer !== null) {
        if (typeof data.answer === "string" && data.answer.trim().length > 0) {
          replyText = data.answer;
        } else if (typeof data.answer === "string") {
          replyText = ""; // empty string for empty answer
        } else {
          replyText = String(data.answer);
        }
      }

      const assistantMsg = {
        role: "assistant",
        content: replyText,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev=>[...prev, assistantMsg]);
    } catch (err) {
      // Show any fetch/backend errors (including 404/5xx) to user
      setError(
        "Sorry, failed to fetch AI response. " +
        (err?.message
          ? err.message.replace(/^Error:/, '').trim()
          : String(err)
        )
      );
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
          <span className="avatar" aria-label="AI Assistant">
            {/* New modern monochrome AI SVG logo */}
            <svg width="28" height="28" viewBox="0 0 28 28" aria-label="AI Monochrome Icon" fill="none" role="img">
              <circle cx="14" cy="14" r="12.5" fill="#212a34" stroke="#90caf9" strokeWidth="2"/>
              <rect x="8" y="8.8" width="12" height="8.4" rx="4.2" fill="#90caf9"/>
              <circle cx="12.75" cy="13" r="1.25" fill="#212a34"/>
              <circle cx="15.25" cy="13" r="1.25" fill="#212a34"/>
              <rect x="12.2" y="16.05" width="3.6" height="0.8" rx="0.4" fill="#212a34" />
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
          {messages.map((msg, idx) => {
            // Determine chat bubble classes/logic
            let showAvatar = msg.role === "assistant" || msg.role === "error";
            let isError = msg.role === "error";
            let bubbleProps = {};
            if (isError) {
              // always align left like assistant
              bubbleProps.style = { background: "#E3879E", color: "#fff" };
            }
            return (
              <div
                key={idx}
                className={`chat-bubble-row ${msg.role}${isError ? " error-bubble-row" : ""}`}
                style={{
                  justifyContent:
                    msg.role === "user"
                      ? "flex-end"
                      : "flex-start"
                }}
              >
                <div
                  className={`chat-bubble ${msg.role}${isError ? " error" : ""}`}
                  {...bubbleProps}
                >
                  {/* Avatar for assistant and error chats */}
                  {showAvatar && (
                    <span className={`bubble-avatar ${msg.role}`} aria-label={isError ? "Error" : "AI logo"}>
                      {/* New modern monochrome AI SVG (reused for bot and error) */}
                      <svg width="20" height="20" viewBox="0 0 28 28" aria-label={isError ? "Error" : "AI Monochrome Icon"} fill="none" role="img">
                        <circle cx="14" cy="14" r="12.5" fill="#212a34" stroke="#90caf9" strokeWidth="2"/>
                        <rect x="8" y="8.8" width="12" height="8.4" rx="4.2" fill="#90caf9"/>
                        <circle cx="12.75" cy="13" r="1.25" fill="#212a34"/>
                        <circle cx="15.25" cy="13" r="1.25" fill="#212a34"/>
                        <rect x="12.2" y="16.05" width="3.6" height="0.8" rx="0.4" fill="#212a34" />
                      </svg>
                    </span>
                  )}
                  <span className="bubble-txt">{msg.content}</span>
                </div>
                {/* Timestamp below bubble, aligned differently by role */}
                <span
                  className={
                    msg.role === "user"
                      ? "chat-bubble-timestamp chat-bubble-timestamp-right"
                      : "chat-bubble-timestamp chat-bubble-timestamp-left"
                  }
                >
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            );
          })}
          <div ref={chatEndRef}/>
        </div>
      </main>

      {/* Error state */}
      {error && (() => {
        // Push error into chat bubbles as an "error" message
        setMessages(prev => [
          ...prev,
          {
            role: "error",
            content: error,
            timestamp: new Date().toISOString(),
          }
        ]);
        setError("");
        return null;
      })()}

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
