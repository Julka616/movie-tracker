import React, { useState, useEffect } from 'react';
import API, { setToken } from '../services/api';
import { jwtDecode } from 'jwt-decode';

export default function Movies({ guest }) {
  const [movies, setMovies] = useState([]);
  const [form, setForm] = useState({ title: '', director: '', year: '', genre: '' });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!guest && token) {
      setToken(token);
      try {
        const decoded = jwtDecode(token);
        setIsAdmin(decoded.user?.role === 'admin');
      } catch (err) {
        console.error('Token decode error:', err);
      }
    } else {
      setIsAdmin(false);
    }
    fetchMovies();
  }, [guest, token]);

  const fetchMovies = async () => {
    try {
      const res = await API.get('/movies', {
        params: {
          search,
          genre,
          year,
        },
      });
      setMovies(res.data);
    } catch (err) {
      console.error('Failed to fetch movies:', err);
    }
  };

  // Auto-filter with debounce
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchMovies();
    }, 400); // debounce – nie strzela requestów przy każdym znaku

    return () => clearTimeout(delayDebounce);
  }, [search, genre, year]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    if (!form.title || !form.director || !form.year) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await API.post('/movies', form);
      setSuccessMsg('Movie added successfully!');
      fetchMovies();
      setForm({ title: '', director: '', year: '', genre: '' });
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      const msg = err.response?.data?.msg || 'Error adding movie';
      setError(msg);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this movie?')) {
      setError('');
      try {
        await API.delete(`/movies/${id}`);
        setSuccessMsg('Movie deleted successfully!');
        fetchMovies();
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err) {
        const msg = err.response?.data?.msg || 'Error deleting movie';
        setError(msg);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    window.location.reload();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #007bff', paddingBottom: '15px' }}>
        <div>
          <h1>MovieTracker</h1>
          {isAdmin && <span style={{ color: '#28a745', fontWeight: 'bold' }}>👤 Admin</span>}
        </div>
        <button 
          onClick={handleLogout} 
          style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', fontSize: '16px' }}
        >
          Wyloguj się
        </button>
      </div>

      {error && <div style={{ padding: '15px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '20px', border: '1px solid #f5c6cb' }}>{error}</div>}
      {successMsg && <div style={{ padding: '15px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px', marginBottom: '20px', border: '1px solid #c3e6cb' }}>{successMsg}</div>}

      <div style={{ marginBottom: '40px' }}>
        <h2>📽️ Wszystkie filmy</h2>
        
        {/* Search & Filter Form */}
        <div style={{ marginBottom: '20px', backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Szukaj po tytule..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '4px', fontSize: '16px', flex: '1', minWidth: '200px' }}
          />

          <input
            type="text"
            placeholder="Gatunek (np. Sci-Fi)"
            value={genre}
            onChange={e => setGenre(e.target.value)}
            style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '4px', fontSize: '16px', flex: '1', minWidth: '150px' }}
          />

          <input
            type="number"
            placeholder="Rok"
            value={year}
            onChange={e => setYear(e.target.value)}
            style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '4px', fontSize: '16px', flex: '1', minWidth: '120px' }}
          />

          <button
            onClick={() => {
              setSearch('');
              setGenre('');
              setYear('');
            }}
            style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold' }}
          >
            Reset
          </button>
        </div>

        {/* Message for non-logged users */}
        {!token && (
          <div style={{ marginBottom: '20px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', color: '#856404', padding: '15px', borderRadius: '4px' }}>
            Zaloguj się, aby dodawać filmy do list i oceniać je!
          </div>
        )}

        {/* Movies Grid */}
        {movies.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {movies.map(m => (
              <div 
                key={m._id} 
                style={{ 
                  padding: '15px', 
                  backgroundColor: '#f9f9f9', 
                  borderRadius: '8px', 
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  border: '1px solid #e0e0e0'
                }}
              >
                <h3 style={{ margin: '0 0 10px 0', color: '#007bff' }}>{m.title}</h3>
                <p style={{ margin: '5px 0' }}><strong>Director:</strong> {m.director || 'N/A'}</p>
                <p style={{ margin: '5px 0' }}><strong>Year:</strong> {m.year || 'N/A'}</p>
                <p style={{ margin: '5px 0' }}><strong>Genre:</strong> {m.genre || 'N/A'}</p>
                
                {!token && null}
                
                {token && !isAdmin && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                    {['toWatch','watching','watched'].map(l => (
                      <button
                        key={l}
                        onClick={() => addToList(m._id, l)}
                        style={{ backgroundColor: '#007bff', color: 'white', padding: '8px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                      >
                        {l === 'toWatch'
                          ? 'Do obejrzenia'
                          : l === 'watching'
                          ? 'W trakcie'
                          : 'Obejrzane'}
                      </button>
                    ))}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        placeholder="1-10"
                        style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '4px', width: '60px', fontSize: '14px' }}
                        value={ratings[m._id] || ''}
                        onChange={e =>
                          setRatings({ ...ratings, [m._id]: e.target.value })
                        }
                      />
                      <button
                        onClick={() => rateMovie(m._id, ratings[m._id])}
                        style={{ backgroundColor: '#28a745', color: 'white', padding: '8px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                      >
                        Oceń
                      </button>
                    </div>
                  </div>
                )}
                
                {token && isAdmin && (
                  <button
                    onClick={() => handleDelete(m._id)}
                    style={{ marginTop: '15px', backgroundColor: '#dc3545', color: 'white', padding: '8px 15px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '14px', width: '100%' }}
                  >
                    Usuń film
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#999', fontSize: '18px' }}>Nie znaleziono filmów</p>
        )}
      </div>

      {!guest && isAdmin && (
        <div style={{ backgroundColor: '#f0f8ff', padding: '20px', borderRadius: '8px', border: '1px solid #007bff' }}>
          <h2>➕ Dodaj nowy film</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <input 
              name="title" 
              placeholder="Tytuł *" 
              value={form.title} 
              onChange={handleChange} 
              required
              style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }}
            />
            <input 
              name="director" 
              placeholder="Reżyser *" 
              value={form.director} 
              onChange={handleChange} 
              required
              style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }}
            />
            <input 
              name="year" 
              placeholder="Rok *" 
              type="number"
              value={form.year} 
              onChange={handleChange} 
              required
              style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }}
            />
            <input 
              name="genre" 
              placeholder="Gatunek" 
              value={form.genre} 
              onChange={handleChange} 
              style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }}
            />
            <button 
              type="submit" 
              style={{ 
                padding: '10px 20px', 
                backgroundColor: '#28a745', 
                color: 'white', 
                border: 'none', 
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Dodaj film
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
