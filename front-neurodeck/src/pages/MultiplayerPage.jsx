import { useNavigate } from 'react-router-dom';
import MultiplayerRoom from '../components/MultiplayerRoom';

export default function MultiplayerPage() {
  const navigate = useNavigate();

  return (
    <div className="container">
      <div className="mb-5">
        <h1 className="h4">Multiplayer</h1>
        <p className="tagline has-text-grey">Play flashcards in real-time with friends.</p>
      </div>

      <MultiplayerRoom
        onLeave={() => navigate('/menu')}
      />
    </div>
  );
}
