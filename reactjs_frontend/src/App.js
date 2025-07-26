import React, { useRef, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "./ChatPage.css";
import LoadingSpinner from "./LoadingSpinner";

// SVG icon components for send button (inline for no deps)
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
  useEffect(() => { if(chatEndRef.current) chatEndRef.current.scrollIntoView({behavior:"smooth"}); }, [messages, isLoading, error]);

  /**
   * PUBLIC_INTERFACE
   * Send chat message to backend API, append user question and AI response to chat UI.
   * Robust error and loading handling.
   */
  // PUBLIC_INTERFACE: Stream AI response word-by-word/chunk-by-chunk as it arrives
  const sendMessage = async e => {
    e && e.preventDefault();
    if (!input.trim() || isLoading) return;
    setIsLoading(true);
    setError("");
    const userMsg = { role: "user", content: input, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    try {
      let API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:3001";

      let resp;
      try {
        resp = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: userMsg.content })
        });
      } catch (err) {
        throw new Error(`Could not reach backend server at ${API_BASE}/chat. ${err?.message || ""}`);
      }

      // Handle error responses (including non-JSON)
      if (!resp.ok) {
        let errMsg = `${resp.status} ${resp.statusText}`;
        try {
          const errData = await resp.json();
          if (errData && typeof errData === "object") {
            if (errData.detail) errMsg = errData.detail;
            else if (errData.error && errData.error.message) errMsg = errData.error.message;
            else if (errData.error) errMsg = JSON.stringify(errData.error);
            else errMsg = JSON.stringify(errData);
          }
        } catch (_) { /* not JSON, keep statusText */ }
        throw new Error(`[Backend error] ${errMsg} (code ${resp.status})`);
      }

      // Check if streaming is supported (NDJSON or raw text/lines)
      if (resp.body && window.ReadableStream && resp.headers.get("content-type") && resp.headers.get("content-type").includes("text/event-stream")) {
        // (If backend is using event-stream, handle accordingly here. Currently not expected.)
        throw new Error("Streaming via EventSource not implemented yet.");
      } else if (resp.body && window.ReadableStream) {
        // Streaming, e.g. backend sends lines/chunks (JSON/text), use TextDecoder
        const reader = resp.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let partial = "";
        let isFirstChunk = true;
        let readDone = false;
        let aiMsgSoFar = "";
        // Add assistant message in "streaming" mode (content built-up)
        let assistantMsg = {
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
          // Use a key to ensure React renders this as partial
        };
        setMessages(prev => [...prev, assistantMsg]);
        // Function to update only the last assistant message as streaming
        const updateStreamingAssistant = (partialContent) => {
          setMessages(prev => {
            // Find last assistant message (must have just been appended above)
            let lastIdx = prev.length - 1;
            return prev.map((msg, idx) =>
              (idx === lastIdx && msg.role === "assistant")
                ? { ...msg, content: partialContent }
                : msg
            );
          });
        };
        // Read chunks
        while (!readDone) {
          const { value, done } = await reader.read();
          readDone = done;
          if (value) {
            // Append chunk (UTF-8 decode)
            let chunk = decoder.decode(value, { stream: !done });
            aiMsgSoFar += chunk;
            // Optionally process chunk for markdown (do not finalize yet)
            updateStreamingAssistant(aiMsgSoFar);
          }
        }
        // Final update (render full content as finished)
        updateStreamingAssistant(aiMsgSoFar);
      } else {
        // Fallback: Not a streaming body, treat as ordinary JSON { answer: ... }
        let data;
        try {
          data = await resp.json();
        } catch {
          data = {};
        }
        let replyText = "";
        if (data && typeof data.answer !== "undefined" && data.answer !== null) {
          if (typeof data.answer === "string" && data.answer.trim().length > 0) {
            replyText = data.answer;
          } else if (typeof data.answer === "string") {
            replyText = "";
          } else {
            replyText = String(data.answer);
          }
        }
        const assistantMsg = {
          role: "assistant",
          content: replyText,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (err) {
      setError(
        "Sorry, failed to fetch AI response. " +
        (err?.message
          ? err.message.replace(/^Error:/, '').trim()
          : String(err)
        )
      );
      // Remove the "streaming" assistant message if process aborted
      setMessages(prev => (
        prev.length > 0 && prev[prev.length - 1]?.role === "assistant" && !prev[prev.length - 1]?.content
          ? prev.slice(0, -1)
          : prev
      ));
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
          {/* Professional minimal chat bubble SVG avatar */}
          <span className="avatar" aria-label="AI Assistant">
            {/* Modern chat bubble SVG */}
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-label="AI Chat Icon" role="img">
              <rect width="32" height="32" rx="16" fill="#1976D2"/>
              <path d="M9 13C9 11.3431 10.3431 10 12 10H20C21.6569 10 23 11.3431 23 13V17C23 18.6569 21.6569 20 20 20H14.5L11 23.5V20H12C10.3431 20 9 18.6569 9 17V13Z" fill="white"/>
              <circle cx="14.5" cy="15" r="1.2" fill="#1976D2"/>
              <circle cx="17.5" cy="15" r="1.2" fill="#1976D2"/>
            </svg>
          </span>
          <span className="titlebox">
            <span className="ai-title">Knowledge Bot</span>
          </span>
        </div>
      </header>

      {/* Main chat area */}
      <main className="main-chat-section">
        <div className="chat-content-list" id="chat-messages">
          {/* Messages */}
          {messages.map((msg, idx) =>
            msg.role === "assistant" ? (
              <div
                key={idx}
                className="assistant-fullwidth-message"
              >
                {/* AI response rendered as markdown, styled, with code and GFM support */}
                <div className="assistant-content-direct">
                  <ReactMarkdown
                    children={msg.content}
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    linkTarget="_blank"
                    components={{
                      a: ({node, ...props}) => <a {...props} rel="noopener noreferrer" target="_blank"/>,
                    }}
                  />
                </div>
                {/* No line/divider or timestamp for AI */}
              </div>
            ) : (
              <div
                key={idx}
                className="chat-message-container user"
              >
                <div className="chat-bubble-wrapper user">
                  <div className="chat-bubble user">
                    <span className="bubble-txt">{msg.content}</span>
                  </div>
                </div>
                {/* No timestamp for user either */}
              </div>
            )
          )}
          {/* AI loading state as fullwidth direct message */}
          {isLoading && (
            <div className="assistant-fullwidth-message">
              <div className="assistant-content-direct">
                <LoadingSpinner size={30} />&nbsp;AI is typing...
              </div>
              {/* No timestamp */}
            </div>
          )}
          {/* AI error as fullwidth direct message */}
          {error && (
            <div className="assistant-fullwidth-message">
              <div className="assistant-content-direct error">{error}</div>
              {/* No timestamp */}
            </div>
          )}
          <div ref={chatEndRef}/>
        </div>
      </main>

      {/* Floating input box within chat interface */}
      <div className="floating-input-container">
        <form className="floating-input-form" onSubmit={sendMessage} autoComplete="off" spellCheck={true}>
          <input
            className="floating-chat-input"
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
            className="floating-send-btn"
            type="submit"
            aria-label="Send"
            disabled={!input.trim()||isLoading}
            tabIndex={0}
          >
            <SendArrowIcon size={26}/>
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
