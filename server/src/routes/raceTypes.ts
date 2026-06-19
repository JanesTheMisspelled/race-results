import { Router, Request, Response } from "express";
import db from "../database";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  const types = db.prepare("SELECT * FROM race_types ORDER BY name").all();
  res.json(
    types.map((t: any) => ({
      ...t,
      discipline_fields: JSON.parse(t.discipline_fields),
    }))
  );
});

router.get("/:id", (req: Request, res: Response) => {
  const type = db.prepare("SELECT * FROM race_types WHERE id = ?").get(req.params.id) as any;
  if (!type) return res.status(404).json({ error: "Race type not found" });
  res.json({ ...type, discipline_fields: JSON.parse(type.discipline_fields) });
});

router.get("/:id/results", (req: Request, res: Response) => {
  const type = db.prepare("SELECT * FROM race_types WHERE id = ?").get(req.params.id) as any;
  if (!type) return res.status(404).json({ error: "Race type not found" });

  const results = db
    .prepare(
      `SELECT rr.*, r.name as race_name, r.location, r.race_type_id,
              rt.name as race_type_name, rt.discipline_fields, rt.result_type
       FROM race_results rr
       JOIN races r ON rr.race_id = r.id
       JOIN race_types rt ON r.race_type_id = rt.id
       WHERE rt.id = ?
       ORDER BY rr.year DESC, rr.id DESC`
    )
    .all(req.params.id);

  res.json(
    results.map((r: any) => ({
      ...r,
      discipline_data: JSON.parse(r.discipline_data),
      additional_info: JSON.parse(r.additional_info),
      discipline_fields: JSON.parse(r.discipline_fields),
      organizer_changed: !!r.organizer_changed,
    }))
  );
});

router.post("/", (req: Request, res: Response) => {
  const { name, discipline_fields, result_type } = req.body;
  if (!name || !Array.isArray(discipline_fields)) {
    return res.status(400).json({ error: "name and discipline_fields are required" });
  }
  const rtype = result_type === "distance" || result_type === "laps" ? result_type : "time";
  try {
    const result = db.prepare("INSERT INTO race_types (name, discipline_fields, result_type) VALUES (?, ?, ?)").run(name, JSON.stringify(discipline_fields), rtype);
    const type = db.prepare("SELECT * FROM race_types WHERE id = ?").get(result.lastInsertRowid) as any;
    res.status(201).json({ ...type, discipline_fields: JSON.parse(type.discipline_fields) });
  } catch (err: any) {
    if (err.message.includes("UNIQUE")) return res.status(409).json({ error: "Race type name already exists" });
    throw err;
  }
});

router.put("/:id", (req: Request, res: Response) => {
  const { name, discipline_fields, result_type } = req.body;
  const existing = db.prepare("SELECT * FROM race_types WHERE id = ?").get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: "Race type not found" });

  const newName = name ?? existing.name;
  const newFields = discipline_fields !== undefined ? discipline_fields : JSON.parse(existing.discipline_fields);
  const newResultType =
    result_type === "distance" || result_type === "laps"
      ? result_type
      : result_type === "time"
        ? "time"
        : existing.result_type || "time";

  try {
    db.prepare("UPDATE race_types SET name = ?, discipline_fields = ?, result_type = ? WHERE id = ?").run(newName, JSON.stringify(newFields), newResultType, req.params.id);
    const updated = db.prepare("SELECT * FROM race_types WHERE id = ?").get(req.params.id) as any;
    res.json({ ...updated, discipline_fields: JSON.parse(updated.discipline_fields) });
  } catch (err: any) {
    if (err.message.includes("UNIQUE")) return res.status(409).json({ error: "Race type name already exists" });
    throw err;
  }
});

router.delete("/:id", (req: Request, res: Response) => {
  const result = db.prepare("DELETE FROM race_types WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Race type not found" });
  res.status(204).send();
});

export default router;
