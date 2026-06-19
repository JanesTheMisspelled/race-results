import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ManageRaces from "./pages/ManageRaces";
import RaceTypeManager from "./pages/RaceTypeManager";
import RaceHistory from "./pages/RaceHistory";
import RaceTypeHistory from "./pages/RaceTypeHistory";
import ResultForm from "./pages/ResultForm";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/races" element={<ManageRaces />} />
        <Route path="/race-types" element={<RaceTypeManager />} />
        <Route path="/race-type/:id" element={<RaceTypeHistory />} />
        <Route path="/race/:id" element={<RaceHistory />} />
        <Route path="/race/:raceId/result/new" element={<ResultForm />} />
        <Route path="/result/:id" element={<ResultForm />} />
      </Route>
    </Routes>
  );
}
