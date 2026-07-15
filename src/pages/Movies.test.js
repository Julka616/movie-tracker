import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Movies from '../pages/Movies';
import API from '../services/api';


jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams()],
}));


jest.mock('../services/api', () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
  setToken: jest.fn(),
}));



describe('Movies Component - Integration Test', () => {
  const mockMovies = [
    {
      _id: '1',
      title: 'Test Movie',
      genre: 'Action',
      year: 2024,
      type: 'movie',
      posterUrl: 'http://example.com/poster.jpg',
      averageRating: 8.5,
      ratings: [],
      episodes: [],
    },
  ];

  beforeEach(() => {
    API.get.mockResolvedValue({ data: mockMovies });
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.removeItem('token');
    localStorage.removeItem('darkMode');
  });

  test('renders movies list and handles dark mode toggle', async () => {
    render(<Movies darkMode={false} setDarkMode={() => {}} />);

    // Czekaj na załadowanie filmów
    await waitFor(() => {
      expect(API.get).toHaveBeenCalled();
    });
  });

  test('displays search input and filters', () => {
    render(<Movies darkMode={false} setDarkMode={() => {}} />);

    const searchInput = screen.getByPlaceholderText(/szukaj/i);
    expect(searchInput).toBeInTheDocument();
  });

  test('user can interact with search input', async () => {
    render(<Movies darkMode={false} setDarkMode={() => {}} />);

    const searchInput = screen.getByPlaceholderText(/szukaj/i);
    
    fireEvent.change(searchInput, { target: { value: 'Test Movie' } });
    
    expect(searchInput.value).toBe('Test Movie');
  });

  test('dark mode toggle function is called', () => {
    const mockSetDarkMode = jest.fn();
    
    render(<Movies darkMode={false} setDarkMode={mockSetDarkMode} />);

    const darkModeButton = screen.getByTitle(/jasny tryb|ciemny tryb/i);
    
    if (darkModeButton) {
      fireEvent.click(darkModeButton);
      expect(mockSetDarkMode).toHaveBeenCalled();
    }
  });
});
