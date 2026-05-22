import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import CompanyDetail from './pages/CompanyDetail';
import CompanyReport from './pages/CompanyReport';
import Settings from './pages/Settings';
import Diagnostics from './pages/Diagnostics';
export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/empresas" element={<Companies />} />
        <Route path="/empresas/:id" element={<CompanyDetail />} />
        <Route path="/empresas/:id/relatorio" element={<CompanyReport />} />
        <Route path="/notificacoes" element={<Diagnostics />} />
        <Route path="/configuracoes" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}
