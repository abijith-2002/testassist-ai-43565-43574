import React, { useState } from 'react';
import '../../App.css';
import '../../ChatPage.css';
import './Chat.css';

// Copy icon SVG component
const CopyIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

// Edit icon SVG component
const EditIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

// PUBLIC_INTERFACE
function ChatMessage({
  role,
  msg,
  messageIndex,
  onEditMessage,
  onRegenerateResponse
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(msg.content);
  const [copyFeedback, setCopyFeedback] = useState(false);

  if (role === "assistant") {
    return null; // Do not render for assistant
  }

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = msg.content;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 1000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed: ', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  // Handle edit button click
  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(msg.content);
  };

  // Handle save edit
  const handleSaveEdit = () => {
    if (editValue.trim() !== msg.content) {
      onEditMessage(messageIndex, editValue.trim());
      onRegenerateResponse();
    }
    setIsEditing(false);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditValue(msg.content);
    setIsEditing(false);
  };

  // Handle Enter key in edit mode
  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className="chat-message-container user">
      <div className="chat-bubble-wrapper user">
        {isEditing ? (
          <div className="chat-bubble user">
            <div className="edit-mode-container">
              <textarea
                className="chat-edit-input"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleEditKeyDown}
                autoFocus
                rows={Math.max(2, editValue.split('\n').length)}
              />
              <div className="edit-actions">
                <button 
                  className="edit-save-btn"
                  onClick={handleSaveEdit}
                  disabled={!editValue.trim()}
                >
                  Save
                </button>
                <button 
                  className="edit-cancel-btn"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="chat-bubble user">
            <span className="bubble-txt">{msg.content}</span>
            <div className="icon-overlay-container">
              <button
                className="icon-button edit-btn"
                onClick={handleEdit}
                aria-label="Edit message and regenerate response"
                title="Edit message"
              >
                <EditIcon size={16} />
              </button>
              <button
                className="icon-button copy-btn"
                onClick={handleCopy}
                aria-label="Copy message"
                title={copyFeedback ? "Copied!" : "Copy message"}
              >
                <CopyIcon size={16} />
                {copyFeedback && <span className="copy-feedback">✓</span>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
