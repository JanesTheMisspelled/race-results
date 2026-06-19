import { Router, Request, Response } from "express";
import db from "../database";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  const races = db
    .prepare(
      `SELECT r.*, rt.name as race_type_name, rt.discipline_fields, rt.result_type
       FROM races r
       JOIN race_types rt ON r.race_type_id = rt.id
       ORDER BY r.name`
    )
    .all();
  res.json(
    races.map((r: any) => ({
      ...r,
      discipline_fields: JSON.parse(r.discipline_fields),
    }))
  );
});

router.get("/:id", (req: Request, res: Response) => {
  const race = db
    .prepare(
      `SELECT r.*, rt.name as race_type_name, rt.discipline_fields, rt.result_type
       FROM races r
       JOIN race_types rt ON r.race_type_id = rt.id
       WHERE r.id = ?`
    )
    .get(req.params.id) as any;
  if (!race) return res.status(404).json({ error: "Race not found" });
  res.json({ ...race, discipline_fields: JSON.parse(race.discipline_fields) });
});

router.get("/:id/results", (req: Request, res: Response) => {
  const race = db.prepare("SELECT * FROM races WHERE id = ?").get(req.params.id) as any;
  if (!race) return res.status(404).json({ error: "Race not found" });

  const results = db
    .prepare(
      `SELECT rr.*, r.name as race_name, r.location, r.race_type_id,
              rt.name as race_type_name, rt.discipline_fields, rt.result_type
       FROM race_results rr
       JOIN races r ON rr.race_id = r.id
       JOIN race_types rt ON r.race_type_id = rt.id
       WHERE rr.race_id = ?
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
  const { name, race_type_id, location } = req.body;
  if (!name || !race_type_id) {
    return res.status(400).json({ error: "name and race_type_id are required" });
  }
  try {
    const result = db.prepare("INSERT INTO races (name, race_type_id, location) VALUES (?, ?, ?)").run(name, race_type_id, location || "");
    const race = db
      .prepare(
        `SELECT r.*, rt.name as race_type_name, rt.discipline_fields, rt.result_type
         FROM races r JOIN race_types rt ON r.race_type_id = rt.id
         WHERE r.id = ?`
      )
      .get(result.lastInsertRowid) as any;
    res.status(201).json({ ...race, discipline_fields: JSON.parse(race.discipline_fields) });
  } catch (err: any) {
    if (err.message.includes("UNIQUE")) return res.status(409).json({ error: "Race name already exists" });
    if (err.message.includes("FOREIGN")) return res.status(400).json({ error: "Invalid race_type_id" });
    throw err;
  }
});

router.put("/:id", (req: Request, res: Response) => {
  const { name, race_type_id, location } = req.body;
  const existing = db.prepare("SELECT * FROM races WHERE id = ?").get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: "Race not found" });

  const newName = name ?? existing.name;
  const newTypeId = race_type_id ?? existing.race_type_id;
  const newLocation = location !== undefined ? location : existing.location;

  try {
    db.prepare("UPDATE races SET name = ?, race_type_id = ?, location = ? WHERE id = ?").run(newName, newTypeId, newLocation, req.params.id);
    const race = db
      .prepare(
        `SELECT r.*, rt.name as race_type_name, rt.discipline_fields, rt.result_type
         FROM races r JOIN race_types rt ON r.race_type_id = rt.id
         WHERE r.id = ?`
      )
      .get(req.params.id) as any;
    res.json({ ...race, discipline_fields: JSON.parse(race.discipline_fields) });
  } catch (err: any) {
    if (err.message.includes("UNIQUE")) return res.status(409).json({ error: "Race name already exists" });
    throw err;
  }
});

router.delete("/:id", (req: Request, res: Response) => {
  const result = db.prepare("DELETE FROM races WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Race not found" });
  res.status(204).send();
});

export default router;
