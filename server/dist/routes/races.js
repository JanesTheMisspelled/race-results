"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../database"));
const router = (0, express_1.Router)();
router.get("/", (_req, res) => {
    const races = database_1.default
        .prepare(`SELECT r.*, rt.name as race_type_name, rt.discipline_fields, rt.result_type
       FROM races r
       JOIN race_types rt ON r.race_type_id = rt.id
       ORDER BY r.name`)
        .all();
    res.json(races.map((r) => ({
        ...r,
        discipline_fields: JSON.parse(r.discipline_fields),
    })));
});
router.get("/:id", (req, res) => {
    const race = database_1.default
        .prepare(`SELECT r.*, rt.name as race_type_name, rt.discipline_fields, rt.result_type
       FROM races r
       JOIN race_types rt ON r.race_type_id = rt.id
       WHERE r.id = ?`)
        .get(req.params.id);
    if (!race)
        return res.status(404).json({ error: "Race not found" });
    res.json({ ...race, discipline_fields: JSON.parse(race.discipline_fields) });
});
router.get("/:id/results", (req, res) => {
    const race = database_1.default.prepare("SELECT * FROM races WHERE id = ?").get(req.params.id);
    if (!race)
        return res.status(404).json({ error: "Race not found" });
    const results = database_1.default
        .prepare(`SELECT rr.*, r.name as race_name, r.location, r.race_type_id,
              rt.name as race_type_name, rt.discipline_fields, rt.result_type
       FROM race_results rr
       JOIN races r ON rr.race_id = r.id
       JOIN race_types rt ON r.race_type_id = rt.id
       WHERE rr.race_id = ?
       ORDER BY rr.year`)
        .all(req.params.id);
    res.json(results.map((r) => ({
        ...r,
        discipline_data: JSON.parse(r.discipline_data),
        additional_info: JSON.parse(r.additional_info),
        discipline_fields: JSON.parse(r.discipline_fields),
    })));
});
router.post("/", (req, res) => {
    const { name, race_type_id, location } = req.body;
    if (!name || !race_type_id) {
        return res.status(400).json({ error: "name and race_type_id are required" });
    }
    try {
        const result = database_1.default.prepare("INSERT INTO races (name, race_type_id, location) VALUES (?, ?, ?)").run(name, race_type_id, location || "");
        const race = database_1.default
            .prepare(`SELECT r.*, rt.name as race_type_name, rt.discipline_fields, rt.result_type
         FROM races r JOIN race_types rt ON r.race_type_id = rt.id
         WHERE r.id = ?`)
            .get(result.lastInsertRowid);
        res.status(201).json({ ...race, discipline_fields: JSON.parse(race.discipline_fields) });
    }
    catch (err) {
        if (err.message.includes("UNIQUE"))
            return res.status(409).json({ error: "Race name already exists" });
        if (err.message.includes("FOREIGN"))
            return res.status(400).json({ error: "Invalid race_type_id" });
        throw err;
    }
});
router.put("/:id", (req, res) => {
    const { name, race_type_id, location } = req.body;
    const existing = database_1.default.prepare("SELECT * FROM races WHERE id = ?").get(req.params.id);
    if (!existing)
        return res.status(404).json({ error: "Race not found" });
    const newName = name ?? existing.name;
    const newTypeId = race_type_id ?? existing.race_type_id;
    const newLocation = location !== undefined ? location : existing.location;
    try {
        database_1.default.prepare("UPDATE races SET name = ?, race_type_id = ?, location = ? WHERE id = ?").run(newName, newTypeId, newLocation, req.params.id);
        const race = database_1.default
            .prepare(`SELECT r.*, rt.name as race_type_name, rt.discipline_fields, rt.result_type
         FROM races r JOIN race_types rt ON r.race_type_id = rt.id
         WHERE r.id = ?`)
            .get(req.params.id);
        res.json({ ...race, discipline_fields: JSON.parse(race.discipline_fields) });
    }
    catch (err) {
        if (err.message.includes("UNIQUE"))
            return res.status(409).json({ error: "Race name already exists" });
        throw err;
    }
});
router.delete("/:id", (req, res) => {
    const result = database_1.default.prepare("DELETE FROM races WHERE id = ?").run(req.params.id);
    if (result.changes === 0)
        return res.status(404).json({ error: "Race not found" });
    res.status(204).send();
});
exports.default = router;
//# sourceMappingURL=races.js.map