"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "..", "..", ".env") });
const DB_PATH = process.env.DB_PATH || path_1.default.join(__dirname, "..", "race-results.db");
const dbDir = path_1.default.dirname(DB_PATH);
if (!fs_1.default.existsSync(dbDir)) {
    fs_1.default.mkdirSync(dbDir, { recursive: true });
}
const db = new better_sqlite3_1.default(DB_PATH);
db.pragma("journal_mode = DELETE");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS race_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    discipline_fields TEXT NOT NULL DEFAULT '[]',
    result_type TEXT NOT NULL DEFAULT 'time' CHECK(result_type IN ('time', 'distance'))
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
    discipline_data TEXT NOT NULL DEFAULT '{}',
    additional_info TEXT NOT NULL DEFAULT '{}',
    notes TEXT NOT NULL DEFAULT '',
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
const hasResultType = db.prepare("PRAGMA table_info(race_types)").all().some((col) => col.name === "result_type");
if (!hasResultType) {
    db.exec("ALTER TABLE race_types ADD COLUMN result_type TEXT NOT NULL DEFAULT 'time' CHECK(result_type IN ('time', 'distance'))");
}
const hasDistance = db.prepare("PRAGMA table_info(race_results)").all().some((col) => col.name === "distance");
if (!hasDistance) {
    db.exec("ALTER TABLE race_results ADD COLUMN distance REAL NOT NULL DEFAULT 0");
}
const seedRaceTypes = db.prepare("SELECT COUNT(*) as count FROM race_types").get();
if (seedRaceTypes.count === 0) {
    const insertType = db.prepare("INSERT INTO race_types (name, discipline_fields, result_type) VALUES (?, ?, ?)");
    insertType.run("Running", JSON.stringify([]), "time");
    insertType.run("Triathlon", JSON.stringify(["swim", "cycle", "run"]), "time");
    insertType.run("Duathlon", JSON.stringify(["run_1", "cycle", "run_2"]), "time");
    insertType.run("Swimming", JSON.stringify([]), "time");
    insertType.run("Cycling", JSON.stringify([]), "time");
    insertType.run("Timed Run", JSON.stringify([]), "distance");
    insertType.run("Timed Cycling", JSON.stringify([]), "distance");
}
exports.default = db;
//# sourceMappingURL=database.js.map