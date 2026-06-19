import dotenv from "dotenv";
import BetterSqlite3 from "better-sqlite3";
import path from "path";
import fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "race-results.db");

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db: BetterSqlite3.Database = new BetterSqlite3(DB_PATH);

db.pragma("journal_mode = DELETE");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS race_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    discipline_fields TEXT NOT NULL DEFAULT '[]',
    result_type TEXT NOT NULL DEFAULT 'time' CHECK(result_type IN ('time', 'distance', 'laps'))
  );

  CREATE TABLE IF NOT EXISTS races (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    race_type_id INTEGER NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (race_type_id) REFERENCES race_types(id) ON DELETE RESTRICT,
    UNIQUE(name)
  );

  CREATE TABLE IF NOT EXISTS race_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    race_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    total_time INTEGER NOT NULL DEFAULT 0,
    distance REAL NOT NULL DEFAULT 0,
    laps INTEGER NOT NULL DEFAULT 0,
    discipline_data TEXT NOT NULL DEFAULT '{}',
    additional_info TEXT NOT NULL DEFAULT '{}',
    notes TEXT NOT NULL DEFAULT '',
    organizer_changed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (race_id) REFERENCES races(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS race_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    result_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    data BLOB NOT NULL,
    thumbnail BLOB NOT NULL,
    caption TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (result_id) REFERENCES race_results(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_race_images_result ON race_images(result_id);
`);

const hasResultType = db.prepare("PRAGMA table_info(race_types)").all().some((col: any) => col.name === "result_type");
if (!hasResultType) {
  db.exec("ALTER TABLE race_types ADD COLUMN result_type TEXT NOT NULL DEFAULT 'time' CHECK(result_type IN ('time', 'distance', 'laps'))");
}

// The result_type CHECK constraint must allow 'laps'. Older databases have a
// tighter constraint, so rebuild the table when 'laps' is not yet permitted.
const raceTypesSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='race_types'").get() as { sql: string } | undefined;
if (raceTypesSchema && !raceTypesSchema.sql.includes("'laps'")) {
  db.pragma("foreign_keys = OFF");
  db.exec(`
    CREATE TABLE race_types__new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      discipline_fields TEXT NOT NULL DEFAULT '[]',
      result_type TEXT NOT NULL DEFAULT 'time' CHECK(result_type IN ('time', 'distance', 'laps'))
    );
    INSERT INTO race_types__new (id, name, discipline_fields, result_type)
      SELECT id, name, discipline_fields, result_type FROM race_types;
    DROP TABLE race_types;
    ALTER TABLE race_types__new RENAME TO race_types;
  `);
  db.pragma("foreign_keys = ON");
}

const hasDistance = db.prepare("PRAGMA table_info(race_results)").all().some((col: any) => col.name === "distance");
if (!hasDistance) {
  db.exec("ALTER TABLE race_results ADD COLUMN distance REAL NOT NULL DEFAULT 0");
}

const hasLaps = db.prepare("PRAGMA table_info(race_results)").all().some((col: any) => col.name === "laps");
if (!hasLaps) {
  db.exec("ALTER TABLE race_results ADD COLUMN laps INTEGER NOT NULL DEFAULT 0");
}

const hasOrganizerChanged = db.prepare("PRAGMA table_info(race_results)").all().some((col: any) => col.name === "organizer_changed");
if (!hasOrganizerChanged) {
  db.exec("ALTER TABLE race_results ADD COLUMN organizer_changed INTEGER NOT NULL DEFAULT 0");
}

const seedRaceTypes = db.prepare("SELECT COUNT(*) as count FROM race_types").get() as { count: number };

if (seedRaceTypes.count === 0) {
  const insertType = db.prepare("INSERT INTO race_types (name, discipline_fields, result_type) VALUES (?, ?, ?)");
  insertType.run("Running", JSON.stringify([]), "time");
  insertType.run("Triathlon", JSON.stringify(["swim", "cycle", "run"]), "time");
  insertType.run("Duathlon", JSON.stringify(["run_1", "cycle", "run_2"]), "time");
  insertType.run("Swimming", JSON.stringify([]), "time");
  insertType.run("Cycling", JSON.stringify([]), "time");
  insertType.run("Timed Run", JSON.stringify([]), "distance");
  insertType.run("Timed Cycling", JSON.stringify([]), "distance");
  insertType.run("Laps", JSON.stringify([]), "laps");
}

export default db;
