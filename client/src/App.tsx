import { Navigate, Route, BrowserRouter, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { AccessDeniedPage } from "./routes/AccessDeniedPage";
import { AppLayout } from "./routes/AppLayout";
import { LoginPage } from "./routes/LoginPage";
import { PanelCreatePage } from "./routes/PanelCreatePage";
import { PanelEditPage } from "./routes/PanelEditPage";
import { PanelsPage } from "./routes/PanelsPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { SettingsPage } from "./routes/SettingsPage";
import { SupportCategoriesPage } from "./routes/SupportCategoriesPage";
import { SupportCategoryCreatePage } from "./routes/SupportCategoryCreatePage";
import { SupportCategoryEditPage } from "./routes/SupportCategoryEditPage";

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
              <Route path="paineis/novo" element={<PanelCreatePage />} />
              <Route path="paineis/:id" element={<PanelEditPage />} />
              <Route path="suporte" element={<SupportCategoriesPage />} />
              <Route path="suporte/novo" element={<SupportCategoryCreatePage />} />
              <Route path="suporte/:id" element={<SupportCategoryEditPage />} />
              <Route path="configuracao" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
