import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReminderModal from '../components/ReminderModal';

export default function SharePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [shareData, setShareData] = useState(null);

  useEffect(() => {
    const url = searchParams.get('url') || '';
    const text = searchParams.get('text') || '';
    const title = searchParams.get('title') || '';

    const extractedUrl = extractInstagramUrl(url || text) || url || text;

    if (extractedUrl) {
      setShareData({ url: extractedUrl, title: title || '' });
    } else {
      navigate('/');
    }
  }, [searchParams, navigate]);

  if (!shareData) return null;

  return (
    <div className="page share-page">
      <ReminderModal
        url={shareData.url}
        title={shareData.title}
        onClose={() => navigate('/')}
        onSaved={() => navigate('/')}
      />
    </div>
  );
}

function extractInstagramUrl(text) {
  if (!text) return null;
  const match = text.match(/https?:\/\/(www\.)?instagram\.com\/[^\s]+/);
  return match ? match[0] : null;
}
