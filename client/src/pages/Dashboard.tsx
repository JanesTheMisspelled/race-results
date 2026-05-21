import { useState, useEffect } from "react";
import { Box, Typography, Grid, Card, CardContent, CardActions, Button, Chip } from "@mui/material";
import { TrendingUp } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { getRaces, getResults, formatResult } from "../api";
import type { Race, RaceResult } from "../types";

export default function Dashboard() {
  const navigate = useNavigate();
  const [races, setRaces] = useState<Race[]>([]);
  const [recentResults, setRecentResults] = useState<RaceResult[]>([]);

  useEffect(() => {
    Promise.all([getRaces(), getResults()]).then(([r, res]) => {
      setRaces(r);
      setRecentResults(res.slice(0, 10));
    });
  }, []);

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
              <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/result/${r.id}`)}>
                <td>{r.race_name}</td>
                <td>{r.year}</td>
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
