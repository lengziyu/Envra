import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { DashboardPage } from "@/pages/dashboard";
import { DoctorPage } from "@/pages/doctor";
import { ToolsPage } from "@/pages/tools";
import { SoftwarePage } from "@/pages/software";
import { ProjectInitPage } from "@/pages/project-init";
import { SettingsPage } from "@/pages/settings";
import { useAppSettings } from "@/stores/settings";

function App() {
  const theme = useAppSettings((state) => state.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/doctor" element={<DoctorPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/software" element={<SoftwarePage />} />
          <Route path="/init" element={<ProjectInitPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
