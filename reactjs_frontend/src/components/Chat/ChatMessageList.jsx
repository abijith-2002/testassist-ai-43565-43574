import React from 'react';
import ChatMessage from './ChatMessage';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import '../../App.css';
import '../../ChatPage.css';
import './Chat.css';

// PUBLIC_INTERFACE
function ChatMessageList({
  messages,
  setMessages,
  setIsLoading,
  setError,
  isLoading,
  onEditMessage,
  onRegenerateResponse
}) {
  return (
    <>
      {messages.map((msg, idx) =>
        msg.role === "assistant" ? (
          <div
            key={idx}
            className="assistant-fullwidth-message"
          >
            <div className="assistant-content-direct">
              <ReactMarkdown
                children={msg.content}
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
        ) : (
          <ChatMessage
            key={idx}
            role={msg.role}
            msg={msg}
            messageIndex={idx}
            onEditMessage={onEditMessage}
            onRegenerateResponse={onRegenerateResponse}
          />
        )
      )}
    </>
  );
}

export default ChatMessageList;
