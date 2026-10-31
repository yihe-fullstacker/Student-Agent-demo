import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import AppShell from "./components/AppShell";

export default function App() {
  return (
    <Routes>
      {/* Marketing landing page */}
      <Route path="/" element={<Landing />} />

      {/* Existing application shell */}
      <Route path="/app/*" element={<AppShell />} />

      {/* Fallback */}
      <Route path="*" element={<Landing />} />
    </Routes>
  );
}
