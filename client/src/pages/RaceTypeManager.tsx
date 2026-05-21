import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Snackbar,
  Alert,
  MenuItem,
} from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";
import { getRaceTypes, createRaceType, updateRaceType, deleteRaceType } from "../api";
import type { RaceType, ResultType } from "../types";

export default function RaceTypeManager() {
  const [types, setTypes] = useState<RaceType[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<RaceType | null>(null);
  const [formName, setFormName] = useState("");
  const [formFields, setFormFields] = useState<string[]>([]);
  const [formResultType, setFormResultType] = useState<ResultType>("time");
  const [newField, setNewField] = useState("");
  const [error, setError] = useState("");

  const loadTypes = async () => setTypes(await getRaceTypes());

  useEffect(() => {
    loadTypes();
  }, []);

  const openCreate = () => {
    setEditingType(null);
    setFormName("");
    setFormFields([]);
    setFormResultType("time");
    setNewField("");
    setDialogOpen(true);
  };

  const openEdit = (t: RaceType) => {
    setEditingType(t);
    setFormName(t.name);
    setFormFields([...t.discipline_fields]);
    setFormResultType(t.result_type || "time");
    setNewField("");
    setDialogOpen(true);
  };

  const addField = () => {
    if (newField.trim() && !formFields.includes(newField.trim())) {
      setFormFields([...formFields, newField.trim()]);
      setNewField("");
    }
  };

  const removeField = (index: number) => {
    setFormFields(formFields.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      if (editingType) {
        await updateRaceType(editingType.id, { name: formName, discipline_fields: formFields, result_type: formResultType });
      } else {
        await createRaceType({ name: formName, discipline_fields: formFields, result_type: formResultType });
      }
      setDialogOpen(false);
      loadTypes();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this race type? Races using this type will be blocked from deletion.")) return;
    try {
      await deleteRaceType(id);
      loadTypes();
    } catch (err: any) {
      setError(err.response?.data?.error || "Cannot delete race type in use");
    }
  };

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4">Race Types</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          Add Type
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Result Type</TableCell>
              <TableCell>Discipline Fields</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {types.map((t) => (
              <TableRow key={t.id}>
                <TableCell sx={{ textTransform: "capitalize" }}>{t.name}</TableCell>
                <TableCell>
                  <Chip
                    label={t.result_type === "distance" ? "Distance (km)" : "Time"}
                    size="small"
                    color={t.result_type === "distance" ? "secondary" : "primary"}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {t.discipline_fields.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">None</Typography>
                  ) : (
                    t.discipline_fields.map((f) => <Chip key={f} label={f} size="small" sx={{ mr: 0.5 }} />)
                  )}
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => openEdit(t)}>
                    <Edit />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDelete(t.id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingType ? "Edit Race Type" : "Add Race Type"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          <TextField label="Type Name" value={formName} onChange={(e) => setFormName(e.target.value)} fullWidth required />
          <TextField
            select
            label="Result Type"
            value={formResultType}
            onChange={(e) => setFormResultType(e.target.value as ResultType)}
            fullWidth
            required
          >
            <MenuItem value="time">Time — how long it took (lower is better)</MenuItem>
            <MenuItem value="distance">Distance — how far you went (higher is better)</MenuItem>
          </TextField>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Discipline Fields (e.g. swim, cycle, run)
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
              {formFields.map((f, i) => (
                <Chip key={i} label={f} onDelete={() => removeField(i)} />
              ))}
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField size="small" value={newField} onChange={(e) => setNewField(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addField()} placeholder="Add field" />
              <Button onClick={addField} disabled={!newField.trim()}>
                Add
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!formName}>
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
