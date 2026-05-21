import { Router, Request, Response } from "express";
import db from "../database";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  const raceId = req.query.race_id as string | undefined;
  let results: any[];

  if (raceId) {
    results = db
      .prepare(
        `SELECT rr.*, r.name as race_name, r.location, r.race_type_id,
                rt.name as race_type_name, rt.discipline_fields
         FROM race_results rr
         JOIN races r ON rr.race_id = r.id
         JOIN race_types rt ON r.race_type_id = rt.id
         WHERE rr.race_id = ?
         ORDER BY rr.year DESC`
      )
      .all(raceId);
  } else {
    results = db
      .prepare(
        `SELECT rr.*, r.name as race_name, r.location, r.race_type_id,
                rt.name as race_type_name, rt.discipline_fields
         FROM race_results rr
         JOIN races r ON rr.race_id = r.id
         JOIN race_types rt ON r.race_type_id = rt.id
         ORDER BY rr.year DESC, r.name`
      )
      .all();
  }

  res.json(
    results.map((r: any) => ({
      ...r,
      discipline_data: JSON.parse(r.discipline_data),
      additional_info: JSON.parse(r.additional_info),
      discipline_fields: JSON.parse(r.discipline_fields),
    }))
  );
});

router.get("/:id", (req: Request, res: Response) => {
  const result = db
    .prepare(
      `SELECT rr.*, r.name as race_name, r.location, r.race_type_id,
              rt.name as race_type_name, rt.discipline_fields
       FROM race_results rr
       JOIN races r ON rr.race_id = r.id
       JOIN race_types rt ON r.race_type_id = rt.id
       WHERE rr.id = ?`
    )
    .get(req.params.id) as any;

  if (!result) return res.status(404).json({ error: "Result not found" });
  res.json({
    ...result,
    discipline_data: JSON.parse(result.discipline_data),
    additional_info: JSON.parse(result.additional_info),
    discipline_fields: JSON.parse(result.discipline_fields),
  });
});

router.post("/", (req: Request, res: Response) => {
  const { race_id, year, total_time, discipline_data, additional_info, notes } = req.body;
  if (!race_id || !year || total_time === undefined) {
    return res.status(400).json({ error: "race_id, year, and total_time are required" });
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO race_results (race_id, year, total_time, discipline_data, additional_info, notes)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(race_id, year, total_time, JSON.stringify(discipline_data || {}), JSON.stringify(additional_info || {}), notes || "");

    const row = db
      .prepare(
        `SELECT rr.*, r.name as race_name, r.location, r.race_type_id,
                rt.name as race_type_name, rt.discipline_fields
         FROM race_results rr
         JOIN races r ON rr.race_id = r.id
         JOIN race_types rt ON r.race_type_id = rt.id
         WHERE rr.id = ?`
      )
      .get(result.lastInsertRowid) as any;

    res.status(201).json({
      ...row,
      discipline_data: JSON.parse(row.discipline_data),
      additional_info: JSON.parse(row.additional_info),
      discipline_fields: JSON.parse(row.discipline_fields),
    });
  } catch (err: any) {
    if (err.message.includes("FOREIGN")) return res.status(400).json({ error: "Invalid race_id" });
    throw err;
  }
});

router.put("/:id", (req: Request, res: Response) => {
  const existing = db.prepare("SELECT * FROM race_results WHERE id = ?").get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: "Result not found" });

  const {
    race_id = existing.race_id,
    year = existing.year,
    total_time = existing.total_time,
    discipline_data = JSON.parse(existing.discipline_data),
    additional_info = JSON.parse(existing.additional_info),
    notes = existing.notes,
  } = req.body;

  db.prepare(
    `UPDATE race_results
     SET race_id = ?, year = ?, total_time = ?, discipline_data = ?, additional_info = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(race_id, year, total_time, JSON.stringify(discipline_data), JSON.stringify(additional_info), notes, req.params.id);

  const row = db
    .prepare(
      `SELECT rr.*, r.name as race_name, r.location, r.race_type_id,
              rt.name as race_type_name, rt.discipline_fields
       FROM race_results rr
       JOIN races r ON rr.race_id = r.id
       JOIN race_types rt ON r.race_type_id = rt.id
       WHERE rr.id = ?`
    )
    .get(req.params.id) as any;

  res.json({
    ...row,
    discipline_data: JSON.parse(row.discipline_data),
    additional_info: JSON.parse(row.additional_info),
    discipline_fields: JSON.parse(row.discipline_fields),
  });
});

router.delete("/:id", (req: Request, res: Response) => {
  const result = db.prepare("DELETE FROM race_results WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Result not found" });
  res.status(204).send();
});

export default router;
