import React, { useState, useRef } from 'react';
import API from '../services/api';

export default function EpisodeManager({ movie, isAdmin, onUpdate, userWatchedEpisodes }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const episodesRef = useRef(null);
  const [episodeForm, setEpisodeForm] = useState({
    seasonNumber: '',
    episodeNumber: '',
    title: '',
    description: '',
    duration: '',
    airDate: '',
  });

  const handleAddEpisode = async (e) => {
    // e może być undefined jeśli wołane z onClick zamiast onSubmit
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    try {
      // Konwertuj stringi na liczby i wyfiltruj undefined
      const dataToSend = {
        seasonNumber: parseInt(episodeForm.seasonNumber),
        episodeNumber: parseInt(episodeForm.episodeNumber),
        title: episodeForm.title,
      };
      
      // Dodaj opcjonalne pola tylko jeśli mają wartości
      if (episodeForm.description) dataToSend.description = episodeForm.description;
      if (episodeForm.duration) dataToSend.duration = parseInt(episodeForm.duration);
      if (episodeForm.airDate) dataToSend.airDate = episodeForm.airDate;
      
      console.log('Dodawanie/edycja odcinka:', dataToSend);
      
      if (editingId) {
        // Edycja istniejącego odcinka
        const response = await API.put(`/movies/${movie._id}/episodes/${editingId}`, dataToSend);
        console.log('Odcinek zaktualizowany:', response.data);
      } else {
        // Dodawanie nowego odcinka
        const response = await API.post(`/movies/${movie._id}/episodes`, dataToSend);
        console.log('Odcinek dodany:', response.data);
      }
      
      setShowAddForm(false);
      setEditingId(null);
      setEpisodeForm({ seasonNumber: '', episodeNumber: '', title: '', description: '', duration: '', airDate: '' });
      onUpdate();
    } catch (err) {
      console.error('Failed to save episode:', err);
      console.error('Response:', err.response?.data);
      console.error('Status:', err.response?.status);
      
      if (err.response?.status === 401) {
        alert('Sesja wygasła. Zaloguj się ponownie.');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        alert(`Błąd podczas zapisywania odcinka: ${err.response?.data?.msg || err.message}`);
      }
    }
  };

  const handleDeleteEpisode = async (episodeId) => {
    if (window.confirm('Usunąć ten odcinek?')) {
      try {
        await API.delete(`/movies/${movie._id}/episodes/${episodeId}`);
        onUpdate();
      } catch (err) {
        console.error('Failed to delete episode:', err);
        if (err.response?.status === 401) {
          alert('Sesja wygasła. Zaloguj się ponownie.');
          localStorage.removeItem('token');
          window.location.href = '/login';
        } else {
          alert(`Błąd podczas usuwania odcinka: ${err.response?.data?.msg || err.message}`);
        }
      }
    }
  };

  const startEditEpisode = (episode) => {
    setEditingId(episode._id);
    setEpisodeForm({
      seasonNumber: episode.seasonNumber || '',
      episodeNumber: episode.episodeNumber || '',
      title: episode.title || '',
      description: episode.description || '',
      duration: episode.duration || '',
      airDate: episode.airDate ? episode.airDate.split('T')[0] : '',
    });
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setShowAddForm(false);
    setEditingId(null);
    setEpisodeForm({ seasonNumber: '', episodeNumber: '', title: '', description: '', duration: '', airDate: '' });
  };

  const toggleWatched = async (episodeId, isWatched, seasonNumber, episodeNumber) => {
    try {
      // Zapamiętaj aktualną pozycję scrolla
      const scrollPosition = window.scrollY;
      
      console.log('Zaznaczanie odcinka:', { episodeId, isWatched, seasonNumber, episodeNumber });
      if (isWatched) {
        await API.delete(`/movies/${movie._id}/episodes/${episodeId}/watch`);
      } else {
        await API.post(`/movies/${movie._id}/episodes/${episodeId}/watch`, { seasonNumber, episodeNumber });
      }
      onUpdate();
      
      // Przywróć scrollu po aktualizacji
      setTimeout(() => {
        window.scrollTo(0, scrollPosition);
      }, 50);
    } catch (err) {
      console.error('Failed to toggle watched:', err);
      console.error('Response:', err.response?.data);
      console.error('Status:', err.response?.status);
      
      if (err.response?.status === 401) {
        alert('Sesja wygasła. Zaloguj się ponownie.');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        alert(`Błąd podczas zaznaczania odcinka: ${err.response?.data?.msg || err.message}`);
      }
    }
  };

  const isEpisodeWatched = (episodeId) => {
    return userWatchedEpisodes?.some(we => we.episodeId.toString() === episodeId.toString());
  };

  // Grupowanie odcinków po sezonach
  const groupedEpisodes = movie.episodes?.reduce((acc, ep) => {
    const season = ep.seasonNumber || 1;
    if (!acc[season]) acc[season] = [];
    acc[season].push(ep);
    return acc;
  }, {});

  const seasons = Object.keys(groupedEpisodes || {}).sort((a, b) => a - b);

  return (
    <div className="mt-6" ref={episodesRef}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold">Odcinki</h3>
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              if (showAddForm && !editingId) {
                setShowAddForm(false);
              } else if (editingId) {
                cancelEdit();
              } else {
                setShowAddForm(true);
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            {showAddForm ? 'Anuluj' : '+ Dodaj odcinek'}
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-blue-50 p-4 rounded-lg mb-4 space-y-3 border-2 border-blue-300">
          <h4 className="font-bold text-blue-800">{editingId ? 'Edytuj odcinek' : 'Dodaj nowy odcinek'}</h4>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Sezon"
              value={episodeForm.seasonNumber}
              onChange={(e) => setEpisodeForm({ ...episodeForm, seasonNumber: e.target.value })}
              required
              className="p-2 border rounded"
            />
            <input
              type="number"
              placeholder="Numer odcinka"
              value={episodeForm.episodeNumber}
              onChange={(e) => setEpisodeForm({ ...episodeForm, episodeNumber: e.target.value })}
              required
              className="p-2 border rounded"
            />
          </div>
          <input
            type="text"
            placeholder="Tytuł odcinka"
            value={episodeForm.title}
            onChange={(e) => setEpisodeForm({ ...episodeForm, title: e.target.value })}
            required
            className="w-full p-2 border rounded"
          />
          <textarea
            placeholder="Opis"
            value={episodeForm.description}
            onChange={(e) => setEpisodeForm({ ...episodeForm, description: e.target.value })}
            className="w-full p-2 border rounded"
            rows="2"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Czas trwania (min)"
              value={episodeForm.duration}
              onChange={(e) => setEpisodeForm({ ...episodeForm, duration: e.target.value })}
              className="p-2 border rounded"
            />
            <input
              type="date"
              placeholder="Data emisji"
              value={episodeForm.airDate}
              onChange={(e) => setEpisodeForm({ ...episodeForm, airDate: e.target.value })}
              className="p-2 border rounded"
            />
          </div>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={handleAddEpisode}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
            >
              {editingId ? 'Zaktualizuj' : 'Dodaj'}
            </button>
            {editingId && (
              <button 
                type="button" 
                onClick={cancelEdit}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 font-semibold"
              >
                Anuluj edycję
              </button>
            )}
          </div>
        </div>
      )}

      {seasons.length === 0 ? (
        <p className="text-gray-500">Brak odcinków</p>
      ) : (
        seasons.map((season) => (
          <div key={season} className="mb-6">
            <h4 className="text-xl font-semibold mb-2">Sezon {season}</h4>
            <div className="space-y-2">
              {groupedEpisodes[season]
                .sort((a, b) => a.episodeNumber - b.episodeNumber)
                .map((episode) => {
                  const watched = isEpisodeWatched(episode._id);
                  return (
                    <div
                      key={episode._id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        watched ? 'bg-green-50 border-green-300' : 'bg-white border-gray-300'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={watched}
                            onChange={() => toggleWatched(episode._id, watched, episode.seasonNumber, episode.episodeNumber)}
                            className="w-5 h-5 cursor-pointer"
                          />
                          <span className="font-semibold">
                            S{episode.seasonNumber}E{episode.episodeNumber}: {episode.title}
                          </span>
                          {episode.duration && (
                            <span className="text-sm text-gray-600">({episode.duration} min)</span>
                          )}
                          {episode.airDate && (
                            <span className="text-sm text-gray-500">
                              • {new Date(episode.airDate).toLocaleDateString('pl-PL')}
                            </span>
                          )}
                        </div>
                        {episode.description && (
                          <p className="text-sm text-gray-600 mt-1 ml-7">{episode.description}</p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="ml-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEditEpisode(episode)}
                            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                          >
                            Edytuj
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEpisode(episode._id)}
                            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                          >
                            Usuń
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
