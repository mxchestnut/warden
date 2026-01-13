import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

// Mock component for testing
const LoginForm = ({ onSubmit }: { onSubmit: (username: string, password: string) => void }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    onSubmit(username, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="username" placeholder="Username" />
      <input name="password" type="password" placeholder="Password" />
      <button type="submit">Login</button>
    </form>
  );
};

describe('LoginForm Component', () => {
  it('renders username and password inputs', () => {
    const mockOnSubmit = vi.fn();
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('calls onSubmit with username and password', async () => {
    const mockOnSubmit = vi.fn();
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Login' });
    
    await userEvent.type(usernameInput, 'testuser');
    await userEvent.type(passwordInput, 'testpass123');
    await userEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('testuser', 'testpass123');
    });
  });

  it('prevents default form submission', async () => {
    const mockOnSubmit = vi.fn();
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    const form = screen.getByRole('button', { name: 'Login' }).closest('form');
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(submitEvent, 'preventDefault');
    
    form?.dispatchEvent(submitEvent);
    
    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
