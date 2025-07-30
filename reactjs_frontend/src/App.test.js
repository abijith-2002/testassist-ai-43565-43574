import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

test('renders chat interface', () => {
  render(<App />);
  const inputElement = screen.getByPlaceholderText(/Type your message/i);
  expect(inputElement).toBeInTheDocument();
});
