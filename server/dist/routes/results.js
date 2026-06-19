"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../database"));
const router = (0, express_1.Router)();
const RESULT_FIELDS = `
  rr.*, r.name as race_name, r.location, r.race_type_id,
  rt.name as race_type_name, rt.discipline_fields, rt.result_type
`.trim();
const JOIN = `
  FROM race_results rr
  JOIN races r ON rr.race_id = r.id
  JOIN race_types rt ON r.race_type_id = rt.id
`;
function parseRow(r) {
    return {
        ...r,
        discipline_data: JSON.parse(r.discipline_data),
        additional_info: JSON.parse(r.additional_info),
        discipline_fields: JSON.parse(r.discipline_fields),
        organizer_changed: !!r.organizer_changed,
    };
}
router.get("/", (req, res) => {
    const raceId = req.query.race_id;
    const results = raceId
        ? database_1.default.prepare(`SELECT ${RESULT_FIELDS} ${JOIN} WHERE rr.race_id = ? ORDER BY rr.year DESC`).all(raceId)
        : database_1.default.prepare(`SELECT ${RESULT_FIELDS} ${JOIN} ORDER BY rr.year DESC, r.name`).all();
    res.json(results.map(parseRow));
});
router.get("/:id", (req, res) => {
    const result = database_1.default.prepare(`SELECT ${RESULT_FIELDS} ${JOIN} WHERE rr.id = ?`).get(req.params.id);
    if (!result)
        return res.status(404).json({ error: "Result not found" });
    res.json(parseRow(result));
});
router.post("/", (req, res) => {
    const { race_id, year, total_time, distance, laps, discipline_data, additional_info, notes, organizer_changed } = req.body;
    if (!race_id || !year) {
        return res.status(400).json({ error: "race_id and year are required" });
    }
    try {
        const result = database_1.default
            .prepare(`INSERT INTO race_results (race_id, year, total_time, distance, laps, discipline_data, additional_info, notes, organizer_changed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(race_id, year, total_time || 0, distance || 0, laps || 0, JSON.stringify(discipline_data || {}), JSON.stringify(additional_info || {}), notes || "", organizer_changed ? 1 : 0);
        const row = database_1.default.prepare(`SELECT ${RESULT_FIELDS} ${JOIN} WHERE rr.id = ?`).get(result.lastInsertRowid);
        res.status(201).json(parseRow(row));
    }
    catch (err) {
        if (err.message.includes("FOREIGN"))
            return res.status(400).json({ error: "Invalid race_id" });
        throw err;
    }
});
router.put("/:id", (req, res) => {
    const existing = database_1.default.prepare("SELECT * FROM race_results WHERE id = ?").get(req.params.id);
    if (!existing)
        return res.status(404).json({ error: "Result not found" });
    const { race_id = existing.race_id, year = existing.year, total_time = existing.total_time, distance = existing.distance, laps = existing.laps, discipline_data = JSON.parse(existing.discipline_data), additional_info = JSON.parse(existing.additional_info), notes = existing.notes, organizer_changed = existing.organizer_changed, } = req.body;
    database_1.default.prepare(`UPDATE race_results
     SET race_id = ?, year = ?, total_time = ?, distance = ?, laps = ?, discipline_data = ?, additional_info = ?, notes = ?, organizer_changed = ?, updated_at = datetime('now')
     WHERE id = ?`).run(race_id, year, total_time, distance, laps, JSON.stringify(discipline_data), JSON.stringify(additional_info), notes, organizer_changed ? 1 : 0, req.params.id);
    const row = database_1.default.prepare(`SELECT ${RESULT_FIELDS} ${JOIN} WHERE rr.id = ?`).get(req.params.id);
    res.json(parseRow(row));
});
router.delete("/:id", (req, res) => {
    const result = database_1.default.prepare("DELETE FROM race_results WHERE id = ?").run(req.params.id);
    if (result.changes === 0)
        return res.status(404).json({ error: "Result not found" });
    res.status(204).send();
});
exports.default = router;
//# sourceMappingURL=results.js.map