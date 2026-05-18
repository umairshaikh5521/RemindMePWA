import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SharePage from './pages/SharePage';
import HistoryPage from './pages/HistoryPage';
import DetailPage from './pages/DetailPage';
import Layout from './components/Layout';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/share" element={<SharePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/reminder/:id" element={<DetailPage />} />
      </Routes>
    </Layout>
  );
}
