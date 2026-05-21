import { useState, useEffect } from "react";
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
} from "@mui/material";
import { ArrowBack, Add } from "@mui/icons-material";
import { getResult, createResult, updateResult, getRaces, getRaceTypes, formatTime, parseTime } from "../api";
import type { Race, RaceType } from "../types";

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
  const [disciplineData, setDisciplineData] = useState<Record<string, string>>({});
  const [additionalInfo, setAdditionalInfo] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [newInfoKey, setNewInfoKey] = useState("");
  const [newInfoValue, setNewInfoValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getRaces(), getRaceTypes()]).then(([r, t]) => {
      setRaces(r);
      setRaceTypes(t);
    });
    if (isEdit) {
      getResult(Number(id)).then((result) => {
        setSelectedRaceId(result.race_id);
        setYear(result.year);
        setTotalTime(formatTime(result.total_time));
        setDisciplineData(
          Object.fromEntries(Object.entries(result.discipline_data).map(([k, v]) => [k, formatTime(v)]))
        );
        setAdditionalInfo(result.additional_info);
        setNotes(result.notes);
      });
    }
  }, [id]);

  const selectedRace = races.find((r) => r.id === selectedRaceId);
  const selectedType = raceTypes.find((t) => t.id === selectedRace?.race_type_id);
  const disciplineFields = selectedType?.discipline_fields || [];

  const handleSave = async () => {
    if (!selectedRaceId || !year || !totalTime) {
      setError("Race, year, and total time are required");
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
      total_time: parseTime(totalTime),
      discipline_data: parsedDiscipline,
      additional_info: Object.fromEntries(Object.entries(additionalInfo).filter(([, v]) => v.trim() !== "")),
      notes,
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

          <TextField
            label="Total Time (HH:MM:SS or MM:SS)"
            value={totalTime}
            onChange={(e) => setTotalTime(e.target.value)}
            fullWidth
            placeholder="1:30:00"
            helperText="Format: HH:MM:SS or MM:SS"
          />

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
