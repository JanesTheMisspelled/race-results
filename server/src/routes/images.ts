import { Router, Request, Response } from "express";
import sharp from "sharp";
import db from "../database";
import { ALLOWED_IMAGE_TYPES } from "../types";

const router = Router();

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PER_RESULT = 20;
const DATA_URI_RE = /^data:[^;]+;base64,/;

async function makeThumbnail(data: Buffer): Promise<Buffer> {
  return sharp(data)
    .resize({ width: 400, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

function toMeta(row: any) {
  return {
    id: row.id,
    result_id: row.result_id,
    filename: row.filename,
    mime_type: row.mime_type,
    caption: row.caption,
    sort_order: row.sort_order,
    created_at: row.created_at,
    thumbnail: row.thumbnail ? `data:image/webp;base64,${row.thumbnail.toString("base64")}` : undefined,
  };
}

// POST /results/:resultId/images
router.post("/results/:resultId/images", async (req: Request, res: Response) => {
  const { resultId } = req.params;
  const { filename, mime_type, data, caption } = req.body || {};

  const result = db.prepare("SELECT id FROM race_results WHERE id = ?").get(resultId);
  if (!result) return res.status(404).json({ error: "Result not found" });

  if (!filename || !mime_type || typeof data !== "string") {
    return res.status(400).json({ error: "filename, mime_type and data are required" });
  }
  if (!ALLOWED_IMAGE_TYPES.includes(mime_type)) {
    return res.status(400).json({ error: `Unsupported image type: ${mime_type}` });
  }

  const count = (db.prepare("SELECT COUNT(*) as c FROM race_images WHERE result_id = ?").get(resultId) as any).c;
  if (count >= MAX_PER_RESULT) {
    return res.status(400).json({ error: `Maximum of ${MAX_PER_RESULT} images per result` });
  }

  const b64 = data.replace(DATA_URI_RE, "");
  let buf: Buffer;
  try {
    buf = Buffer.from(b64, "base64");
  } catch {
    return res.status(400).json({ error: "Invalid base64 data" });
  }
  if (buf.length === 0) return res.status(400).json({ error: "Empty image data" });
  if (buf.length > MAX_BYTES) {
    return res.status(413).json({ error: `Image exceeds ${MAX_BYTES} bytes` });
  }

  let thumbnail: Buffer;
  try {
    thumbnail = await makeThumbnail(buf);
  } catch (err: any) {
    return res.status(400).json({ error: `Could not process image: ${err.message}` });
  }

  const cleanName = String(filename).replace(/[\\/]/g, "_").slice(0, 255);
  const sortOrder =
    (db.prepare("SELECT MAX(sort_order) as m FROM race_images WHERE result_id = ?").get(resultId) as any).m ?? -1;

  try {
    const info = db
      .prepare(
        `INSERT INTO race_images (result_id, filename, mime_type, data, thumbnail, caption, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(resultId, cleanName, mime_type, buf, thumbnail, caption ?? null, sortOrder + 1);

    const row = db.prepare("SELECT * FROM race_images WHERE id = ?").get(info.lastInsertRowid) as any;
    res.status(201).json(toMeta(row));
  } catch (err: any) {
    if (err.message.includes("FOREIGN")) return res.status(400).json({ error: "Invalid result_id" });
    throw err;
  }
});

// GET /results/:resultId/images
router.get("/results/:resultId/images", (req: Request, res: Response) => {
  const { resultId } = req.params;
  const rows = db
    .prepare(
      "SELECT id, result_id, filename, mime_type, caption, sort_order, created_at, thumbnail FROM race_images WHERE result_id = ? ORDER BY sort_order, id"
    )
    .all(resultId);
  res.json(rows.map(toMeta));
});

// GET /images/:id
router.get("/images/:id", (req: Request, res: Response) => {
  const row = db.prepare("SELECT mime_type, data FROM race_images WHERE id = ?").get(req.params.id) as any;
  if (!row) return res.status(404).json({ error: "Image not found" });
  res.setHeader("Content-Type", row.mime_type);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.end(row.data);
});

// PUT /images/:id  (caption and/or sort_order)
router.put("/images/:id", (req: Request, res: Response) => {
  const { caption, sort_order } = req.body || {};
  const existing = db.prepare("SELECT * FROM race_images WHERE id = ?").get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: "Image not found" });

  if (caption === undefined && sort_order === undefined) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  const newCaption = caption !== undefined ? (caption === "" ? null : String(caption)) : existing.caption;
  const newOrder = sort_order !== undefined ? Number(sort_order) : existing.sort_order;

  db.prepare("UPDATE race_images SET caption = ?, sort_order = ? WHERE id = ?").run(
    newCaption,
    newOrder,
    req.params.id
  );

  const row = db
    .prepare("SELECT id, result_id, filename, mime_type, caption, sort_order, created_at, thumbnail FROM race_images WHERE id = ?")
    .get(req.params.id) as any;
  res.json(toMeta(row));
});

// DELETE /images/:id
router.delete("/images/:id", (req: Request, res: Response) => {
  const info = db.prepare("DELETE FROM race_images WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "Image not found" });
  res.status(204).send();
});

export default router;
