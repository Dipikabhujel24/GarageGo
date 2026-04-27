import { render, screen } from '@testing-library/react';
import App from './App';

test('renders garage inventory admin page', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /garage inventory/i })).toBeInTheDocument();
});
