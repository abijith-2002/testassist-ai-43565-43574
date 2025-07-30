import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import App from '../App';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock environment variable
process.env.REACT_APP_API_BASE_URL = 'http://localhost:3001';

describe('Chat Prompt Edit and Response Regeneration Flow', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    fetch.mockClear();
    // Mock successful API response
    fetch.mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: jest.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('{"answer": "This is a regenerated response from the backend"}')
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

    // Wait for the message to appear
    await waitFor(() => {
      expect(screen.getByText('Initial test message')).toBeInTheDocument();
    });

    // Find the user message container and hover to show edit button
    const userMessageContainer = screen.getByText('Initial test message').closest('.chat-message-container');
    
    // Hover over the message to show edit button
    await user.hover(userMessageContainer);

    // Wait for edit button to appear and click it
    await waitFor(() => {
      const editButton = screen.getByRole('button', { name: /edit message/i });
      expect(editButton).toBeVisible();
    });

    const editButton = screen.getByRole('button', { name: /edit message/i });
    await user.click(editButton);

    // Wait for edit mode to activate
    await waitFor(() => {
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      expect(textarea.value).toBe('Initial test message');
    });

    // Edit the message
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'Edited test message');

    // Save the edit
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Verify the user chat bubble is updated immediately
    await waitFor(() => {
      expect(screen.getByText('Edited test message')).toBeInTheDocument();
      expect(screen.queryByText('Initial test message')).not.toBeInTheDocument();
    });

    // Verify edit mode is exited
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  test('should send edited prompt to backend and receive new response', async () => {
    render(<App />);

    // Send initial message
    const input = screen.getByPlaceholderText('Type your message…');
    await user.type(input, 'Original message');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Wait for initial API call to complete
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // Reset fetch mock for the edit flow
    fetch.mockClear();

    // Edit the message
    const userMessageContainer = screen.getByText('Original message').closest('.chat-message-container');
    await user.hover(userMessageContainer);

    await waitFor(() => {
      const editButton = screen.getByRole('button', { name: /edit message/i });
      expect(editButton).toBeVisible();
    });

    await user.click(screen.getByRole('button', { name: /edit message/i }));

    const textarea = await screen.findByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'Modified message for backend');

    // Save the edit
    await user.click(screen.getByRole('button', { name: /save/i }));

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
      expect(screen.getByText('This is a regenerated response from the backend')).toBeInTheDocument();
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

    // Edit the user message
    const userMessageContainer = screen.getByText('Test question').closest('.chat-message-container');
    await user.hover(userMessageContainer);

    await waitFor(() => {
      const editButton = screen.getByRole('button', { name: /edit message/i });
      expect(editButton).toBeVisible();
    });

    await user.click(screen.getByRole('button', { name: /edit message/i }));

    const textarea = await screen.findByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'Edited test question');

    // Save the edit
    await user.click(screen.getByRole('button', { name: /save/i }));

    // Wait for loading state
    await waitFor(() => {
      expect(screen.getByText('AI is typing...')).toBeInTheDocument();
    });

    // Wait for new response to appear
    await waitFor(() => {
      expect(screen.getByText('This is a NEW regenerated response after edit')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verify old response is replaced
    expect(screen.queryByText('This is a regenerated response from the backend')).not.toBeInTheDocument();

    // Verify the chat history shows both edited message and new response
    expect(screen.getByText('Edited test question')).toBeInTheDocument();
    expect(screen.getByText('This is a NEW regenerated response after edit')).toBeInTheDocument();
  });

  test('should handle edit cancellation properly', async () => {
    render(<App />);

    // Send initial message
    const input = screen.getByPlaceholderText('Type your message…');
    await user.type(input, 'Original message');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Wait for message to appear
    await waitFor(() => {
      expect(screen.getByText('Original message')).toBeInTheDocument();
    });

    // Start editing
    const userMessageContainer = screen.getByText('Original message').closest('.chat-message-container');
    await user.hover(userMessageContainer);

    await waitFor(() => {
      const editButton = screen.getByRole('button', { name: /edit message/i });
      expect(editButton).toBeVisible();
    });

    await user.click(screen.getByRole('button', { name: /edit message/i }));

    // Modify the text in edit mode
    const textarea = await screen.findByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'This should be cancelled');

    // Cancel the edit
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Verify original message is restored and edit mode is exited
    await waitFor(() => {
      expect(screen.getByText('Original message')).toBeInTheDocument();
      expect(screen.queryByText('This should be cancelled')).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
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

    // Edit and save message
    const userMessageContainer = screen.getByText('Test message').closest('.chat-message-container');
    await user.hover(userMessageContainer);

    await waitFor(() => {
      const editButton = screen.getByRole('button', { name: /edit message/i });
      expect(editButton).toBeVisible();
    });

    await user.click(screen.getByRole('button', { name: /edit message/i }));

    const textarea = await screen.findByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'Edited message with error');

    await user.click(screen.getByRole('button', { name: /save/i }));

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/Sorry, failed to regenerate AI response/)).toBeInTheDocument();
    });

    // Verify user message is still updated despite API error
    expect(screen.getByText('Edited message with error')).toBeInTheDocument();
  });

  test('should prevent editing when AI is loading', async () => {
    render(<App />);

    // Send initial message to create loading state
    const input = screen.getByPlaceholderText('Type your message…');
    await user.type(input, 'Test message');
    
    // Mock a slow API response to maintain loading state
    fetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Wait for loading state
    await waitFor(() => {
      expect(screen.getByText('AI is typing...')).toBeInTheDocument();
    });

    // Try to edit - should not be possible during loading
    const userMessageContainer = screen.getByText('Test message').closest('.chat-message-container');
    await user.hover(userMessageContainer);

    // Edit button should be visible but save should be disabled when in loading state
    await waitFor(() => {
      const editButton = screen.getByRole('button', { name: /edit message/i });
      expect(editButton).toBeVisible();
    });

    await user.click(screen.getByRole('button', { name: /edit message/i }));

    const textarea = await screen.findByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'Should not save during loading');

    const saveButton = screen.getByRole('button', { name: /saving.../i });
    expect(saveButton).toBeDisabled();
  });
});
