# Akhtar-Tiedemann Family Hub

A standalone family command center — no Home Assistant required.

## Stack

| Layer    | Tech                          | Purpose                            |
|----------|-------------------------------|------------------------------------|
| Frontend | React + Vite                  | Dashboard UI                       |
| Backend  | Node.js + Express             | API gateway for all services       |
| Lights   | tplink-smarthome-api          | Local LAN control, no cloud        |
| Weather  | Open-Meteo                    | Free, no API key needed            |
| Sun/Moon | Open-Meteo + math             | Sunrise, sunset, moon phase        |
| Tasks    | Todoist REST API v2           | Chores + gamified star points      |
| Calendar | Google Calendar API           | Rabia & Clare's calendars          |

---

## Setup

### 1. Prerequisites

- Node.js 18+ installed
- All Kasa devices on the **same WiFi network** as the machine running this server
- A Raspberry Pi, Mac mini, or any always-on computer on your LAN works great

### 2. Backend

```bash
cd server
cp .env.example .env
# Edit .env with your tokens (see below)
npm install
npm start
```

Server runs at `http://localhost:3001`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard runs at `http://localhost:3000`

Open it in a browser, or load `http://YOUR_LAN_IP:3000` on any tablet/phone on your network.

---

## API Keys & Credentials

### Todoist
1. Go to https://app.todoist.com/app/settings/integrations/developer
2. Copy your API token → paste into `.env` as `TODOIST_TOKEN`

### Google Calendar
1. Go to https://console.cloud.google.com
2. Create a new project → Enable "Google Calendar API"
3. Create an API key (Credentials → Create Credentials → API Key)
4. Restrict it to "Google Calendar API" for security
5. In Google Calendar: each person's calendar → Settings → "Make available to public" (or share with the API key's project)
6. Copy calendar IDs (usually the Gmail address) into `.env`

### Kasa Lights
No setup needed — the server auto-discovers all Kasa devices on your LAN via UDP broadcast. Just make sure your server machine is on the same WiFi network as your Kasa bulbs and plugs.

### Weather / Sun / Moon
Open-Meteo is completely free with no API key. Just set your `LAT`, `LON`, and `CITY` in `.env`.

---

## Running on a Tablet (Kiosk Mode)

**iPad:** Use Safari → Share → "Add to Home Screen". Runs full-screen.

**Android tablet:** Chrome → Menu → "Add to Home Screen".

**Raspberry Pi with display:** Install Chromium and create a startup script:
```bash
chromium-browser --kiosk --app=http://localhost:3000
```

---

## Gamification

- Completing a Todoist task via the Tasks tab awards **+5 stars** to the assignee
- Points are stored in `server/data.json` (persists across restarts)
- Hold the reset button on a score card to reset to zero
- Milestones: ✨ 0–249 · ⭐ 250–499 · 🥇 500–749 · 🏆 750–1000

---

## File Structure

```
hub/
├── server/
│   ├── index.js          # Express API server
│   ├── package.json
│   ├── .env.example      # Copy to .env and fill in
│   └── data.json         # Auto-created: stores points
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        └── App.jsx       # Entire dashboard UI
```
