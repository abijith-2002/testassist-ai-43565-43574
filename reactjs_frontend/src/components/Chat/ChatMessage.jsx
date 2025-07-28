import React from 'react';
import '../../App.css';
import '../../ChatPage.css';
import './Chat.css';

// PUBLIC_INTERFACE
function ChatMessage({
  role,
  msg,
}) {
  if (role === "assistant") {
    return null; // Do not render for assistant
  }
  
  return (
    <div className="chat-message-container user">
      <div className="chat-bubble-wrapper user">
        <div className="chat-bubble user">
          <span className="bubble-txt">{msg.content}</span>
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;
