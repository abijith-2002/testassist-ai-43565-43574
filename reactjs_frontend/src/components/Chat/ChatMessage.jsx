import React, { useState, useRef, useEffect } from 'react';
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
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

// PUBLIC_INTERFACE
function ChatMessage({
  role,
  msg,
  messageIndex,
  onEditMessage,
  onRegenerateResponse,
  isLoading
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(msg.content);

  // Only update editValue when edit mode is entered or the message actually changes outside editing
  useEffect(() => {
    if (isEditing) {
      setEditValue(msg.content);
    }
    // eslint-disable-next-line
  }, [isEditing]);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState('auto');
  
  // Refs for measuring and controlling elements
  const bubbleTextRef = useRef(null);
  const textareaRef = useRef(null);
  const measureRef = useRef(null);

  // Auto-resize textarea based on content while maintaining width
  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      // Store current width to maintain it
      const currentWidth = textareaRef.current.style.width;
      
      // Reset height to auto to get the natural height
      textareaRef.current.style.height = 'auto';
      
      // Get the scroll height (content height)
      const scrollHeight = textareaRef.current.scrollHeight;
      
      // Set the height to match content and restore width
      textareaRef.current.style.height = `${scrollHeight}px`;
      textareaRef.current.style.width = currentWidth; // Maintain exact width
      setTextareaHeight(`${scrollHeight}px`);
    }
  };

  // Effect to auto-resize when editValue changes - MUST be at top level before any returns
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        autoResizeTextarea();
      }, 0);
    }
  }, [editValue, isEditing]);

  // Early return after all hooks are declared
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
    
    // Calculate initial dimensions based on original content
    setTimeout(() => {
      if (textareaRef.current && bubbleTextRef.current) {
        // Set textarea width to 60% of viewport width as specified
        textareaRef.current.style.width = '60vw';
        
        // Apply the specified background and text colors for edit mode with !important
        textareaRef.current.style.setProperty('background-color', '#9FB4C7', 'important');
        textareaRef.current.style.setProperty('color', '#2C363F', 'important');
        
        // Add data attribute to help with CSS targeting
        textareaRef.current.setAttribute('data-edit-mode', 'true');
        
        // Match the height of the original bubble text
        const originalHeight = bubbleTextRef.current.scrollHeight;
        textareaRef.current.style.height = `${originalHeight}px`;
        setTextareaHeight(`${originalHeight}px`);
        
        // Focus and position cursor at end
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(editValue.length, editValue.length);
      }
    }, 0);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editValue.trim() || isLoading) return;

    // Always update the user message and trigger answer regeneration on save,
    // regardless if the value actually changed, to guarantee backend re-request.
    if (typeof onEditMessage === "function") {
      // Always pass doRegenerate:true if supported
      if (onEditMessage.length === 3) {
        onEditMessage(messageIndex, editValue.trim(), { doRegenerate: true });
      } else {
        // Fallback legacy prop: edit, then trigger regeneration
        onEditMessage(messageIndex, editValue.trim());
        if (typeof onRegenerateResponse === "function") {
          onRegenerateResponse(messageIndex);
        }
      }
    } else if (typeof onRegenerateResponse === "function") {
      onRegenerateResponse(messageIndex);
    }

    setIsEditing(false);

    if (textareaRef.current) {
      textareaRef.current.removeAttribute('data-edit-mode');
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditValue(msg.content);
    setIsEditing(false);
    
    // Clean up data attributes
    if (textareaRef.current) {
      textareaRef.current.removeAttribute('data-edit-mode');
    }
  };

  // Handle input change with auto-resize
  const handleInputChange = (e) => {
    setEditValue(e.target.value);
    // Auto-resize will happen via useEffect
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
                ref={textareaRef}
                className="chat-edit-input"
                value={editValue}
                onChange={handleInputChange}
                onKeyDown={handleEditKeyDown}
                style={{
                  height: textareaHeight,
                  minHeight: 'auto',
                  overflow: 'hidden'
                }}
              />
              <div className="edit-actions">
                <button 
                  className="edit-save-btn"
                  onClick={handleSaveEdit}
                  disabled={!editValue.trim() || isLoading}
                >
                  {isLoading ? (
                    <span style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>
                      <svg className="spinner" width="18" height="18" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="9" stroke="#EEE" strokeWidth="2" opacity="0.22"/><circle cx="11" cy="11" r="9" stroke="#3F6E8D" strokeWidth="2" strokeDasharray="32 52" strokeLinecap="round"><animateTransform attributeName="transform" type="rotate" from="0 11 11" to="360 11 11" dur="1s" repeatCount="indefinite"/></circle></svg>
                      Saving...
                    </span>
                  ) : (
                    "Save"
                  )}
                </button>
                <button 
                  className="edit-cancel-btn"
                  onClick={handleCancelEdit}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="chat-bubble user">
            <span ref={bubbleTextRef} className="bubble-txt">{msg.content}</span>
          </div>
        )}
        
        {/* Hidden element for measuring text dimensions */}
        <div 
          ref={measureRef}
          style={{
            position: 'absolute',
            visibility: 'hidden',
            height: 'auto',
            width: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
          className="bubble-txt"
        >
          {editValue}
        </div>
      </div>
      
      {/* Fixed-height allocated area for action buttons - always present, buttons controlled by opacity/visibility */}
      {!isEditing && (
        <div className="message-actions-area">
          <div className="message-actions-container">
            <button
              className="message-action-btn edit-btn"
              onClick={handleEdit}
              aria-label="Edit message and regenerate response"
              title="Edit message"
            >
              <EditIcon size={16} />
            </button>
            <button
              className="message-action-btn copy-btn"
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
  );
}

export default ChatMessage;
