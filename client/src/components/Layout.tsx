import { AppBar, Box, Container, Toolbar, Typography, Button } from "@mui/material";
import { Link, Outlet, useLocation } from "react-router-dom";

export default function Layout() {
  const location = useLocation();

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component={Link} to="/" sx={{ flexGrow: 1, textDecoration: "none", color: "inherit" }}>
            Race Results Tracker
          </Typography>
          <Button color="inherit" component={Link} to="/" sx={{ textTransform: "none", fontWeight: location.pathname === "/" ? "bold" : "normal" }}>
            Dashboard
          </Button>
          <Button color="inherit" component={Link} to="/races" sx={{ textTransform: "none", fontWeight: location.pathname === "/races" ? "bold" : "normal" }}>
            Races
          </Button>
          <Button color="inherit" component={Link} to="/race-types" sx={{ textTransform: "none", fontWeight: location.pathname === "/race-types" ? "bold" : "normal" }}>
            Race Types
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Outlet />
      </Container>
      <Box component="footer" sx={{ textAlign: "center", py: 2, color: "text.secondary" }}>
        <Typography variant="body2">Race Results Tracker</Typography>
      </Box>
    </>
  );
}
