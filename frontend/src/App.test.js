import { render, screen } from '@testing-library/react';
import App from './App';

<<<<<<< HEAD
test('renders dashboard heading', () => {
  render(<App />);
  const headingElement = screen.getByRole('heading', { name: /dashboard/i });
  expect(headingElement).toBeInTheDocument();
=======
test('renders garage inventory admin page', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /garage inventory/i })).toBeInTheDocument();
>>>>>>> d679d7f63088af4efc9a8092bc7e06eb6c17aa78
});
