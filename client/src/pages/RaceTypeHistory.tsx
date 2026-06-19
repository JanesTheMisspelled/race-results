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
  Chip,
  Snackbar,
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  Tooltip as MuiTooltip,
  Link,
} from "@mui/material";
import { Edit, Delete, ArrowBack, ChevronLeft, ChevronRight, ReportProblem } from "@mui/icons-material";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getRaceType, getRaceTypeResults, deleteResult, formatTime, formatResult, getResultImages, imageUrl } from "../api";
import type { RaceType, RaceResult, RaceImage } from "../types";

export default function RaceTypeHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [raceType, setRaceType] = useState<RaceType | null>(null);
  const [results, setResults] = useState<RaceResult[]>([]);
  const [imagesByResult, setImagesByResult] = useState<Record<number, RaceImage[]>>({});
  const [lightbox, setLightbox] = useState<{ resultId: number; index: number } | null>(null);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!id) return;
    try {
      const [t, res] = await Promise.all([getRaceType(Number(id)), getRaceTypeResults(Number(id))]);
      setRaceType(t);
      setResults(res);
      const entries = await Promise.all(
        res.map(async (rr) => [rr.id, await getResultImages(rr.id).catch(() => [])] as const)
      );
      setImagesByResult(Object.fromEntries(entries));
    } catch {
      setError("Failed to load race type data");
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

  if (!raceType) return <Typography>Loading...</Typography>;

  const isDistanceType = raceType.result_type === "distance";

  const visibleResults = results.filter((r) => !r.organizer_changed);
  const hiddenCount = results.length - visibleResults.length;

  const chartData = visibleResults.map((r) => ({
    year: r.year,
    value: isDistanceType ? r.distance : r.total_time,
    label: formatResult(r),
    race: r.race_name || "",
  }));

  const yearTicks = Array.from(new Set(chartData.map((d) => d.year))).sort((a, b) => a - b);

  const formatChartValue = (val: number) => (isDistanceType ? `${val.toFixed(2)} km` : formatTime(val));

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate("/race-types")}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4">{raceType.name}</Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 0.5 }}>
            <Chip
              label={isDistanceType ? "Distance-based" : "Time-based"}
              size="small"
              color={isDistanceType ? "secondary" : "primary"}
              variant="outlined"
            />
            <Typography variant="body2" color="text.secondary">
              {results.length} result{results.length === 1 ? "" : "s"} across all {raceType.name} races
            </Typography>
          </Box>
        </Box>
      </Box>

      {(chartData.length > 0 || hiddenCount > 0) && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Results by Year ({isDistanceType ? "Distance (km)" : "Total Time"})
          </Typography>
          {hiddenCount > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {hiddenCount} result{hiddenCount === 1 ? "" : "s"} hidden — changed by race organizer.
            </Typography>
          )}
          {chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="year"
                  name="Year"
                  domain={yearTicks.length ? [Math.min(...yearTicks) - 1, Math.max(...yearTicks) + 1] : ["dataMin - 1", "dataMax + 1"]}
                  ticks={yearTicks}
                  tickFormatter={(v: number) => String(v)}
                />
                <YAxis
                  type="number"
                  dataKey="value"
                  name={isDistanceType ? "Distance" : "Total Time"}
                  domain={isDistanceType ? [0, "dataMax + 1"] : ["dataMin - 60", "dataMax + 60"]}
                  tickFormatter={formatChartValue}
                />
                <ZAxis type="number" range={[60, 60]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={(props) => {
                    const point = props.payload && props.payload.length ? props.payload[0].payload : null;
                    if (!point) return null;
                    return (
                      <Box
                        sx={{
                          bgcolor: "background.paper",
                          border: "1px solid #ccc",
                          borderRadius: 1,
                          p: 1,
                          fontSize: 12,
                        }}
                      >
                        <Box sx={{ fontWeight: "bold" }}>{point.year}</Box>
                        <Box>{point.label}</Box>
                        {point.race && (
                          <Box color="text.secondary">{point.race}</Box>
                        )}
                      </Box>
                    );
                  }}
                />
                <Scatter
                  data={chartData}
                  fill={isDistanceType ? "#9c27b0" : "#1976d2"}
                />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </Paper>
      )}

      <Typography variant="h6" sx={{ mb: 1 }}>Results</Typography>
      {results.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
          No results yet for this race type.
        </Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Year</TableCell>
                <TableCell>Race</TableCell>
                <TableCell>{isDistanceType ? "Distance (km)" : "Total Time"}</TableCell>
                {raceType.discipline_fields.length > 0 &&
                  raceType.discipline_fields.map((f) => (
                    <TableCell key={f} sx={{ textTransform: "capitalize" }}>{f}</TableCell>
                  ))}
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
                  <TableCell>
                    <Link
                      component="button"
                      variant="body2"
                      onClick={() => navigate(`/race/${r.race_id}`)}
                      sx={{ textAlign: "left" }}
                    >
                      {r.race_name}
                      {r.location ? ` — ${r.location}` : ""}
                    </Link>
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
