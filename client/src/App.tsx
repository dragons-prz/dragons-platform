import { Navigate, Route, BrowserRouter, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { AccessDeniedPage } from "./routes/AccessDeniedPage";
import { AppLayout } from "./routes/AppLayout";
import { LoginPage } from "./routes/LoginPage";
import { PanelsPage } from "./routes/PanelsPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { SettingsPage } from "./routes/SettingsPage";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/acesso-negado" element={<AccessDeniedPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/paineis" replace />} />
              <Route path="paineis" element={<PanelsPage />} />
              <Route path="configuracao" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
