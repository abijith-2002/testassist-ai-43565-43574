import React, { useEffect, useRef, useState } from "react";
import "./App.css";

// PUBLIC_INTERFACE
function App() {
  /**
   * The top-level chatbot app UI.
   * Layout: header bar, main chat, sidebar (history), input at the bottom.
   * Theme: modern, minimalistic, light. Colors from spec.
   */

  // States for chat logic
  const [messages, setMessages] = useState([]); // Array of {role: 'user' | 'assistant', content: string, timestamp: Date}
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]); // List of previous chat session summaries
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeHistoryId, setActiveHistoryId] = useState(null); // Current chat session/history ID
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Theme: Custom light, primary/accent/secondary, modern
  // The color palette is applied via style object and CSS variables for flexibility
  const COLORS = {
    primary: "#1976d2",
    secondary: "#455a64",
    accent: "#ffd600",
    background: "#fff",
    input: "#f7faff",
    messageUser: "#e3f2fd",
    messageBot: "#fffde7",
    border: "#e0e0e0"
  };

  // Reference for bottom scroll of chat
  const chatEndRef = useRef(null);

  // PUBLIC_INTERFACE
  useEffect(() => {
    // On mount: fetch existing chat history
    fetchChatHistory();
  }, []);

  // PUBLIC_INTERFACE
  useEffect(() => {
    // Scroll chat to latest message
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // PUBLIC_INTERFACE
  const fetchChatHistory = async () => {
    // REST API: /history (GET)
    setError("");
    try {
      const resp = await fetch("/api/history");
      if (!resp.ok) throw new Error("Failed to load chat history");
      const data = await resp.json();
      setChatHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    }
  };

  // PUBLIC_INTERFACE
  const fetchChatSession = async (historyId) => {
    // REST API: /history/{id} (GET)
    setError("");
    try {
      const resp = await fetch(`/api/history/${historyId}`);
      if (!resp.ok) throw new Error("Failed to load chat session");
      const data = await resp.json();
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setActiveHistoryId(historyId);
    } catch (err) {
      setError(err.message);
    }
  };

  // PUBLIC_INTERFACE
  const sendMessage = async (e) => {
    e && e.preventDefault();
    if (!input.trim() || isLoading) return;
    setError("");
    setIsLoading(true);

    // Add user message to chat
    const userMsg = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      // REST API: /chat (POST)
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          history_id: activeHistoryId,
        }),
      });
      if (!resp.ok) {
        throw new Error("Failed to get answer from Gemini");
      }
      const data = await resp.json();
      const botMsg = {
        role: "assistant",
        content: data.answer,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMsg]);
      if (data.history_id) setActiveHistoryId(data.history_id);

      // Refresh chat history (if session was created anew)
      fetchChatHistory();
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // PUBLIC_INTERFACE
  const startNewChat = () => {
    setMessages([]);
    setActiveHistoryId(null);
  };

  // PUBLIC_INTERFACE
  const handleSidebarToggle = () => setSidebarOpen((open) => !open);

  // PUBLIC_INTERFACE
  const handleHistoryClick = (historyId) => {
    setSidebarOpen(false);
    fetchChatSession(historyId);
  };

  // PUBLIC_INTERFACE
  const formatTime = (iso) => {
    // Simple time string for message
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  // Style objects for major components (modern/minimal, responsive)
  const styles = {
    layout: {
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      background: COLORS.background,
    },
    header: {
      height: 60,
      backgroundColor: COLORS.primary,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      padding: "0 1.5rem",
      fontSize: 22,
      fontWeight: 700,
      letterSpacing: "0.5px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      borderBottom: `2px solid ${COLORS.accent}`,
      justifyContent: "space-between"
    },
    mainArea: {
      flex: 1,
      display: "flex",
      minHeight: 0,
      background: COLORS.background,
    },
    sidebar: {
      width: sidebarOpen ? 260 : 0,
      background: COLORS.secondary,
      color: "#fff",
      overflowY: "auto",
      transition: "width 0.25s cubic-bezier(.4,0,.2,1)",
      boxShadow: sidebarOpen ? "2px 0 8px 0 #eee" : "none",
    },
    sidebarContent: {
      display: sidebarOpen ? "block" : "none",
      padding: "18px 10px",
      height: "100%",
    },
    chat: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      padding: "0",
      maxWidth: "100vw", // prevent overflow
      position: "relative",
      background: COLORS.background,
    },
    messages: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      overflowY: "auto",
      padding: "30px 0px 30px 0px",
    },
    messageRow: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      margin: "0 1.7rem"
    },
    messageBubbleUser: {
      alignSelf: "flex-end",
      background: COLORS.messageUser,
      borderRadius: "30px 5px 25px 30px",
      padding: "12px 20px",
      color: "#222",
      fontSize: 16,
      margin: "4px 0 2px 10vw",
      border: `1px solid ${COLORS.border}`,
      maxWidth: "59vw",
      wordBreak: "break-word"
    },
    messageBubbleBot: {
      alignSelf: "flex-start",
      background: COLORS.messageBot,
      borderRadius: "5px 25px 30px 30px",
      padding: "12px 20px",
      color: "#222",
      fontSize: 16,
      margin: "4px 10vw 2px 0",
      border: `1px solid ${COLORS.border}`,
      maxWidth: "59vw",
      wordBreak: "break-word"
    },
    messageTime: {
      fontSize: 11,
      color: "#888",
      marginTop: 2,
      marginLeft: 8,
      marginBottom: 2,
      fontWeight: 400,
    },
    inputArea: {
      borderTop: `1px solid ${COLORS.border}`,
      background: COLORS.input,
      display: "flex",
      alignItems: "center",
      padding: "0.7rem 1.2rem",
      minHeight: 70,
    },
    input: {
      flex: 1,
      fontSize: 16,
      background: "#fff",
      border: `1px solid ${COLORS.primary}22`,
      borderRadius: 8,
      padding: "12px 17px",
      outline: "none",
      transition: "border-color 0.2s",
      marginRight: 16,
      boxShadow: "none"
    },
    sendBtn: {
      border: "none",
      backgroundColor: COLORS.primary,
      color: "#fff",
      padding: "11px 28px",
      fontSize: "1rem",
      borderRadius: 7,
      cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
      fontWeight: 600,
      opacity: input.trim() && !isLoading ? 1 : 0.5,
      transition: "all 0.2s"
    },
    sidebarToggle: {
      fontSize: 22,
      color: "#fff",
      background: "none",
      border: "none",
      cursor: "pointer",
      marginRight: 12,
      display: "inline"
    },
    newChatBtn: {
      margin: "15px 0",
      display: "block",
      padding: "8px 22px",
      background: COLORS.accent,
      color: "#222",
      fontWeight: 700,
      border: "none",
      borderRadius: "17px",
      cursor: "pointer",
      fontSize: 15,
      letterSpacing: "0.2px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
    }
  };

  // Responsive tweak for mobile layout
  const isMobile = window.innerWidth < 650;

  return (
    <div style={styles.layout}>
      {/* Top app header */}
      <div style={styles.header}>
        <button
          onClick={handleSidebarToggle}
          style={{ ...styles.sidebarToggle, marginLeft: isMobile ? 2 : -3 }}
          aria-label="Toggle chat history"
        >{sidebarOpen ? "❮" : "☰"}</button>
        <span>
          <span style={{ fontWeight: 900, color: COLORS.accent }}>TestAssist</span>
          <span style={{ marginLeft: 8, fontWeight: 500, fontSize: 19 }}>
            GPT
          </span>
        </span>
        <span style={{ width: 44 }}></span>
      </div>

      {/* Main area: sidebar/history and chat window */}
      <div style={styles.mainArea}>
        {/* Sidebar: Chat history */}
        <nav style={styles.sidebar}>
          <div style={styles.sidebarContent}>
            <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#ffd600", letterSpacing: "0.12px" }}>
                Chat History
              </span>
              <button
                style={{
                  marginLeft: 8,
                  border: "none",
                  background: "none",
                  color: COLORS.accent,
                  cursor: "pointer",
                  fontSize: 21,
                  fontWeight: 700,
                }}
                onClick={handleSidebarToggle}
                aria-label="Close sidebar"
              >×</button>
            </div>
            <button style={styles.newChatBtn} onClick={startNewChat}>
              + New Chat
            </button>
            <div style={{
              borderTop: "1px solid #ffe",
              margin: "20px 0 10px 0"
            }}>&nbsp;</div>
            {chatHistory && chatHistory.length ?
              <ul style={{
                listStyle: "none", padding: 0, margin: 0, maxHeight: "60vh", overflowY: "auto"
              }}>
                {chatHistory.map(h => (
                  <li key={h.id}
                    onClick={() => handleHistoryClick(h.id)}
                    style={{
                      background: h.id === activeHistoryId ? COLORS.primary : "transparent",
                      color: h.id === activeHistoryId ? "#fff" : "#e0e0e0",
                      padding: "10px 10px",
                      margin: "7px 0",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontWeight: h.id === activeHistoryId ? 700 : 500,
                      boxShadow: h.id === activeHistoryId ? "0 2px 12px #25396310" : "none",
                    }}
                  >
                    <span style={{ display: "block", fontWeight: 900, fontSize: 15 }}>
                      {h.title || `Chat ${h.id.slice(-5)}`}
                    </span>
                    <span style={{ fontSize: 13, color: "#ffd600" }}>
                      {h.created_at ? (new Date(h.created_at).toLocaleString()) : ""}
                    </span>
                  </li>
                ))}
              </ul>
              : (
                <div style={{
                  color: "#aab8c2",
                  margin: "30px 0",
                  fontSize: 15,
                  textAlign: "left"
                }}>
                  <p>No chat history yet.<br />Start a new conversation!</p>
                </div>
              )
            }
          </div>
        </nav>

        {/* Chat panel */}
        <section style={styles.chat}>
          <div style={styles.messages} id="chat-messages">
            {/* Messages */}
            {messages && messages.length > 0 ? (
              messages.map((msg, idx) => (
                <div key={idx} style={styles.messageRow}>
                  <div
                    style={msg.role === "user" ? styles.messageBubbleUser : styles.messageBubbleBot}
                  >
                    {/* Render text, preserving line breaks */}
                    {msg.content.split("\n").map((line, i) =>
                      <span key={i}>{line}<br /></span>
                    )}
                  </div>
                  <div style={styles.messageTime}>
                    {(msg.role === "user" ? "You" : "Gemini")} &bull; {formatTime(msg.timestamp)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{
                margin: "50px 10px 10px 10px",
                color: "#999",
                fontSize: 17,
                textAlign: "center"
              }}>
                <p style={{ margin: 0 }}>
                  Need help with Application Testing? <br />
                  Just ask your question below!
                </p>
              </div>
            )}
            {/* Scroll anchor */}
            <div ref={chatEndRef} />
          </div>

          {/* Error/Loading */}
          {error &&
            <div style={{
              color: "#e53935",
              fontWeight: 600,
              padding: "7px 1.2rem",
              background: "#fff3f3",
              border: `1px solid #ffcdd2`,
              borderRadius: 9,
              margin: "10px 30px",
              fontSize: 15,
            }}>
              {error}
            </div>
          }
          {isLoading &&
            <div style={{
              color: COLORS.primary,
              padding: "3px 20px 0 20px",
              fontSize: 17,
              fontWeight: 500
            }}>
              <span role="status" aria-live="polite">Gemini is typing...</span>
            </div>
          }

          {/* Input bar */}
          <form
            style={styles.inputArea}
            autoComplete="off"
            onSubmit={sendMessage}
          >
            <input
              style={styles.input}
              aria-label="Message input"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a question about testing and press Enter…"
              disabled={isLoading}
              autoFocus
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  sendMessage(e);
                }
              }}
            />
            <button
              style={styles.sendBtn}
              type="submit"
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? "..." : "Send"}
            </button>
          </form>
        </section>
      </div>
      {/* Responsive style adjust */}
      <style>
        {`
        @media (max-width: 900px) {
          nav[style], section[style] { 
            max-width: 100vw !important;
          }
          nav[style] {
            width: ${sidebarOpen ? "70vw" : "0"} !important;
            min-width: 0 !important;
          }
        }
        @media (max-width: 650px) {
          nav[style], section[style] {
            width: 100vw !important;
            min-width: 0 !important;
            border-radius: 0 !important;
          }
          nav[style] {
            position: fixed !important;
            top: 60px;
            left: 0;
            height: calc(100vh - 60px);
            z-index: 99999;
            width: ${sidebarOpen ? "100vw" : "0"} !important;
            background: ${COLORS.secondary} !important;
          }
        }
        `}
      </style>
    </div>
  );
}

export default App;
