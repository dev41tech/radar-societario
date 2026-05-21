import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import CompanyDetail from './pages/CompanyDetail';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/empresas" element={<Companies />} />
        <Route path="/empresas/:id" element={<CompanyDetail />} />
        <Route path="/configuracoes" element={<Settings />} />
      </Routes>
    </Layout>
  );
}
