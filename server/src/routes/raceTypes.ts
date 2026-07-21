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

router.get("/shadows", (_req: Request, res: Response) => {
  const rows = db
    .prepare(
      `SELECT s.*, rt.name as target_race_type_name, rt.result_type as target_result_type
       FROM race_type_shadows s
       JOIN race_types rt ON s.target_race_type_id = rt.id
       ORDER BY s.target_race_type_id, s.discipline_field`
    )
    .all();
  res.json(rows);
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

  const parsed = results.map((r: any) => ({
    ...r,
    discipline_data: JSON.parse(r.discipline_data),
    additional_info: JSON.parse(r.additional_info),
    discipline_fields: JSON.parse(r.discipline_fields),
    organizer_changed: !!r.organizer_changed,
  }));

  const shadowRows = buildShadowResults(Number(req.params.id));
  const combined = [...parsed, ...shadowRows].sort((a: any, b: any) => {
    if (b.year !== a.year) return b.year - a.year;
    const sa = a.is_shadow ? 1 : 0;
    const sb = b.is_shadow ? 1 : 0;
    if (sa !== sb) return sa - sb;
    return b.id - a.id;
  });

  res.json(combined);
});

function buildShadowResults(targetTypeId: number): any[] {
  const target = db.prepare("SELECT * FROM race_types WHERE id = ?").get(targetTypeId) as any;
  if (!target) return [];

  const shadows = db
    .prepare(
      `SELECT s.*, src.name as source_race_type_name, src.discipline_fields as source_discipline_fields
       FROM race_type_shadows s
       JOIN race_types src ON s.source_race_type_id = src.id
       WHERE s.target_race_type_id = ?`
    )
    .all(targetTypeId) as any[];

  const targetFields = JSON.parse(target.discipline_fields);
  const rows: any[] = [];

  for (const s of shadows) {
    const sourceFields: string[] = JSON.parse(s.source_discipline_fields);
    if (!sourceFields.includes(s.discipline_field)) continue;

    const parents = db
      .prepare(
        `SELECT rr.*, r.name as race_name, r.location
         FROM race_results rr
         JOIN races r ON rr.race_id = r.id
         JOIN race_types rt ON r.race_type_id = rt.id
         WHERE rt.id = ?`
      )
      .all(s.source_race_type_id) as any[];

    for (const p of parents) {
      const dd = JSON.parse(p.discipline_data);
      const split = Number(dd[s.discipline_field]);
      if (!split || split <= 0) continue;

      rows.push({
        id: -(s.id * 100000000 + p.id),
        race_id: p.race_id,
        year: p.year,
        total_time: split,
        distance: 0,
        laps: 0,
        discipline_data: {},
        additional_info: JSON.parse(p.additional_info),
        notes: p.notes,
        organizer_changed: !!p.organizer_changed,
        created_at: p.created_at,
        updated_at: p.updated_at,
        race_name: `${p.race_name} (${s.discipline_field})`,
        location: p.location,
        race_type_id: target.id,
        race_type_name: target.name,
        discipline_fields: targetFields,
        result_type: target.result_type,
        is_shadow: true,
        shadow_discipline: s.discipline_field,
        shadow_parent_result_id: p.id,
        shadow_source_race_type_id: s.source_race_type_id,
        shadow_source_race_type_name: s.source_race_type_name,
      });
    }
  }

  return rows;
}

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

router.get("/:id/shadows", (req: Request, res: Response) => {
  const rows = db
    .prepare(
      `SELECT s.*, rt.name as target_race_type_name, rt.result_type as target_result_type
       FROM race_type_shadows s
       JOIN race_types rt ON s.target_race_type_id = rt.id
       WHERE s.source_race_type_id = ?
       ORDER BY s.discipline_field`
    )
    .all(req.params.id);
  res.json(rows);
});

router.post("/:id/shadows", (req: Request, res: Response) => {
  const { discipline_field, target_race_type_id } = req.body;
  if (!discipline_field || !target_race_type_id) {
    return res.status(400).json({ error: "discipline_field and target_race_type_id are required" });
  }
  const sourceId = Number(req.params.id);
  const targetId = Number(target_race_type_id);
  if (sourceId === targetId) {
    return res.status(400).json({ error: "Cannot link a discipline to the same race type" });
  }
  const src = db.prepare("SELECT * FROM race_types WHERE id = ?").get(sourceId) as any;
  if (!src) return res.status(404).json({ error: "Source race type not found" });
  const fields: string[] = JSON.parse(src.discipline_fields);
  if (!fields.includes(discipline_field)) {
    return res.status(400).json({ error: "Discipline field does not exist on this race type" });
  }
  const tgt = db.prepare("SELECT * FROM race_types WHERE id = ?").get(targetId) as any;
  if (!tgt) return res.status(404).json({ error: "Target race type not found" });

  try {
    const result = db
      .prepare("INSERT INTO race_type_shadows (source_race_type_id, discipline_field, target_race_type_id) VALUES (?, ?, ?)")
      .run(sourceId, discipline_field, targetId);
    const row = db
      .prepare(
        `SELECT s.*, rt.name as target_race_type_name, rt.result_type as target_result_type
         FROM race_type_shadows s
         JOIN race_types rt ON s.target_race_type_id = rt.id
         WHERE s.id = ?`
      )
      .get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (err: any) {
    if (err.message.includes("UNIQUE")) return res.status(409).json({ error: "This shadow link already exists" });
    throw err;
  }
});

router.delete("/shadows/:shadowId", (req: Request, res: Response) => {
  const result = db.prepare("DELETE FROM race_type_shadows WHERE id = ?").run(req.params.shadowId);
  if (result.changes === 0) return res.status(404).json({ error: "Shadow not found" });
  res.status(204).send();
});

export default router;
