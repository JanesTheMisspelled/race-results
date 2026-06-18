import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  IconButton,
  Chip,
  Snackbar,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { ArrowBack, Add, ArrowUpward, ArrowDownward, Delete } from "@mui/icons-material";
import {
  getResult,
  createResult,
  updateResult,
  getRaces,
  getRaceTypes,
  formatTime,
  parseTime,
  getResultImages,
  addResultImage,
  updateImage,
  deleteImage,
} from "../api";
import type { Race, RaceType, RaceImage } from "../types";

export default function ResultForm() {
  const { id } = useParams<{ id: string }>();
  const { raceId: preselectedRaceId } = useParams<{ raceId: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [races, setRaces] = useState<Race[]>([]);
  const [raceTypes, setRaceTypes] = useState<RaceType[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState<number>(preselectedRaceId ? Number(preselectedRaceId) : 0);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [totalTime, setTotalTime] = useState("");
  const [distance, setDistance] = useState("");
  const [disciplineData, setDisciplineData] = useState<Record<string, string>>({});
  const [additionalInfo, setAdditionalInfo] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [organizerChanged, setOrganizerChanged] = useState(false);
  const [newInfoKey, setNewInfoKey] = useState("");
  const [newInfoValue, setNewInfoValue] = useState("");
  const [images, setImages] = useState<RaceImage[]>([]);
  const [captionDrafts, setCaptionDrafts] = useState<Record<number, string>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([getRaces(), getRaceTypes()]).then(([r, t]) => {
      setRaces(r);
      setRaceTypes(t);
    });
    if (isEdit) {
      getResult(Number(id)).then((result) => {
        setSelectedRaceId(result.race_id);
        setYear(result.year);
        setTotalTime(result.total_time ? formatTime(result.total_time) : "");
        setDistance(result.distance ? String(result.distance) : "");
        setDisciplineData(
          Object.fromEntries(Object.entries(result.discipline_data).map(([k, v]) => [k, formatTime(v)]))
        );
        setAdditionalInfo(result.additional_info);
        setNotes(result.notes);
        setOrganizerChanged(!!result.organizer_changed);
      });
      getResultImages(Number(id))
        .then((imgs) => {
          setImages(imgs);
          setCaptionDrafts(Object.fromEntries(imgs.map((im) => [im.id, im.caption || ""])));
        })
        .catch(() => setError("Failed to load images"));
    }
  }, [id]);

  const selectedRace = races.find((r) => r.id === selectedRaceId);
  const selectedType = raceTypes.find((t) => t.id === selectedRace?.race_type_id);
  const disciplineFields = selectedType?.discipline_fields || [];
  const isDistanceType = selectedType?.result_type === "distance";

  const handleSave = async () => {
    if (!selectedRaceId || !year) {
      setError("Race and year are required");
      return;
    }
    if (!isDistanceType && !totalTime) {
      setError("Total time is required for time-based races");
      return;
    }
    if (isDistanceType && !distance) {
      setError("Distance is required for distance-based races");
      return;
    }

    const parsedDiscipline: Record<string, number> = {};
    for (const field of disciplineFields) {
      const val = disciplineData[field];
      if (val) parsedDiscipline[field] = parseTime(val);
    }

    const data = {
      race_id: selectedRaceId,
      year,
      total_time: isDistanceType ? 0 : parseTime(totalTime),
      distance: isDistanceType ? parseFloat(distance) : 0,
      discipline_data: parsedDiscipline,
      additional_info: Object.fromEntries(Object.entries(additionalInfo).filter(([, v]) => v.trim() !== "")),
      notes,
      organizer_changed: organizerChanged,
    };

    try {
      if (isEdit) {
        await updateResult(Number(id), data);
      } else {
        await createResult(data);
      }
      navigate(selectedRaceId ? `/race/${selectedRaceId}` : "/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save result");
    }
  };

  const addInfo = () => {
    if (newInfoKey.trim()) {
      setAdditionalInfo({ ...additionalInfo, [newInfoKey.trim()]: newInfoValue });
      setNewInfoKey("");
      setNewInfoValue("");
    }
  };

  const removeInfo = (key: string) => {
    const copy = { ...additionalInfo };
    delete copy[key];
    setAdditionalInfo(copy);
  };

  const readFileAsDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    if (images.length + files.length > 20) {
      setError("Maximum 20 images per result");
      return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        const dataUrl = await readFileAsDataURL(file);
        const added = await addResultImage(Number(id), {
          filename: file.name,
          mime_type: file.type,
          data: dataUrl,
        });
        setImages((prev) => [...prev, added]);
        setCaptionDrafts((d) => ({ ...d, [added.id]: added.caption || "" }));
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e?.response?.data?.error || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleCaptionBlur = async (image: RaceImage, value: string) => {
    if (value === (image.caption || "")) return;
    try {
      const updated = await updateImage(image.id, { caption: value });
      setImages((prev) => prev.map((im) => (im.id === image.id ? updated : im)));
      setCaptionDrafts((d) => ({ ...d, [image.id]: value }));
    } catch {
      setError("Failed to save caption");
    }
  };

  const moveImage = async (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= images.length) return;
    const a = images[index];
    const b = images[newIndex];
    const reordered = [...images];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    setImages(reordered);
    try {
      await Promise.all([
        updateImage(a.id, { sort_order: b.sort_order }),
        updateImage(b.id, { sort_order: a.sort_order }),
      ]);
    } catch {
      setError("Failed to reorder image");
      getResultImages(Number(id)).then(setImages).catch(() => undefined);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    try {
      await deleteImage(imageId);
      setImages((prev) => prev.filter((im) => im.id !== imageId));
    } catch {
      setError("Failed to delete image");
    }
  };

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4">{isEdit ? "Edit Result" : "Add Result"}</Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 700 }}>
          <FormControl fullWidth disabled={isEdit}>
            <InputLabel>Race</InputLabel>
            <Select value={selectedRaceId} label="Race" onChange={(e) => setSelectedRaceId(Number(e.target.value))}>
              {races.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name} ({r.race_type_name})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedRace && (
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Chip
                label={isDistanceType ? "Distance-based" : "Time-based"}
                size="small"
                color={isDistanceType ? "secondary" : "primary"}
                variant="outlined"
              />
              <Chip label={selectedRace.race_type_name} size="small" />
              {selectedRace.location && (
                <Typography variant="body2" color="text.secondary">{selectedRace.location}</Typography>
              )}
            </Box>
          )}

          <TextField
            label="Year"
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            fullWidth
            slotProps={{ htmlInput: { min: 1900, max: 2100 } }}
          />

          {isDistanceType ? (
            <TextField
              label="Distance (km)"
              type="number"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              fullWidth
              placeholder="42.195"
              required
              slotProps={{ htmlInput: { step: "0.01", min: 0 } }}
              helperText="How far did you go?"
            />
          ) : (
            <TextField
              label="Total Time (HH:MM:SS or MM:SS)"
              value={totalTime}
              onChange={(e) => setTotalTime(e.target.value)}
              fullWidth
              placeholder="1:30:00"
              required
              helperText="Format: HH:MM:SS or MM:SS"
            />
          )}

          {disciplineFields.length > 0 && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Discipline Splits</Typography>
              <Grid container spacing={2}>
                {disciplineFields.map((field) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={field}>
                    <TextField
                      label={`${field.charAt(0).toUpperCase() + field.slice(1)} Time (HH:MM:SS or MM:SS)`}
                      value={disciplineData[field] || ""}
                      onChange={(e) => setDisciplineData({ ...disciplineData, [field]: e.target.value })}
                      fullWidth
                      placeholder="0:30:00"
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Additional Information</Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
              {Object.entries(additionalInfo).map(([k, v]) => (
                <Chip key={k} label={`${k}: ${v}`} onDelete={() => removeInfo(k)} />
              ))}
            </Box>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <TextField size="small" label="Key" value={newInfoKey} onChange={(e) => setNewInfoKey(e.target.value)} placeholder="e.g. Weather" />
              <TextField size="small" label="Value" value={newInfoValue} onChange={(e) => setNewInfoValue(e.target.value)} placeholder="e.g. Sunny" />
              <Button onClick={addInfo} startIcon={<Add />} disabled={!newInfoKey.trim()}>
                Add
              </Button>
            </Box>
          </Box>

          <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline rows={3} />

          <FormControl sx={{ width: "fit-content" }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={organizerChanged}
                  onChange={(e) => setOrganizerChanged(e.target.checked)}
                />
              }
              label="Changed by Race Organizer"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: -0.5, pl: 4 }}>
              Excluded from the Progress Over Time chart.
            </Typography>
          </FormControl>

          {isEdit && (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="subtitle1">Photos</Typography>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || images.length >= 20}
                >
                  Add Photos
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  hidden
                  onChange={handleFileSelect}
                />
              </Box>
              {uploading && <LinearProgress sx={{ mb: 1 }} />}
              {images.length === 0 && !uploading ? (
                <Typography variant="body2" color="text.secondary">
                  No photos yet.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {images.map((im, idx) => (
                    <Grid size={{ xs: 12, sm: 6 }} key={im.id}>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Box
                          component="img"
                          src={im.thumbnail}
                          alt={im.filename}
                          sx={{ width: 80, height: 80, objectFit: "cover", borderRadius: 1, flexShrink: 0 }}
                        />
                        <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
                          <TextField
                            size="small"
                            label="Caption"
                            value={captionDrafts[im.id] ?? ""}
                            onChange={(e) =>
                              setCaptionDrafts((d) => ({ ...d, [im.id]: e.target.value }))
                            }
                            onBlur={(e) => handleCaptionBlur(im, e.target.value)}
                            fullWidth
                          />
                          <Box sx={{ display: "flex", gap: 0.5 }}>
                            <IconButton size="small" disabled={idx === 0} onClick={() => moveImage(idx, -1)}>
                              <ArrowUpward fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              disabled={idx === images.length - 1}
                              onClick={() => moveImage(idx, 1)}
                            >
                              <ArrowDownward fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteImage(im.id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}

          <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
            <Button onClick={() => navigate(-1)}>Cancel</Button>
            <Button variant="contained" onClick={handleSave}>
              {isEdit ? "Update" : "Create"} Result
            </Button>
          </Box>
        </Box>
      </Paper>

      <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError("")}>
        <Alert severity="error" onClose={() => setError("")}>{error}</Alert>
      </Snackbar>
    </>
  );
}
