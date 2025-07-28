import React, { useState, useRef, useEffect } from 'react';
import '../../App.css';
import '../../ChatPage.css';
import './Chat.css';

// PUBLIC_INTERFACE
function ChatMessage({
  role,
  msg,
  idx,
  isLoading,
  setMessages,
  setIsLoading,
  setError,
  regenerateResponse,
}) {
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(msg.content);

  const taRef = useRef(null);
  useEffect(() => {
    if (editing && taRef.current) taRef.current.focus();
  }, [editing]);

  const canEdit = !isLoading;

  const handleEdit = () => {
    setEditValue(msg.content);
    setEditing(true);
  };

  const handleEditSave = async () => {
    if (editValue.trim() && editValue !== msg.content) {
      await regenerateResponse(editValue, idx);
    }
    setEditing(false);
  };

  const handleEditCancel = () => {
    setEditing(false);
    setEditValue(msg.content);
  };

  // Pencil icon for edit button
  const PencilIcon = (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" style={{ verticalAlign: "middle" }}
      fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.8 2.8c.44-.44 1.16-.44 1.6 0l1.8 1.8c.44.44.44 1.16 0 1.6l-9.7 9.7-3.03.45c-.5.07-.94-.37-.87-.87l.45-3.03 9.7-9.7zm0 0L17 5" />
    </svg>
  );

  if (role === "assistant") {
    return null; // Do not render for assistant
  }
  return (
    <div
      className="chat-message-container user"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: "relative" }}
    >
      <div className="chat-bubble-wrapper user">
        <div className="chat-bubble user">
          {editing ? (
            <form
              onSubmit={e => { e.preventDefault(); handleEditSave(); }}
              style={{ width: "100%" }}
              tabIndex={-1}
            >
              <textarea
                className="chat-edit-input"
                style={{
                  resize: "vertical",
                  width: "97%",
                  minHeight: "48px",
                  maxHeight: "120px",
                  fontSize: "1rem",
                  fontFamily: "inherit",
                  color: "#25496c",
                  background: "#eaf1fb",
                  borderRadius: "10px",
                  margin: "0 0 0 0",
                  padding: "7px 10px",
                  border: "1px solid #b3cef6",
                  outline: "none",
                }}
                ref={taRef}
                value={editValue}
                maxLength={1024}
                onChange={e => setEditValue(e.target.value)}
                disabled={isLoading}
                autoFocus
                onKeyDown={e => {
                  if (e.key === "Escape") { handleEditCancel(); }
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditSave(); }
                }}
              />
            </form>
          ) : (
            <span className="bubble-txt">{msg.content}</span>
          )}
        </div>
      </div>
      {/* Edit button positioned absolutely beneath bubble, left-aligned to bubble's left edge */}
      {(hover && !editing && canEdit) && (
        <div
          className="edit-button-under-bubble"
          style={{
            // Alignment: The following ensures absolute positioning using percentages based on the chat bubble wrapper
            left: 0,
            // Remove fixed percent to be flush with wrapper
          }}
        >
          <button
            className="edit-message-btn"
            tabIndex={0}
            aria-label="Edit prompt"
            title="Edit prompt"
            onClick={handleEdit}
          >
            {PencilIcon}
          </button>
        </div>
      )}

      {/* Save/Cancel buttons, with width aligned to chat bubble */}
      {editing && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: '8px',
          width: '100%',
          maxWidth: '65%',
          marginLeft: 'auto'
        }}>
          <button
            type="button"
            className="edit-save-btn"
            disabled={isLoading || !editValue.trim() || editValue === msg.content}
            tabIndex={0}
            aria-label="Save edit"
            title="Save edit"
            onClick={handleEditSave}
            style={{
              background: 'linear-gradient(135deg, var(--accent-blue) 0%, #4A90E2 100%)',
              color: '#fff',
              fontWeight: '500',
              padding: '6px 14px',
              border: 'none',
              borderRadius: '8px',
              marginRight: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              minWidth: '52px'
            }}
          >
            Save
          </button>
          <button
            type="button"
            className="edit-cancel-btn"
            disabled={isLoading}
            tabIndex={0}
            aria-label="Cancel"
            title="Cancel"
            onClick={handleEditCancel}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'rgba(255, 255, 255, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '6px 12px',
              fontWeight: '400',
              minWidth: '48px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default ChatMessage;
