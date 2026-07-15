# Wdrożenie MovieTracker na produkcję (krok po kroku)

Cel: baza w MongoDB Atlas + backend na Render + frontend na Vercel.
Zero złotych, zajmuje ok. 30-45 minut.

## Krok 0 — wrzuć projekt na GitHub

Jeśli jeszcze tego nie zrobiłaś:

```
cd my-movie-app
git init
git add .
git commit -m "Initial commit"
```

Utwórz nowe repo na github.com (przycisk "New repository"), a potem:

```
git remote add origin https://github.com/TWOJA_NAZWA/my-movie-app.git
git branch -M main
git push -u origin main
```

Upewnij się, że `.gitignore` zawiera `node_modules` i `.env` (sprawdziłem — masz to już
poprawnie ustawione).

---

## Krok 1 — MongoDB Atlas (baza danych)

1. Wejdź na https://www.mongodb.com/cloud/atlas/register i załóż darmowe konto.
2. Stwórz nowy klaster: wybierz plan **M0 Free**.
3. W **Database Access** dodaj nowego użytkownika bazy (login + hasło) — zapisz je gdzieś,
   będą potrzebne za chwilę.
4. W **Network Access** dodaj regułę **Allow Access from Anywhere** (0.0.0.0/0) —
   to konieczne, żeby Render mógł się połączyć z bazą.
5. Kliknij **Connect → Drivers**, skopiuj connection string. Będzie wyglądał tak:
   `mongodb+srv://uzytkownik:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
6. Podmień `<password>` na hasło z kroku 3 i dodaj na końcu nazwę bazy, np.:
   `.../my_movie_app?retryWrites=true&w=majority`

To będzie Twój `MONGO_URI`.

---

## Krok 2 — Render (backend)

1. Wejdź na https://render.com i zarejestruj się (może być przez GitHub — łatwiej połączy repo).
2. **New +** → **Web Service** → wybierz swoje repo `my-movie-app`.
3. Ustawienia:
   - **Name:** `movietracker-backend` (dowolna nazwa)
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free
4. Sekcja **Environment Variables** — dodaj:
   - `MONGO_URI` = connection string z Kroku 1
   - `JWT_SECRET` = dowolny długi losowy ciąg (możesz wygenerować poleceniem
     `openssl rand -hex 32` w terminalu albo po prostu wymyślić długie losowe hasło)
   - `FRONTEND_URL` = na razie zostaw puste, wrócimy do tego w Kroku 4
5. Kliknij **Create Web Service**. Poczekaj aż build się skończy (2-5 minut).
6. Po zakończeniu dostaniesz adres typu `https://movietracker-backend.onrender.com`.
   **Zapisz go** — to Twój adres backendu.
7. Sprawdź czy działa: wejdź w przeglądarce na
   `https://movietracker-backend.onrender.com/api/movies` — powinieneś zobaczyć JSON
   z filmami (albo pustą listę `[]`, jeśli baza jest pusta — to też jest ok, znaczy że działa).

---

## Krok 3 — Vercel (frontend)

1. Wejdź na https://vercel.com i zarejestruj się przez GitHub.
2. **Add New → Project** → wybierz repo `my-movie-app`.
3. Ustawienia (Vercel zwykle wykrywa Create React App automatycznie):
   - **Framework Preset:** Create React App
   - **Root Directory:** `.` (główny folder, tam gdzie jest `package.json` z React)
   - **Build Command:** `npm run build` (domyślne)
   - **Output Directory:** `build` (domyślne)
4. Sekcja **Environment Variables** — dodaj:
   - `REACT_APP_API_URL` = `https://movietracker-backend.onrender.com/api`
     (adres z Kroku 2, z dopiskiem `/api` na końcu!)
5. Kliknij **Deploy**. Po 1-2 minutach dostaniesz adres typu
   `https://my-movie-app.vercel.app`.

---

## Krok 4 — dokończ konfigurację CORS

Wróć do Render (Krok 2) → Environment → edytuj zmienną:

- `FRONTEND_URL` = `https://my-movie-app.vercel.app` (adres z Kroku 3, bez `/` na końcu)

Zapisz — Render sam zrobi redeploy backendu z nową zmienną (chwilę potrwa).

---

## Krok 5 — test end-to-end

1. Wejdź na swój adres Vercel (`https://my-movie-app.vercel.app`).
2. Zarejestruj nowe konto, zaloguj się, spróbuj dodać/ocenić film.
3. Jeśli coś nie działa — otwórz konsolę przeglądarki (F12 → Console/Network) i sprawdź,
   czy żądania do `/api/...` zwracają błąd CORS albo 404/500. Najczęstsze przyczyny:
   - literówka w `REACT_APP_API_URL` (musi kończyć się na `/api`)
   - brak `/api` na końcu adresu
   - `FRONTEND_URL` na Render nie zgadza się dokładnie z adresem Vercel (http vs https,
     `/` na końcu itp.)

---

## Uwaga o "usypianiu" backendu

Darmowy plan Render usypia serwis po 15 minutach bez ruchu. Pierwsze żądanie po przerwie
może trwać 10-30 sekund (serwer się "budzi"), kolejne są już szybkie. To normalne i nie
wymaga żadnej naprawy — po prostu tak działa darmowy plan.

## Konto administratora

Masz skrypt `backend/scripts/createAdmin.js`. Żeby stworzyć admina na produkcyjnej bazie,
najprościej uruchomić go **lokalnie**, ale z `MONGO_URI` wskazującym na Atlas (czyli tę samą
bazę, której używa Render):

```
cd backend
MONGO_URI="twoj_connection_string_z_atlas" ADMIN_EMAIL="ty@example.com" ADMIN_PASSWORD="silne_haslo" node scripts/createAdmin.js
```
