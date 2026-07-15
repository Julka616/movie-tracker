# Testy MovieTracker

## 📋 Przegląd testów

Projekt zawiera kompleksowy zestaw testów jednostkowych i integracyjnych dla aplikacji MovieTracker.

## 🎯 Struktura testów

### **Frontend (React)**

#### **Testy jednostkowe:**
- `src/components/Login.test.js` - Testowanie komponentu logowania
- `src/components/PopularMovies.test.js` - Testowanie wyświetlania popularnych filmów
- `src/services/api.test.js` - Testowanie serwisu API

#### **Testy integracyjne:**
- `src/App.test.js` - Pełne flow aplikacji (logowanie, rejestracja, nawigacja)
- `src/pages/Movies.test.js` - Testowanie strony filmów (wyszukiwanie, filtrowanie, ocenianie)

### **Backend (Node.js/Express)**

#### **Testy jednostkowe:**
- `backend/middleware/auth.test.js` - Middleware autentykacji
- `backend/middleware/admin.test.js` - Middleware uprawnień admina
- `backend/models/User.test.js` - Model użytkownika (walidacja, hashowanie hasła)

#### **Testy integracyjne:**
- `backend/routes/movies.integration.test.js` - Endpoints filmów (CRUD, oceny, filtry)
- `backend/routes/users.integration.test.js` - Endpoints użytkowników (rejestracja, logowanie, listy)

## 🚀 Uruchamianie testów

### **Frontend:**
```bash
# Wszystkie testy
npm test

# Testy z pokryciem kodu
npm test -- --coverage

# Tryb watch (automatyczne odświeżanie)
npm test -- --watch

# Konkretny plik testowy
npm test Login.test.js
```

### **Backend:**
```bash
cd backend

# Wszystkie testy
npm test

# Tylko testy jednostkowe
npm run test:unit

# Tylko testy integracyjne
npm run test:integration

# Tryb watch
npm run test:watch

# Z pokryciem kodu
npm test -- --coverage
```

## 📊 Pokrycie testów

### **Frontend:**
- **Login Component:** 5 testów
  - Renderowanie formularza
  - Walidacja pól
  - Sukces logowania
  - Obsługa błędów

- **PopularMovies Component:** 5 testów
  - Renderowanie listy
  - Obsługa pustej listy
  - Obsługa błędów API
  - Weryfikacja parametrów API

- **API Service:** 5 testów
  - Konfiguracja baseURL
  - Dodawanie/usuwanie tokenów
  - Aktualizacja tokenów

- **Movies Page (Integration):** 6 testów
  - Wyszukiwanie filmów
  - Filtrowanie (gatunek, rok, typ)
  - Dodawanie do list
  - Ocenianie filmów
  - Tryb ciemny

- **App (Integration):** 5 testów
  - Pełny flow logowania
  - Przekierowanie bez tokena
  - Rejestracja użytkownika
  - Nawigacja
  - Wylogowanie

### **Backend:**
- **Auth Middleware:** 6 testów
  - Brak tokena
  - Nieprawidłowy format
  - Walidacja tokena
  - Wygasły token

- **Admin Middleware:** 4 testy
  - Weryfikacja uprawnień admina
  - Odrzucenie zwykłego użytkownika

- **User Model:** 9 testów
  - Tworzenie użytkownika
  - Hashowanie hasła
  - Walidacja pól
  - Unikalność emaila
  - Inicjalizacja list

- **Movies API (Integration):** 12 testów
  - CRUD operacje (Create, Read, Update, Delete)
  - Filtrowanie i wyszukiwanie
  - System ocen
  - Autoryzacja (admin/user)

- **Users API (Integration):** 11 testów
  - Rejestracja użytkownika
  - Logowanie
  - Zarządzanie profilami
  - Zarządzanie listami filmów
  - Pełny flow użytkownika

## 🔧 Wymagania

### **Frontend:**
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`

### **Backend:**
- `jest`
- `supertest`
- `mongodb` (dla testów integracyjnych)

## 📝 Przykładowe użycie

### **Test jednostkowy (Frontend):**
```javascript
test('renderuje formularz logowania', () => {
  render(<Login setToken={mockSetToken} />);
  expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
});
```

### **Test integracyjny (Backend):**
```javascript
test('admin może dodać film', async () => {
  const response = await request(app)
    .post('/api/movies')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(movieData)
    .expect(200);
});
```

## ⚠️ Uwagi

- Testy integracyjne backendu wymagają uruchomionej bazy MongoDB
- Przed uruchomieniem testów, upewnij się że masz zainstalowane wszystkie zależności
- Testy używają testowej bazy danych (`movie-tracker-test`)
- Automatyczne czyszczenie danych testowych po każdym teście

## 🎯 Następne kroki

Możliwe rozszerzenia testów:
- Testy E2E (End-to-End) z Cypress lub Playwright
- Testy wydajnościowe
- Testy bezpieczeństwa
- Testy dostępności (a11y)
- Testy snapshot dla komponentów React
