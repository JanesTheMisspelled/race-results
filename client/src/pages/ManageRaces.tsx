import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Alert,
  Snackbar,
  MenuItem,
} from "@mui/material";
import { Add, Edit, Delete, TrendingUp } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { getRaces, createRace, updateRace, deleteRace, getRaceTypes } from "../api";
import type { Race, RaceType } from "../types";

export default function ManageRaces() {
  const navigate = useNavigate();
  const [races, setRaces] = useState<Race[]>([]);
  const [raceTypes, setRaceTypes] = useState<RaceType[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRace, setEditingRace] = useState<Race | null>(null);
  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formTypeId, setFormTypeId] = useState<number>(0);
  const [error, setError] = useState("");

  const loadData = async () => {
    const [r, t] = await Promise.all([getRaces(), getRaceTypes()]);
    setRaces(r);
    setRaceTypes(t);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditingRace(null);
    setFormName("");
    setFormLocation("");
    setFormTypeId(raceTypes[0]?.id ?? 0);
    setDialogOpen(true);
  };

  const openEdit = (race: Race) => {
    setEditingRace(race);
    setFormName(race.name);
    setFormLocation(race.location);
    setFormTypeId(race.race_type_id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingRace) {
        await updateRace(editingRace.id, { name: formName, location: formLocation, race_type_id: formTypeId });
      } else {
        await createRace({ name: formName, location: formLocation, race_type_id: formTypeId });
      }
      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save race");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this race and all its results?")) return;
    try {
      await deleteRace(id);
      loadData();
    } catch {
      setError("Failed to delete race");
    }
  };

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4">Races</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          Add Race
        </Button>
      </Box>

      <Grid container spacing={2}>
        {races.map((race) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={race.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{race.name}</Typography>
                <Chip label={race.race_type_name} size="small" sx={{ my: 1 }} />
                {race.result_type === "distance" && (
                  <Chip label="Distance" size="small" color="secondary" variant="outlined" sx={{ my: 1, ml: 0.5 }} />
                )}
                {race.location && (
                  <Typography variant="body2" color="text.secondary">
                    {race.location}
                  </Typography>
                )}
              </CardContent>
              <CardActions>
                <Button size="small" startIcon={<TrendingUp />} onClick={() => navigate(`/race/${race.id}`)}>
                  History
                </Button>
                <IconButton size="small" onClick={() => openEdit(race)}>
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => handleDelete(race.id)}>
                  <Delete fontSize="small" />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {races.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
          No races yet. Click "Add Race" to get started.
        </Typography>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRace ? "Edit Race" : "Add Race"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          <TextField label="Race Name" value={formName} onChange={(e) => setFormName(e.target.value)} fullWidth required />
          <TextField label="Location" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} fullWidth />
          <TextField
            select
            label="Race Type"
            value={formTypeId}
            onChange={(e) => setFormTypeId(Number(e.target.value))}
            fullWidth
            required
          >
            {raceTypes.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!formName || !formTypeId}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError("")}>
        <Alert severity="error" onClose={() => setError("")}>{error}</Alert>
      </Snackbar>
    </>
  );
}
