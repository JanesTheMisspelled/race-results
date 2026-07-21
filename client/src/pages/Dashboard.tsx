import { useState, useEffect } from "react";
import { Box, Typography, Grid, List, ListItem, ListItemButton, Chip, Tooltip, Pagination } from "@mui/material";
import { ReportProblem } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { getRaces, getRaceTypes, getResults, formatResult, getAllRaceTypeShadows } from "../api";
import type { Race, RaceResult, RaceType, RaceTypeShadow } from "../types";

export default function Dashboard() {
  const navigate = useNavigate();
  const [races, setRaces] = useState<Race[]>([]);
  const [raceTypes, setRaceTypes] = useState<RaceType[]>([]);
  const [results, setResults] = useState<RaceResult[]>([]);
  const [shadows, setShadows] = useState<RaceTypeShadow[]>([]);
  const [page, setPage] = useState(1);
  const [racesPage, setRacesPage] = useState(1);
  const [typesPage, setTypesPage] = useState(1);
  const pageSize = 100;
  const racesPageSize = 10;
  const typesPageSize = 10;

  useEffect(() => {
    Promise.all([getRaces(), getRaceTypes(), getResults(), getAllRaceTypeShadows()]).then(([r, t, res, sh]) => {
      setRaces(r);
      setRaceTypes(t);
      setResults(res);
      setShadows(sh);
    });
  }, []);

  const recentResults = results.slice((page - 1) * pageSize, page * pageSize);
  const pageCount = Math.max(1, Math.ceil(results.length / pageSize));
  const typesWithResults = raceTypes.filter((t) => results.some((r) => r.race_type_id === t.id));
  const resultCountByRace = new Map<number, number>();
  results.forEach((r) => resultCountByRace.set(r.race_id, (resultCountByRace.get(r.race_id) ?? 0) + 1));
  const racesSorted = [...races].sort((a, b) => (resultCountByRace.get(b.id) ?? 0) - (resultCountByRace.get(a.id) ?? 0));
  const racesPageCount = Math.max(1, Math.ceil(racesSorted.length / racesPageSize));
  const visibleRaces = racesSorted.slice((racesPage - 1) * racesPageSize, racesPage * racesPageSize);
  const resultCountByType = new Map<number, number>();
  results.forEach((r) => {
    if (r.race_type_id == null) return;
    resultCountByType.set(r.race_type_id, (resultCountByType.get(r.race_type_id) ?? 0) + 1);
  });
  const shadowCountByType = new Map<number, number>();
  const sourceFieldsByType = new Map<number, string[]>();
  raceTypes.forEach((t) => sourceFieldsByType.set(t.id, t.discipline_fields));
  for (const s of shadows) {
    const sourceFields = sourceFieldsByType.get(s.source_race_type_id);
    if (!sourceFields || !sourceFields.includes(s.discipline_field)) continue;
    for (const r of results) {
      if (r.race_type_id !== s.source_race_type_id) continue;
      const val = Number(r.discipline_data?.[s.discipline_field]);
      if (!val || val <= 0) continue;
      shadowCountByType.set(s.target_race_type_id, (shadowCountByType.get(s.target_race_type_id) ?? 0) + 1);
    }
  }
  const sortCountByType = new Map<number, number>();
  raceTypes.forEach((t) =>
    sortCountByType.set(t.id, (resultCountByType.get(t.id) ?? 0) + (shadowCountByType.get(t.id) ?? 0))
  );
  const typesSorted = [...typesWithResults].sort((a, b) => (sortCountByType.get(b.id) ?? 0) - (sortCountByType.get(a.id) ?? 0));
  const typesPageCount = Math.max(1, Math.ceil(typesSorted.length / typesPageSize));
  const visibleTypes = typesSorted.slice((typesPage - 1) * typesPageSize, typesPage * typesPageSize);

  return (
    <>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            My Races
          </Typography>
          <List disablePadding sx={{ mb: 3 }}>
            {visibleRaces.map((race) => (
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
                        {race.result_type === "laps" && (
                          <Chip label="Laps" size="small" color="success" variant="outlined" />
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
          {racesSorted.length > racesPageSize && (
            <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
              <Pagination
                count={racesPageCount}
                page={racesPage}
                onChange={(_, value) => setRacesPage(value)}
              />
            </Box>
          )}

          <Typography variant="h6" sx={{ mb: 1.5 }}>
            Race Types
          </Typography>
          <List disablePadding sx={{ mb: 3 }}>
            {visibleTypes.map((t) => (
              <ListItem disablePadding divider key={t.id}>
                <ListItemButton onClick={() => navigate(`/race-type/${t.id}`)} sx={{ py: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", width: "100%", gap: 1 }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ textTransform: "capitalize" }}>{t.name}</Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                        <Chip
                          label={t.result_type === "laps" ? "Laps" : t.result_type === "distance" ? "Distance" : "Time"}
                          size="small"
                          color={t.result_type === "laps" ? "success" : t.result_type === "distance" ? "secondary" : "primary"}
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
          {typesSorted.length > typesPageSize && (
            <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
              <Pagination
                count={typesPageCount}
                page={typesPage}
                onChange={(_, value) => setTypesPage(value)}
              />
            </Box>
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
          {results.length > pageSize && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <Pagination
                count={pageCount}
                page={page}
                onChange={(_, value) => {
                  setPage(value);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </Box>
          )}
        </Grid>
      </Grid>
    </>
  );
}
