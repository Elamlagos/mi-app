import { render, screen } from '@testing-library/react';
import App from './App';

test('renders loading state', () => {
  render(<App />);
  const loadingElement = screen.getByText(/iniciando aplicaci/i);
  expect(loadingElement).toBeInTheDocument();
});
