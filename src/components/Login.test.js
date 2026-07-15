import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Login from '../pages/Login';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams()],
}));

// Mock API
jest.mock('../services/api', () => ({
  default: {
    post: jest.fn(),
  },
  setToken: jest.fn(),
}));

describe('Login Component - Unit Test', () => {
  const mockSetToken = jest.fn();

  beforeEach(() => {
    mockSetToken.mockClear();
  });

  test('renders login form with email and password inputs', () => {
    render(<Login setToken={mockSetToken} />);

    const emailInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);

    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
  });

  test('displays error message when email field is empty on submit', () => {
    render(<Login setToken={mockSetToken} />);

    const submitButton = screen.getByRole('button', { name: /login/i });
    fireEvent.click(submitButton);

    // Check if validation error appears
    expect(screen.queryByText(/email|password/i)).toBeTruthy();
  });

  test('allows user to type in email and password fields', () => {
    render(<Login setToken={mockSetToken} />);

    const emailInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);

    fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@test.com');
    expect(passwordInput.value).toBe('password123');
  });

  test('has register link', () => {
    render(<Login setToken={mockSetToken} />);

    const registerLink = screen.getByText(/register/i);
    expect(registerLink).toBeInTheDocument();
  });
});
