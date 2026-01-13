import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

// Example component test
describe('Button Component', () => {
  it('renders a button with text', () => {
    const { container } = render(
      <button>Click me</button>
    );
    
    const button = screen.getByText('Click me');
    expect(button).toBeInTheDocument();
  });

  it('handles click events', async () => {
    let clicked = false;
    const handleClick = () => { clicked = true; };
    
    render(
      <button onClick={handleClick}>Click me</button>
    );
    
    const button = screen.getByText('Click me');
    await userEvent.click(button);
    
    expect(clicked).toBe(true);
  });
});

// Example utility test
describe('String Utils', () => {
  it('capitalizes first letter', () => {
    const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
    
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('world')).toBe('World');
  });
});
