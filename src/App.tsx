import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAppState } from "./context/useAppState";
import { AppLayout } from "./layouts/AppLayout";
import { CaixaPage } from "./pages/CaixaPage";
import { ConfiguracoesPage } from "./pages/ConfiguracoesPage";
import { EstoquePage } from "./pages/EstoquePage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { ProdutosPage } from "./pages/ProdutosPage";
import { RelatoriosPage } from "./pages/RelatoriosPage";
import { ScannerPage } from "./pages/ScannerPage";

export default function App() {
  const location = useLocation();
  const { loading, currentUser } = useAppState();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-canvas text-brand-900">Carregando dados locais...</div>;
  }

  if (!currentUser && location.pathname !== "/scanner") {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route path="/scanner" element={<ScannerPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/caixa" element={<CaixaPage />} />
        <Route path="/estoque" element={<EstoquePage />} />
        <Route path="/produtos" element={<ProdutosPage />} />
        <Route path="/relatorios" element={<RelatoriosPage />} />
        <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
