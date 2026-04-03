import { useNavigate } from 'react-router-dom';
import MultiplayerRoom from '../components/MultiplayerRoom';

export default function MultiplayerPage() {
  const navigate = useNavigate();

  return (
    <div className="container mp-page">
      <div className="mp-page-header">
        <button
          id="mp-back-btn"
          className="mp-back-btn"
          onClick={() => navigate('/main')}
        >
          ← Back to Menu
        </button>
        <div className="mp-page-title">
          <h1 className="h4">Multiplayer</h1>
          <p className="tagline mp-subtitle">Play flashcards in real-time with friends.</p>
        </div>
      </div>

      <MultiplayerRoom onLeave={() => navigate('/main')} />
    </div>
  );
}
