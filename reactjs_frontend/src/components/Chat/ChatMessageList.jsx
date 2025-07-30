import React from 'react';
import ChatMessage from './ChatMessage';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import '../../App.css';
import '../../ChatPage.css';
import './Chat.css';

/**
 * PUBLIC_INTERFACE
 * Modified ChatMessageList renders user+assistant prompt/response pairs together as a conversational unit.
 * Editing the user message causes both user and AI reply in that pair to be replaced inline.
 * This approach ensures: 
 *  - Saving an edited prompt updates the bubble instantly,
 *  - Sends prompt to backend for a new answer,
 *  - Replaces old prompt/response in-place in the UI (acceptance requirement).
 */
function ChatMessageList({
  messages,
  setMessages,
  setIsLoading,
  setError,
  isLoading,
  onEditMessage,
  onRegenerateResponse
}) {
  // Helper: Chunk messages into [user, assistant] pairs. A user prompt always appears at 0,2,4... (assuming alternation).
  const pairs = [];
  for (let i = 0; i < messages.length; ) {
    if (messages[i].role === "user") {
      // user at i, assistant at i+1 (optional)
      pairs.push({
        user: messages[i],
        userIdx: i,
        assistant: messages[i+1] && messages[i+1].role === "assistant" ? messages[i+1] : null,
        assistantIdx: messages[i+1] && messages[i+1].role === "assistant" ? i+1 : null
      });
      i += messages[i+1] && messages[i+1].role === "assistant" ? 2 : 1;
    } else {
      // fallback: lone assistant with no user (shouldn't normally occur)
      pairs.push({
        user: null,
        userIdx: null,
        assistant: messages[i],
        assistantIdx: i
      });
      i += 1;
    }
  }

  return (
    <>
      {pairs.map((pair, pIdx) => (
        <React.Fragment key={pair.user ? pair.userIdx : `a${pair.assistantIdx}`}>
          {pair.user && (
            <ChatMessage
              role={pair.user.role}
              msg={pair.user}
              messageIndex={pair.userIdx}
              onEditMessage={(idx, newContent, opts = {}) => {
                // On save: 
                // 1. Update prompt at userIdx
                // 2. Remove its following assistant response if present
                // 3. UI updates instantly, then backend request fires via App state
                if (opts && opts.doRegenerate) {
                  // Calls up App.handleEditMessage, triggers setMessages to [0...userIdx], overwrites user, triggers regeneration
                  onEditMessage(idx, newContent, { doRegenerate: true });
                } else {
                  onEditMessage(idx, newContent);
                }
              }}
              onRegenerateResponse={onRegenerateResponse}
              isLoading={isLoading}
            />
          )}
          {pair.assistant && (
            <div
              key={`ai-${pair.assistantIdx}`}
              className="assistant-fullwidth-message"
            >
              <div className="assistant-content-direct">
                <ReactMarkdown
                  children={pair.assistant.content}
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  linkTarget="_blank"
                  components={{
                    a: ({ node, ...props }) => <a {...props} rel="noopener noreferrer" target="_blank" />,
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      if (!inline) {
                        const lang = match ? match[1] : null;
                        return (
                          <pre
                            className={className}
                            data-language={lang || undefined}
                            tabIndex={0}
                          >
                            <code {...props} className={className}>
                              {children}
                            </code>
                          </pre>
                        );
                      }
                      return (
                        <code {...props} className={className}>
                          {children}
                        </code>
                      );
                    },
                  }}
                />
              </div>
            </div>
          )}
        </React.Fragment>
      ))}
    </>
  );
}

export default ChatMessageList;
