"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../database"));
const router = (0, express_1.Router)();
router.get("/", (_req, res) => {
    const types = database_1.default.prepare("SELECT * FROM race_types ORDER BY name").all();
    res.json(types.map((t) => ({
        ...t,
        discipline_fields: JSON.parse(t.discipline_fields),
    })));
});
router.get("/:id", (req, res) => {
    const type = database_1.default.prepare("SELECT * FROM race_types WHERE id = ?").get(req.params.id);
    if (!type)
        return res.status(404).json({ error: "Race type not found" });
    res.json({ ...type, discipline_fields: JSON.parse(type.discipline_fields) });
});
router.get("/:id/results", (req, res) => {
    const type = database_1.default.prepare("SELECT * FROM race_types WHERE id = ?").get(req.params.id);
    if (!type)
        return res.status(404).json({ error: "Race type not found" });
    const results = database_1.default
        .prepare(`SELECT rr.*, r.name as race_name, r.location, r.race_type_id,
              rt.name as race_type_name, rt.discipline_fields, rt.result_type
       FROM race_results rr
       JOIN races r ON rr.race_id = r.id
       JOIN race_types rt ON r.race_type_id = rt.id
       WHERE rt.id = ?
       ORDER BY rr.year DESC, rr.id DESC`)
        .all(req.params.id);
    res.json(results.map((r) => ({
        ...r,
        discipline_data: JSON.parse(r.discipline_data),
        additional_info: JSON.parse(r.additional_info),
        discipline_fields: JSON.parse(r.discipline_fields),
        organizer_changed: !!r.organizer_changed,
    })));
});
router.post("/", (req, res) => {
    const { name, discipline_fields, result_type } = req.body;
    if (!name || !Array.isArray(discipline_fields)) {
        return res.status(400).json({ error: "name and discipline_fields are required" });
    }
    const rtype = result_type === "distance" || result_type === "laps" ? result_type : "time";
    try {
        const result = database_1.default.prepare("INSERT INTO race_types (name, discipline_fields, result_type) VALUES (?, ?, ?)").run(name, JSON.stringify(discipline_fields), rtype);
        const type = database_1.default.prepare("SELECT * FROM race_types WHERE id = ?").get(result.lastInsertRowid);
        res.status(201).json({ ...type, discipline_fields: JSON.parse(type.discipline_fields) });
    }
    catch (err) {
        if (err.message.includes("UNIQUE"))
            return res.status(409).json({ error: "Race type name already exists" });
        throw err;
    }
});
router.put("/:id", (req, res) => {
    const { name, discipline_fields, result_type } = req.body;
    const existing = database_1.default.prepare("SELECT * FROM race_types WHERE id = ?").get(req.params.id);
    if (!existing)
        return res.status(404).json({ error: "Race type not found" });
    const newName = name ?? existing.name;
    const newFields = discipline_fields !== undefined ? discipline_fields : JSON.parse(existing.discipline_fields);
    const newResultType = result_type === "distance" || result_type === "laps"
        ? result_type
        : result_type === "time"
            ? "time"
            : existing.result_type || "time";
    try {
        database_1.default.prepare("UPDATE race_types SET name = ?, discipline_fields = ?, result_type = ? WHERE id = ?").run(newName, JSON.stringify(newFields), newResultType, req.params.id);
        const updated = database_1.default.prepare("SELECT * FROM race_types WHERE id = ?").get(req.params.id);
        res.json({ ...updated, discipline_fields: JSON.parse(updated.discipline_fields) });
    }
    catch (err) {
        if (err.message.includes("UNIQUE"))
            return res.status(409).json({ error: "Race type name already exists" });
        throw err;
    }
});
router.delete("/:id", (req, res) => {
    const result = database_1.default.prepare("DELETE FROM race_types WHERE id = ?").run(req.params.id);
    if (result.changes === 0)
        return res.status(404).json({ error: "Race type not found" });
    res.status(204).send();
});
exports.default = router;
//# sourceMappingURL=raceTypes.js.map