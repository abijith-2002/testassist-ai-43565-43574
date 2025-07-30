import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock the ChatMessageList component to avoid react-markdown issues
jest.mock('../components/Chat/ChatMessageList', () => {
  return function MockChatMessageList({ messages, onEditMessage, onRegenerateResponse, isLoading }) {
    return (
      <div data-testid="chat-message-list">
        {messages.map((msg, idx) => 
          msg.role === "assistant" ? (
            <div key={idx} className="assistant-message">
              {msg.content}
            </div>
          ) : (
            <div key={idx} className="user-message-container">
              <div className="user-message">{msg.content}</div>
              <button 
                onClick={() => {
                  // Simulate edit mode
                  const newContent = prompt('Edit message:', msg.content);
                  if (newContent) {
                    onEditMessage(idx, newContent, { doRegenerate: true });
                  }
                }}
                data-testid={`edit-btn-${idx}`}
              >
                Edit
              </button>
            </div>
          )
        )}
        {isLoading && <div data-testid="loading">AI is typing...</div>}
      </div>
    );
  };
});

// Mock LoadingSpinner
jest.mock('../LoadingSpinner', () => {
  return function MockLoadingSpinner() {
    return <div data-testid="loading-spinner">Loading...</div>;
  };
});

import App from '../App';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock environment variable
process.env.REACT_APP_API_BASE_URL = 'http://localhost:3001';

// Mock window.prompt for the edit simulation
global.prompt = jest.fn();

describe('Chat Prompt Edit and Response Regeneration Flow (Simplified)', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    fetch.mockClear();
    global.prompt.mockClear();
    
    // Mock successful streaming API response
    fetch.mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: jest.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('{"answer": "This is a test response from the backend"}')
            })
            .mockResolvedValueOnce({
              done: true,
              value: null
            })
        })
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should update user chat bubble immediately when editing and saving a prompt', async () => {
    render(<App />);

    // Send initial message to create a chat bubble
    const input = screen.getByPlaceholderText('Type your message…');
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(input, 'Initial test message');
    await user.click(sendButton);

    // Wait for the message to appear in the mock component
    await waitFor(() => {
      expect(screen.getByText('Initial test message')).toBeInTheDocument();
    });

    // Wait for API response
    await waitFor(() => {
      expect(screen.getByText('This is a test response from the backend')).toBeInTheDocument();
    });

    // Mock the prompt for editing
    global.prompt.mockReturnValue('Edited test message');

    // Setup new mock response for regeneration
    fetch.mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: jest.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('{"answer": "This is a regenerated response"}')
            })
            .mockResolvedValueOnce({
              done: true,
              value: null
            })
        })
      }
    });

    // Click edit button
    const editButton = screen.getByTestId('edit-btn-0');
    await user.click(editButton);

    // Verify the message was updated
    await waitFor(() => {
      expect(screen.getByText('Edited test message')).toBeInTheDocument();
      expect(screen.queryByText('Initial test message')).not.toBeInTheDocument();
    });
  });

  test('should send edited prompt to backend and receive new response', async () => {
    render(<App />);

    // Send initial message
    const input = screen.getByPlaceholderText('Type your message…');
    await user.type(input, 'Original message');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Wait for initial message and response
    await waitFor(() => {
      expect(screen.getByText('Original message')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('This is a test response from the backend')).toBeInTheDocument();
    });

    // Reset fetch mock for the edit flow
    fetch.mockClear();

    // Setup new response for edited message
    fetch.mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: jest.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('{"answer": "New response for edited message"}')
            })
            .mockResolvedValueOnce({
              done: true,
              value: null
            })
        })
      }
    });

    // Mock edit prompt
    global.prompt.mockReturnValue('Modified message for backend');

    // Click edit button
    const editButton = screen.getByTestId('edit-btn-0');
    await user.click(editButton);

    // Verify API call is made with edited message
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"Modified message for backend"')
        })
      );
    });

    // Verify the request body contains the edited message
    const lastCall = fetch.mock.calls[fetch.mock.calls.length - 1];
    const requestBody = JSON.parse(lastCall[1].body);
    expect(requestBody.history).toEqual([
      { role: 'user', content: 'Modified message for backend' }
    ]);
  });

  test('should display regenerated response in chat history after edit', async () => {
    render(<App />);

    // Send initial message
    const input = screen.getByPlaceholderText('Type your message…');
    await user.type(input, 'Test question');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Wait for initial response
    await waitFor(() => {
      expect(screen.getByText('This is a test response from the backend')).toBeInTheDocument();
    });

    // Clear fetch mock for edit flow
    fetch.mockClear();

    // Setup new mock response for regeneration
    fetch.mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: jest.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('{"answer": "This is a NEW regenerated response after edit"}')
            })
            .mockResolvedValueOnce({
              done: true,
              value: null
            })
        })
      }
    });

    // Mock edit prompt
    global.prompt.mockReturnValue('Edited test question');

    // Click edit button
    const editButton = screen.getByTestId('edit-btn-0');
    await user.click(editButton);

    // Wait for loading state
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    // Wait for new response to appear
    await waitFor(() => {
      expect(screen.getByText('This is a NEW regenerated response after edit')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verify the chat history shows both edited message and new response
    expect(screen.getByText('Edited test question')).toBeInTheDocument();
    expect(screen.getByText('This is a NEW regenerated response after edit')).toBeInTheDocument();
  });

  test('should handle API errors during regeneration gracefully', async () => {
    render(<App />);

    // Send initial message
    const input = screen.getByPlaceholderText('Type your message…');
    await user.type(input, 'Test message');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    // Clear fetch mock and setup error response
    fetch.mockClear();
    fetch.mockRejectedValue(new Error('Network error'));

    // Mock edit prompt
    global.prompt.mockReturnValue('Edited message with error');

    // Click edit button
    const editButton = screen.getByTestId('edit-btn-0');
    await user.click(editButton);

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/Sorry, failed to regenerate AI response/)).toBeInTheDocument();
    });

    // Verify user message is still updated despite API error
    expect(screen.getByText('Edited message with error')).toBeInTheDocument();
  });

  test('should send message and receive response flow works correctly', async () => {
    render(<App />);

    // Test basic send functionality
    const input = screen.getByPlaceholderText('Type your message…');
    const sendButton = screen.getByRole('button', { name: /send/i });

    expect(input).toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();

    // Type message and send
    await user.type(input, 'Hello, this is a test message');
    expect(input.value).toBe('Hello, this is a test message');

    await user.click(sendButton);

    // Verify message appears in chat
    await waitFor(() => {
      expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument();
    });

    // Verify loading state appears
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    // Verify API response appears
    await waitFor(() => {
      expect(screen.getByText('This is a test response from the backend')).toBeInTheDocument();
    });

    // Verify input is cleared after sending
    expect(input.value).toBe('');

    // Verify API was called correctly
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/chat',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"Hello, this is a test message"')
      })
    );
  });
});
