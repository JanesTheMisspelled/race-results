# Race Results Tracker

A web application for storing and tracking race results over time. Supports different race types with discipline-specific fields, time-based and distance-based scoring, and progress charts.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, SQLite (better-sqlite3)
- **Frontend**: React, TypeScript, Material UI, Recharts, React Router

## Getting Started

### Prerequisites

- Node.js 18+

### Install & Run

```bash
# Install all dependencies (root, server, client)
npm run install:all

# Start both server and client in development mode
npm run dev
```

The client runs on `http://localhost:5173` and proxies API requests to the server on port 3001.

### Configuration

Copy `.env.example` to `.env` and adjust as needed:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PATH` | `server/race-results.db` | Path to the SQLite database file (absolute or relative to server dir). Parent directories are created automatically. |
| `PORT` | `3001` | Server port |

### Production Build

```bash
npm run build
```

## Features

- **Race Types** — Define race types with custom discipline fields (e.g. swim, cycle, run for triathlon)
- **Result Types** — Time-based (how long it took) or distance-based (how far you went in a fixed time)
- **Races** — Named events with a type and location, reusable across years
- **Results** — Per-year results with discipline splits, arbitrary additional info (weather, etc.), and notes
- **Dashboard** — Overview of all races and recent results
- **Race History** — Line chart showing progress over years, with a full results table
- **CRUD** — Full create, read, update, delete for race types, races, and results

## Project Structure

```
race-results/
├── server/                   # Express + SQLite backend
│   ├── src/
│   │   ├── index.ts          # App entry point
│   │   ├── database.ts       # SQLite setup, schema, seed data
│   │   ├── types.ts          # TypeScript interfaces
│   │   └── routes/
│   │       ├── raceTypes.ts  # Race type CRUD
│   │       ├── races.ts      # Race CRUD + history endpoint
│   │       └── results.ts    # Result CRUD
│   └── package.json
├── client/                   # React + Vite frontend
│   ├── src/
│   │   ├── api.ts            # API client + helpers
│   │   ├── types.ts          # TypeScript interfaces
│   │   ├── App.tsx           # Routes
│   │   ├── main.tsx          # Entry point + MUI theme
│   │   ├── components/
│   │   │   └── Layout.tsx    # AppBar + navigation
│   │   └── pages/
│   │       ├── Dashboard.tsx
│   │       ├── ManageRaces.tsx
│   │       ├── RaceTypeManager.tsx
│   │       ├── RaceHistory.tsx
│   │       └── ResultForm.tsx
│   └── package.json
└── package.json              # Root scripts (concurrently)
```

## API Endpoints

### Race Types

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/race-types` | List all race types |
| GET | `/api/race-types/:id` | Get a race type |
| POST | `/api/race-types` | Create a race type |
| PUT | `/api/race-types/:id` | Update a race type |
| DELETE | `/api/race-types/:id` | Delete a race type |

### Races

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/races` | List all races |
| GET | `/api/races/:id` | Get a race |
| POST | `/api/races` | Create a race |
| PUT | `/api/races/:id` | Update a race |
| DELETE | `/api/races/:id` | Delete a race (cascades to results) |
| GET | `/api/races/:id/results` | Get all results for a race |

### Results

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/results` | List all results (optional `?race_id=` filter) |
| GET | `/api/results/:id` | Get a result |
| POST | `/api/results` | Create a result |
| PUT | `/api/results/:id` | Update a result |
| DELETE | `/api/results/:id` | Delete a result |

## Database Schema

### race_types
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| name | TEXT | Unique name |
| discipline_fields | TEXT (JSON) | Array of field names, e.g. `["swim","cycle","run"]` |
| result_type | TEXT | `"time"` or `"distance"` |

### races
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| name | TEXT | Unique race name |
| race_type_id | INTEGER FK | References race_types |
| location | TEXT | Race location |

### race_results
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| race_id | INTEGER FK | References races (CASCADE delete) |
| year | INTEGER | Year of the result |
| total_time | INTEGER | Finish time in seconds (for time-based races) |
| distance | REAL | Distance in km (for distance-based races) |
| discipline_data | TEXT (JSON) | Key-value splits, e.g. `{"swim": 1800, "cycle": 3600}` |
| additional_info | TEXT (JSON) | Arbitrary key-value pairs, e.g. `{"Weather": "Sunny"}` |
| notes | TEXT | Free-text notes |
| created_at | TEXT | Timestamp |
| updated_at | TEXT | Timestamp |

## Seed Data

The database is seeded with default race types on first run:

| Type | Disciplines | Result Type |
|------|-------------|-------------|
| Running | — | Time |
| Triathlon | swim, cycle, run | Time |
| Duathlon | run_1, cycle, run_2 | Time |
| Swimming | — | Time |
| Cycling | — | Time |
| Timed Run | — | Distance |
| Timed Cycling | — | Distance |
