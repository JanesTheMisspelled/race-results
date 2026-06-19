import { useState, useEffect } from "react";
import { Box, Typography, Grid, Card, CardContent, CardActions, Button, Chip, Tooltip } from "@mui/material";
import { TrendingUp, ReportProblem } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { getRaces, getRaceTypes, getResults, formatResult } from "../api";
import type { Race, RaceResult, RaceType } from "../types";

export default function Dashboard() {
  const navigate = useNavigate();
  const [races, setRaces] = useState<Race[]>([]);
  const [raceTypes, setRaceTypes] = useState<RaceType[]>([]);
  const [results, setResults] = useState<RaceResult[]>([]);

  useEffect(() => {
    Promise.all([getRaces(), getRaceTypes(), getResults()]).then(([r, t, res]) => {
      setRaces(r);
      setRaceTypes(t);
      setResults(res);
    });
  }, []);

  const recentResults = results.slice(0, 10);
  const typesWithResults = raceTypes.filter((t) => results.some((r) => r.race_type_id === t.id));

  return (
    <>
      <Typography variant="h4" sx={{ mb: 3 }}>Dashboard</Typography>

      <Typography variant="h5" sx={{ mb: 2 }}>
        My Races
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {races.map((race) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={race.id}>
            <Card sx={{ cursor: "pointer" }} onClick={() => navigate(`/race/${race.id}`)}>
              <CardContent>
                <Typography variant="h6">{race.name}</Typography>
                <Chip label={race.race_type_name} size="small" sx={{ my: 1 }} />
                {race.result_type === "distance" && (
                  <Chip label="Distance" size="small" color="secondary" variant="outlined" sx={{ my: 1, ml: 0.5 }} />
                )}
                {race.location && (
                  <Typography variant="body2" color="text.secondary">{race.location}</Typography>
                )}
              </CardContent>
              <CardActions>
                <Button size="small" startIcon={<TrendingUp />}>View History</Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      {races.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: "center", mb: 4 }}>
          No races yet. Go to "Races" to add one.
        </Typography>
      )}

      <Typography variant="h5" sx={{ mb: 2 }}>
        Race Types
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {typesWithResults.map((t) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={t.id}>
            <Card sx={{ cursor: "pointer", height: "100%" }} onClick={() => navigate(`/race-type/${t.id}`)}>
              <CardContent>
                <Typography variant="h6" sx={{ textTransform: "capitalize" }}>{t.name}</Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, my: 1 }}>
                  <Chip
                    label={t.result_type === "distance" ? "Distance" : "Time"}
                    size="small"
                    color={t.result_type === "distance" ? "secondary" : "primary"}
                    variant="outlined"
                  />
                  {t.discipline_fields.map((f) => (
                    <Chip key={f} label={f} size="small" sx={{ textTransform: "capitalize" }} />
                  ))}
                </Box>
              </CardContent>
              <CardActions>
                <Button size="small" startIcon={<TrendingUp />}>View History</Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      {typesWithResults.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: "center", mb: 4 }}>
          No race types have results yet. Add a result to a race to see it here.
        </Typography>
      )}

      <Typography variant="h5" sx={{ mb: 2 }}>Recent Results</Typography>
      {recentResults.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: "center" }}>
          No results yet. Click on a race to add your first result.
        </Typography>
      ) : (
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", "& td, & th": { p: 1, borderBottom: "1px solid #ddd", textAlign: "left" } }}>
          <thead>
            <tr>
              <th>Race</th>
              <th>Year</th>
              <th>Result</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {recentResults.map((r) => (
              <tr
                key={r.id}
                style={{
                  cursor: "pointer",
                  ...(r.organizer_changed ? { backgroundColor: "rgba(237, 108, 2, 0.12)" } : {}),
                }}
                onClick={() => navigate(`/result/${r.id}`)}
              >
                <td>{r.race_name}</td>
                <td>
                  <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                    {r.organizer_changed && (
                      <Tooltip title="Changed by race organizer">
                        <ReportProblem fontSize="small" color="warning" />
                      </Tooltip>
                    )}
                    {r.year}
                  </Box>
                </td>
                <td>{formatResult(r)}</td>
                <td><Chip label={r.race_type_name} size="small" /></td>
              </tr>
            ))}
          </tbody>
        </Box>
      )}
    </>
  );
}
