import BetterSqlite3 from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(__dirname, "..", "race-results.db");

const db: BetterSqlite3.Database = new BetterSqlite3(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS race_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    discipline_fields TEXT NOT NULL DEFAULT '[]'
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
    total_time INTEGER NOT NULL,
    discipline_data TEXT NOT NULL DEFAULT '{}',
    additional_info TEXT NOT NULL DEFAULT '{}',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (race_id) REFERENCES races(id) ON DELETE CASCADE
  );
`);

const seedRaceTypes = db.prepare("SELECT COUNT(*) as count FROM race_types").get() as { count: number };

if (seedRaceTypes.count === 0) {
  const insertType = db.prepare("INSERT INTO race_types (name, discipline_fields) VALUES (?, ?)");
  insertType.run("Running", JSON.stringify([]));
  insertType.run("Triathlon", JSON.stringify(["swim", "cycle", "run"]));
  insertType.run("Duathlon", JSON.stringify(["run_1", "cycle", "run_2"]));
  insertType.run("Swimming", JSON.stringify([]));
  insertType.run("Cycling", JSON.stringify([]));
}

export default db;
