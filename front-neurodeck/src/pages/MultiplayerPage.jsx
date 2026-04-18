import { useNavigate } from 'react-router-dom';
import MultiplayerRoom from '../components/MultiplayerRoom';
import DashboardLayout from '../components/DashboardLayout';

export default function MultiplayerPage() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="db-content-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <h1 className="db-page-title">Multiplayer</h1>
          <p style={{ fontSize: "0.855rem", color: "#888", margin: "0.2rem 0 0" }}>
            Play flashcards in real-time with friends
          </p>
        </div>
      </div>

      <MultiplayerRoom onLeave={() => navigate('/decks')} />
    </DashboardLayout>
  );
}
