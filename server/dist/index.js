"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const raceTypes_1 = __importDefault(require("./routes/raceTypes"));
const races_1 = __importDefault(require("./routes/races"));
const results_1 = __importDefault(require("./routes/results"));
const images_1 = __importDefault(require("./routes/images"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "15mb" }));
app.use("/api/race-types", raceTypes_1.default);
app.use("/api/races", races_1.default);
app.use("/api/results", results_1.default);
app.use("/api", images_1.default);
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Database: ${process.env.DB_PATH || "race-results.db (default)"}`);
});
//# sourceMappingURL=index.js.map