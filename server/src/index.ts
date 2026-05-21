import express from "express";
import cors from "cors";
import raceTypesRouter from "./routes/raceTypes";
import racesRouter from "./routes/races";
import resultsRouter from "./routes/results";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/race-types", raceTypesRouter);
app.use("/api/races", racesRouter);
app.use("/api/results", resultsRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Database: ${process.env.DB_PATH || "race-results.db (default)"}`);
});
