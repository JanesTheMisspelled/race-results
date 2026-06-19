import { useState, useEffect } from "react";
import { Box, Typography, Grid, List, ListItem, ListItemButton, Chip, Tooltip } from "@mui/material";
import { ReportProblem } from "@mui/icons-material";
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
  const resultCountByRace = new Map<number, number>();
  results.forEach((r) => resultCountByRace.set(r.race_id, (resultCountByRace.get(r.race_id) ?? 0) + 1));
  const resultCountByType = new Map<number, number>();
  results.forEach((r) => {
    if (r.race_type_id == null) return;
    resultCountByType.set(r.race_type_id, (resultCountByType.get(r.race_type_id) ?? 0) + 1);
  });

  return (
    <>
      <Typography variant="h4" sx={{ mb: 3 }}>Dashboard</Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            My Races
          </Typography>
          <List disablePadding sx={{ mb: 3 }}>
            {races.map((race) => (
              <ListItem disablePadding divider key={race.id}>
                <ListItemButton onClick={() => navigate(`/race/${race.id}`)} sx={{ py: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", width: "100%", gap: 1 }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2">{race.name}</Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                        <Chip label={race.race_type_name} size="small" />
                        {race.result_type === "distance" && (
                          <Chip label="Distance" size="small" color="secondary" variant="outlined" />
                        )}
                        {race.location && (
                          <Typography variant="caption" color="text.secondary">· {race.location}</Typography>
                        )}
                      </Box>
                    </Box>
                    <Tooltip title={`${resultCountByRace.get(race.id) ?? 0} results`}>
                      <Chip label={resultCountByRace.get(race.id) ?? 0} size="small" />
                    </Tooltip>
                  </Box>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          {races.length === 0 && (
            <Typography color="text.secondary" sx={{ textAlign: "center", mb: 3 }}>
              No races yet. Go to "Races" to add one.
            </Typography>
          )}

          <Typography variant="h6" sx={{ mb: 1.5 }}>
            Race Types
          </Typography>
          <List disablePadding sx={{ mb: 3 }}>
            {typesWithResults.map((t) => (
              <ListItem disablePadding divider key={t.id}>
                <ListItemButton onClick={() => navigate(`/race-type/${t.id}`)} sx={{ py: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", width: "100%", gap: 1 }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ textTransform: "capitalize" }}>{t.name}</Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
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
                    </Box>
                    <Tooltip title={`${resultCountByType.get(t.id) ?? 0} results`}>
                      <Chip label={resultCountByType.get(t.id) ?? 0} size="small" />
                    </Tooltip>
                  </Box>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          {typesWithResults.length === 0 && (
            <Typography color="text.secondary" sx={{ textAlign: "center", mb: 3 }}>
              No race types have results yet. Add a result to a race to see it here.
            </Typography>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>Recent Results</Typography>
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
        </Grid>
      </Grid>
    </>
  );
}
