import React, { useRef, useState, useEffect } from "react";
import ChatMessageList from "./components/Chat/ChatMessageList";
import LoadingSpinner from "./LoadingSpinner";
import "./ChatPage.css";
import "./components/Chat/Chat.css";
import './App.css';

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
  /**
   * Handles sending of user question and receiving assistant response (including markdown/code).
   * 
   * - Prevents sending if assistant is still streaming (avoids lost context in backend RAG).
   * - After streaming, always finalizes the assistant message without "streaming" property
   *   so that the full AI response—including all markdown/code—is included in backend chat context.
   */
  const sendMessage = async e => {
    e && e.preventDefault();
    if (!input.trim() || isLoading) return;
    setIsLoading(true);
    setError("");
    const userMsg = { role: "user", content: input, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    // NEW: Prevent user from sending another message if assistant reply is not finished streaming
    if (messages.length > 0 && messages[messages.length-1].role === "assistant" && messages[messages.length-1].streaming) {
      setError("Please wait for the assistant to finish replying before sending your next question.");
      setIsLoading(false);
      return;
    }

    try {
      let API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:3001";

      let resp;
      try {
        // Send the entire chat history for context-based RAG logic.
        // Ensure ALL assistant messages (including markdown/code blocks) are included as-is;
        // Only finalized (non-streaming) messages are included for reliable LLM/RAG grounding.
        // If an assistant streaming message still exists, it's a bug—prevent double submit above.

        // ---- Robust Dev Logging: Show full outgoing chat history (user and assistant) for debug ----
        // TOGGLE this variable to true for detailed POST payload inspection in console
        const DEV_HISTORY_DEBUG = true;

        // --- CHAT SERIALIZATION DEBUGGING PATCH (2024-07) ---
        // 1. Validate that ALL assistant messages in `messages` retain:
        //    - Multiline content (preserve all newlines)
        //    - Embedded markdown codeblocks (full ``` sections)
        //    - No accidental truncation, HTML/React markdown stripping, or serialization loss
        // 2. Log exact outgoing array and show warning for any problem before dispatch to backend.

        const cleanHistory = [
          ...messages
            .filter(m => !m.streaming)
            .map(({ role, content }, idx) => {
                // Additional assistant/debug validation
                if (DEV_HISTORY_DEBUG && role === "assistant") {
                  // Detect full markdown code blocks and preserve warning info
                  const codeFenceCount = content && (content.match(/```/g) || []).length || 0;
                  const hasFullCodeBlock = codeFenceCount >= 2; // well-formed markdown should have 2 or more fences for at least 1 block
                  const hasInlineCode = content && content.includes("`");
                  const hasNewlines = content && content.includes("\n");
                  // Heuristic for truncation: never ends with incomplete fence & not empty
                  const trimmed = content && typeof content === "string" ? content.trim() : "";
                  let endsWithBacktick = trimmed.endsWith("`");
                  // Truncation detection: markdown block code, but ends with just one/few backticks (not trio)
                  let likelyTruncated = false;
                  if (typeof content === "string") {
                    // If markdown block begins but does not end, or last code fence is incomplete
                    const lastFencePos = content.lastIndexOf("```");
                    if (lastFencePos !== -1) {
                      const afterLastFence = content.slice(lastFencePos + 3);
                      if (afterLastFence.length > 0 && !afterLastFence.includes("\n")) { // Could be a truncated trailing fence
                        likelyTruncated = true;
                      }
                    } else if (endsWithBacktick && !trimmed.endsWith("```")) {
                      likelyTruncated = true;
                    }
                  }

                  if ((!hasFullCodeBlock && !hasNewlines && trimmed.length > 46) || likelyTruncated) {
                    console.warn(`[chat debug] WARNING: Assistant message ${idx} serialization issue: code/markdown block may be incomplete, missing newlines, or truncated!`,
                      { content, codeFenceCount, likelyTruncated });
                  }
                }
                return {
                  role,
                  content
                };
            }),
          { role: "user", content: userMsg.content }
        ];

        // Print out post-serialization history in order for developer/QA debug
        if (DEV_HISTORY_DEBUG) {
          const hasMissingBlock = cleanHistory.some(
            msg =>
              msg.role === "assistant" &&
              typeof msg.content === "string" &&
              (!(msg.content.includes("```") || msg.content.includes("\n")) && msg.content.length > 24)
          );
          if (hasMissingBlock) {
            console.warn(
              "[chat debug] SERIOUS: Outgoing chat history contains at least one assistant message that does NOT have visible code/markdown blocks or multiline text. This may indicate STRIPPING, TRUNCATION, or SERIALIZATION bugs before the backend call. Inspect below payload closely!"
            );
          } else {
            console.log("[chat debug] Outgoing chat history payload (in API order):");
          }
          cleanHistory.forEach((msg, idx) => {
            if (msg.role === "assistant" && typeof msg.content === "string" && (msg.content.includes("```") || msg.content.includes("\n"))) {
              // Normalize code regions for readability
              const blockInfo =
                msg.content.includes("```") ? "[contains code block]" : "[markdown/multiline]";
              // Show just a summary for long content
              console.log(
                `#${idx} [A]`, blockInfo,
                msg.content.length > 140
                  ? msg.content.slice(0, 120) + " (...)"
                  : msg.content
              );
            } else if (msg.role === "assistant") {
              console.log(
                `#${idx} [A] (NO code/multiline detected, check for strip/loss/truncate!):`,
                msg.content && msg.content.length > 140 ? msg.content.slice(0,120)+" (...)" : msg.content
              );
            } else if (msg.role === "user") {
              console.log(
                `#${idx} [U]`,
                msg.content && msg.content.length > 140 ? msg.content.slice(0,120)+" (...)" : msg.content
              );
            }
          });
          // Also print the actual POST payload to backend for inspection
          console.log(
            "[chat debug] Full serialized POST body (will be sent to backend):",
            JSON.stringify({history: cleanHistory}, null, 2)
          );
        }

        resp = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            history: cleanHistory
          })
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

      // Handle backend streaming JSON scenario (NDJSON or text lines with JSON objects with 'answer').
      // Note: For this requirement, we expect the backend to send a single JSON with an 'answer' field, or stream JSON with 'answer' (our focus is to stream/render its characters)
      let usedStreaming = false;
      if (resp.body && window.ReadableStream) {
        // Try to stream
        const reader = resp.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let done = false;
        let parsedAnswer = "";
        let displayedContent = "";

        // UI: Append a new assistant message that will stream the answer (character-by-character)
        const timestamp = new Date().toISOString();
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: "",
            timestamp,
            streaming: true
          }
        ]);
        let lastContent = "";

        // Function to update only the latest assistant message with the new content
        const updateStreamingAssistant = (partialContent) => {
          setMessages(prev => {
            // Find last assistant message with streaming:true or just appended
            let lastIdx = prev.length - 1;
            return prev.map((msg, idx) =>
              (idx === lastIdx && msg.role === "assistant")
                ? { ...msg, content: partialContent }
                : msg
            );
          });
        };

        // Try to detect response as a full JSON (single chunk) or NDJSON (line by line) or plain text.
        // Read until at least one '{' and one '}' are seen and parse JSON for 'answer'.
        while (!done) {
          const { value, done: localDone } = await reader.read();
          done = localDone;
          if (value) {
            buffer += decoder.decode(value, { stream: !localDone });
            // Try to parse JSON object in buffer
            try {
              // Look for the first complete valid JSON object (handle both streaming and non-streaming)
              // If buffer starts with whitespace or blank lines, skip
              const jsonStart = buffer.indexOf("{");
              const jsonEnd = buffer.indexOf("}", jsonStart);
              if (jsonStart !== -1 && jsonEnd !== -1) {
                // Extract the first JSON object substring
                const jsonStr = buffer.substring(jsonStart, jsonEnd + 1);
                const data = JSON.parse(jsonStr);
                if (typeof data.answer === "string") {
                  parsedAnswer = data.answer;
                  // Stream multiple characters at a time (fast effect)
                  const charsPerTick = 5; // 4–6 chars for much faster effect
                  const msInterval = 3;   // 2–3 ms for nearly instant animation
                  for (let i = charsPerTick; i <= parsedAnswer.length; i += charsPerTick) {
                    let toDisplay = parsedAnswer.substring(0, i);
                    if (toDisplay !== lastContent) {
                      updateStreamingAssistant(toDisplay);
                      lastContent = toDisplay;
                      // eslint-disable-next-line no-loop-func
                      await new Promise(resolve => setTimeout(resolve, msInterval));
                    }
                  }
                  // In case length wasn't divisible by charsPerTick, show final
                  if (lastContent !== parsedAnswer) updateStreamingAssistant(parsedAnswer);
                } else {
                  // No 'answer' string; render empty string
                  updateStreamingAssistant("");
                }
                usedStreaming = true;
                break; // Only render the first JSON with answer (rest of buffer, if any, will be ignored)
              }
            } catch (err) {
              // Ignore parsing error: not enough buffer, keep reading more chunks.
            }
          }
        }

        // If done (EOF) and no answer was parsed, fallback to "full" non-stream path
        if (!usedStreaming) {
          // If the backend did not stream JSON, but only normal text, show as a full message (fallback parse)
          let fallbackData;
          try {
            fallbackData = JSON.parse(buffer);
          } catch {
            fallbackData = {};
          }
          let replyText = "";
          if (fallbackData && typeof fallbackData.answer === "string" && fallbackData.answer.trim().length > 0) {
            replyText = fallbackData.answer;
          }
          updateStreamingAssistant(replyText || "");
        }

        // --- Finalize streaming message so that history[] always contains the full rendered markdown/code ---
        setMessages(prev => {
          // find last assistant streaming message and mark as finalized, copying its content as-is.
          let lastIdx = prev.length - 1;
          if (
            prev.length > 0 &&
            prev[lastIdx].role === "assistant" &&
            prev[lastIdx].streaming
          ) {
            // Remove 'streaming' property and keep complete content
            return prev.map((msg, idx) =>
              idx === lastIdx
                ? { ...msg, streaming: undefined } // Remove streaming flag
                : msg
            );
          }
          return prev;
        });

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
        // Render the answer all at once as markdown (no raw JSON shown)
        const assistantMsg = {
          role: "assistant",
          content: replyText,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (err) {
      // Detect Gemini API not configured error and show custom user-friendly message
      let userFriendlyError = "";
      const errorMessage = err?.message || "";
      // Heuristic match for various Gemini or API key configuration error scenarios
      if (
        /gemini api.*not\s*configured/i.test(errorMessage) ||
        /api key.*not\s*configured/i.test(errorMessage) ||
        /api.*key.*missing/i.test(errorMessage) ||
        /NO_GEMINI_API_KEY/i.test(errorMessage) ||
        /Please set.*GEMINI/i.test(errorMessage) ||
        /google.*gemini.*api.*key.*unconfigured/i.test(errorMessage)
      ) {
        userFriendlyError = "Gemini API key is not configured. Please contact your administrator.";
      } else {
        userFriendlyError =
          "Sorry, failed to fetch AI response. " +
          (errorMessage
            ? errorMessage.replace(/^Error:/, "").trim()
            : String(err)
          );
      }
      setError(userFriendlyError);
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

  // PUBLIC_INTERFACE: Handle message editing (composed - now supports edit+regen chain)
  /**
   * Updates a user message at the specified index with new content, optionally
   * triggers re-generation after update (atomically, prevents async out-of-order bugs).
   * @param {number} messageIndex - Index of the message to edit
   * @param {string} newContent - New content for the message
   * @param {object} [opts] - Optional params. Pass {doRegenerate: true} to chain regenerate.
   */
  const handleEditMessage = (messageIndex, newContent, opts = {}) => {
    // Always allow atomic update-and-regen for prompt editing saves.
    // Do not require content to be different; every "save" triggers regen from backend.
    if (opts.doRegenerate) {
      setMessages(prev => {
        // Update user message at the given index, discard all messages after.
        const updatedMsgs = prev
          .slice(0, messageIndex + 1)
          .map((msg, idx) =>
            idx === messageIndex ? { ...msg, content: newContent } : msg
          );
        // Remove any assistant response immediately following the edited user message (if any).
        // This ensures every edit+save triggers a full regeneration.
        setTimeout(() => {
          handleRegenerateResponse(messageIndex, updatedMsgs);
        }, 0);
        return updatedMsgs;
      });
    } else {
      setMessages(prev =>
        prev.map((msg, idx) =>
          idx === messageIndex ? { ...msg, content: newContent } : msg
        )
      );
    }
  };

  /**
   * Regenerates the AI response after a user message has been edited.
   * If newMessagesArr is provided, this is used to guarantee latest state (called after edit update).
   * @param {number} editedMessageIndex - Index of the message that was edited
   * @param {array} [newMessagesArr] - If present, use as state source (e.g. from fresh state change)
   */
  const handleRegenerateResponse = async (editedMessageIndex, newMessagesArr) => {
    if (isLoading) return;
    // Use freshest state. Keep chat up to the just-edited user message, remove all after.
    const msgsSource = Array.isArray(newMessagesArr) ? newMessagesArr : messages;
    const messagesToKeep = msgsSource.slice(0, editedMessageIndex + 1);
    setMessages(messagesToKeep);

    // Validate edited message exists and is a non-empty user message
    const editedMessage = messagesToKeep[editedMessageIndex];
    if (!editedMessage || editedMessage.role !== "user" || !editedMessage.content.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      let API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:3001";

      // Only send user/assistant message pairs up to edited (all finalized up to now)
      const cleanHistory = messagesToKeep
        .filter(m => !m.streaming)
        .map(({ role, content }) => ({ role, content }));

      const resp = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: cleanHistory
        })
      });

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

      // Streaming response (identical to sendMessage)
      let usedStreaming = false;
      if (resp.body && window.ReadableStream) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let done = false;

        const timestamp = new Date().toISOString();
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: "",
            timestamp,
            streaming: true
          }
        ]);

        const updateStreamingAssistant = (partialContent) => {
          setMessages(prev => {
            let lastIdx = prev.length - 1;
            return prev.map((msg, idx) =>
              (idx === lastIdx && msg.role === "assistant")
                ? { ...msg, content: partialContent }
                : msg
            );
          });
        };

        while (!done) {
          const { value, done: localDone } = await reader.read();
          done = localDone;
          if (value) {
            buffer += decoder.decode(value, { stream: !localDone });
            try {
              const jsonStart = buffer.indexOf("{");
              const jsonEnd = buffer.indexOf("}", jsonStart);
              if (jsonStart !== -1 && jsonEnd !== -1) {
                const jsonStr = buffer.substring(jsonStart, jsonEnd + 1);
                const data = JSON.parse(jsonStr);
                if (typeof data.answer === "string") {
                  const parsedAnswer = data.answer;
                  const charsPerTick = 5;
                  const msInterval = 3;
                  let lastContent = "";
                  for (let i = charsPerTick; i <= parsedAnswer.length; i += charsPerTick) {
                    let toDisplay = parsedAnswer.substring(0, i);
                    if (toDisplay !== lastContent) {
                      updateStreamingAssistant(toDisplay);
                      lastContent = toDisplay;
                      await new Promise(resolve => setTimeout(resolve, msInterval));
                    }
                  }
                  if (lastContent !== parsedAnswer) updateStreamingAssistant(parsedAnswer);
                } else {
                  updateStreamingAssistant("");
                }
                usedStreaming = true;
                break;
              }
            } catch (err) {
              // Continue reading
            }
          }
        }

        if (!usedStreaming) {
          let fallbackData;
          try {
            fallbackData = JSON.parse(buffer);
          } catch {
            fallbackData = {};
          }
          let replyText = "";
          if (fallbackData && typeof fallbackData.answer === "string" && fallbackData.answer.trim().length > 0) {
            replyText = fallbackData.answer;
          }
          updateStreamingAssistant(replyText || "");
        }

        setMessages(prev => {
          let lastIdx = prev.length - 1;
          if (
            prev.length > 0 &&
            prev[lastIdx].role === "assistant" &&
            prev[lastIdx].streaming
          ) {
            return prev.map((msg, idx) =>
              idx === lastIdx
                ? { ...msg, streaming: undefined }
                : msg
            );
          }
          return prev;
        });

      } else {
        // Non-streaming fallback
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
        "Sorry, failed to regenerate AI response. " +
        (err?.message
          ? err.message.replace(/^Error:/, '').trim()
          : String(err)
        )
      );
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="chatpage-root">
      {/* Header */}
      <header className="header-bar">
        <div className="header-left">
          {/* Professional minimal chat bubble SVG avatar */}
          <span className="avatar" aria-label="AI Assistant">
            {/* Minimalist dot-in-bubble SVG */}
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-label="Minimal AI Bot" role="img">
              <circle cx="16" cy="16" r="16" fill="#1976D2" />
              <rect x="9" y="11" width="14" height="10" rx="5" fill="#fff" />
              <circle cx="13" cy="16" r="1.15" fill="#1976D2" />
              <circle cx="16" cy="16" r="1.15" fill="#1976D2" />
              <circle cx="19" cy="16" r="1.15" fill="#1976D2" />
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
          <ChatMessageList
            messages={messages}
            setMessages={setMessages}
            setIsLoading={setIsLoading}
            setError={setError}
            isLoading={isLoading}
            onEditMessage={handleEditMessage}
            onRegenerateResponse={handleRegenerateResponse}
          />
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
