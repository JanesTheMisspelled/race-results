import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Chip,
  Snackbar,
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  Tooltip as MuiTooltip,
} from "@mui/material";
import { Add, Edit, Delete, ArrowBack, ChevronLeft, ChevronRight, ReportProblem } from "@mui/icons-material";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getRace, getRaceResults, deleteResult, formatTime, formatResult, getResultImages, imageUrl } from "../api";
import type { Race, RaceResult, RaceImage } from "../types";

export default function RaceHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [race, setRace] = useState<Race | null>(null);
  const [results, setResults] = useState<RaceResult[]>([]);
  const [imagesByResult, setImagesByResult] = useState<Record<number, RaceImage[]>>({});
  const [lightbox, setLightbox] = useState<{ resultId: number; index: number } | null>(null);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!id) return;
    try {
      const [r, res] = await Promise.all([getRace(Number(id)), getRaceResults(Number(id))]);
      setRace(r);
      setResults(res);
      const entries = await Promise.all(
        res.map(async (rr) => [rr.id, await getResultImages(rr.id).catch(() => [])] as const)
      );
      setImagesByResult(Object.fromEntries(entries));
    } catch {
      setError("Failed to load race data");
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleDelete = async (resultId: number) => {
    if (!confirm("Delete this result?")) return;
    try {
      await deleteResult(resultId);
      loadData();
    } catch {
      setError("Failed to delete result");
    }
  };

  const lightboxImages: RaceImage[] = lightbox ? imagesByResult[lightbox.resultId] || [] : [];
  const currentImage = lightbox && lightboxImages.length ? lightboxImages[lightbox.index] : null;

  const navLightbox = (dir: number) => {
    setLightbox((prev) => {
      if (!prev || lightboxImages.length === 0) return prev;
      return { ...prev, index: (prev.index + dir + lightboxImages.length) % lightboxImages.length };
    });
  };

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") navLightbox(-1);
      if (e.key === "ArrowRight") navLightbox(1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox, imagesByResult]);

  if (!race) return <Typography>Loading...</Typography>;

  const isDistanceType = race.result_type === "distance";

  const visibleResults = results.filter((r) => !r.organizer_changed);
  const hiddenCount = results.length - visibleResults.length;

  const chartData = visibleResults.map((r) => ({
    year: r.year,
    value: isDistanceType ? r.distance : r.total_time,
    label: formatResult(r),
  }));

  const formatChartValue = (val: number) => isDistanceType ? `${val.toFixed(2)} km` : formatTime(val);

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate("/")}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4">{race.name}</Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 0.5 }}>
            <Chip label={race.race_type_name} />
            <Chip
              label={isDistanceType ? "Distance-based" : "Time-based"}
              size="small"
              color={isDistanceType ? "secondary" : "primary"}
              variant="outlined"
            />
            {race.location && (
              <Typography variant="body2" color="text.secondary">{race.location}</Typography>
            )}
          </Box>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate(`/race/${race.id}/result/new`)}>
          Add Result
        </Button>
      </Box>

      {(chartData.length > 1 || hiddenCount > 0) && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Progress Over Time ({isDistanceType ? "Distance (km)" : "Total Time"})
          </Typography>
          {hiddenCount > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {hiddenCount} result{hiddenCount === 1 ? "" : "s"} hidden — changed by race organizer.
            </Typography>
          )}
          {chartData.length > 1 && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis
                  domain={isDistanceType ? [0, "dataMax + 1"] : ["dataMin - 60", "dataMax + 60"]}
                  tickFormatter={formatChartValue}
                />
                <Tooltip formatter={(value) => [formatChartValue(Number(value)), isDistanceType ? "Distance" : "Total Time"]} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={isDistanceType ? "#9c27b0" : "#1976d2"}
                  strokeWidth={2}
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Paper>
      )}

      <Typography variant="h6" sx={{ mb: 1 }}>Results</Typography>
      {results.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
          No results yet. Click "Add Result" to record your first one.
        </Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Year</TableCell>
                <TableCell>{isDistanceType ? "Distance (km)" : "Total Time"}</TableCell>
                {race.discipline_fields && race.discipline_fields.length > 0 &&
                  race.discipline_fields.map((f) => <TableCell key={f} sx={{ textTransform: "capitalize" }}>{f}</TableCell>)}
                <TableCell>Notes</TableCell>
                <TableCell>Extra Info</TableCell>
                <TableCell>Photos</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((r) => (
                <TableRow
                  key={r.id}
                  sx={r.organizer_changed ? { backgroundColor: "rgba(237, 108, 2, 0.12)" } : undefined}
                >
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {r.organizer_changed && (
                        <MuiTooltip title="Changed by race organizer">
                          <ReportProblem fontSize="small" color="warning" />
                        </MuiTooltip>
                      )}
                      {r.year}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>{formatResult(r)}</TableCell>
                  {r.discipline_fields &&
                    r.discipline_fields.map((f) => (
                      <TableCell key={f}>
                        {r.discipline_data[f] !== undefined ? formatTime(r.discipline_data[f]) : "-"}
                      </TableCell>
                    ))}
                  <TableCell sx={{ maxWidth: 200 }}>{r.notes || "-"}</TableCell>
                  <TableCell>
                    {r.additional_info && Object.keys(r.additional_info).length > 0
                      ? Object.entries(r.additional_info).map(([k, v]) => (
                          <Chip key={k} label={`${k}: ${v}`} size="small" sx={{ m: 0.25 }} />
                        ))
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {imagesByResult[r.id] && imagesByResult[r.id].length > 0 ? (
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {imagesByResult[r.id].map((im, idx) => (
                          <Box
                            key={im.id}
                            component="img"
                            src={im.thumbnail}
                            alt={im.caption || im.filename}
                            onClick={() => setLightbox({ resultId: r.id, index: idx })}
                            sx={{ width: 40, height: 40, objectFit: "cover", borderRadius: 0.5, cursor: "pointer" }}
                          />
                        ))}
                      </Box>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => navigate(`/result/${r.id}`)}>
                      <Edit />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(r.id)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={!!lightbox && !!currentImage} onClose={() => setLightbox(null)} maxWidth="md" fullWidth>
        {currentImage && (
          <>
            <DialogContent sx={{ position: "relative", p: 0, overflow: "hidden", lineHeight: 0 }}>
              <Box
                component="img"
                src={imageUrl(currentImage.id)}
                alt={currentImage.caption || currentImage.filename}
                sx={{ width: "100%", display: "block" }}
              />
              {lightboxImages.length > 1 && (
                <>
                  <IconButton
                    onClick={() => navLightbox(-1)}
                    sx={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "white", bgcolor: "rgba(0,0,0,0.4)" }}
                  >
                    <ChevronLeft />
                  </IconButton>
                  <IconButton
                    onClick={() => navLightbox(1)}
                    sx={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "white", bgcolor: "rgba(0,0,0,0.4)" }}
                  >
                    <ChevronRight />
                  </IconButton>
                </>
              )}
            </DialogContent>
            {(currentImage.caption || lightboxImages.length > 1) && (
              <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{currentImage.caption || currentImage.filename}</span>
                {lightboxImages.length > 1 && (
                  <Typography variant="body2" color="text.secondary">
                    {lightbox!.index + 1} / {lightboxImages.length}
                  </Typography>
                )}
              </DialogTitle>
            )}
          </>
        )}
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError("")}>
        <Alert severity="error" onClose={() => setError("")}>{error}</Alert>
      </Snackbar>
    </>
  );
}
