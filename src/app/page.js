'use client';
import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { saveCredentials } from "@/components/CredentialManager";

export default function Home() {
  const router = useRouter();
  const [games, setGames] = useState([]);
  const [isNewGameFormVisible, setIsNewGameFormVisible] = useState(false);
  const [passKey, setPassKey] = useState('');
  const [deductPoints, setDeductPoints] = useState(false);
  const [multipleAttempts, setMultipleAttempts] = useState(false);

  useEffect(() => {
    const getGames = async () => {
      const response = await fetch('/api/games');
      const gameList = await response.json();
      setGames(gameList.games);
    };

    getGames();
  }, []);

  const handleCreateGame = async () => {
    const response = await fetch('/api/games', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        passKey,
        deductPoints,
        multipleAttempts
      }),
    });

    const game = await response.json();
    saveCredentials(game.id, { passKey: game.passKey });
    router.push(`/games/${game.id}`);
  };

  const handleCancel = () => {
    setIsNewGameFormVisible(false);
    setPassKey('');
    setDeductPoints(false);
    setMultipleAttempts(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <Header />
      <h1 className="text-5xl md:text-6xl font-extrabold leading-tighter tracking-tighter mb-4">Believe in Serverless Trivia</h1>
      <button
        className="text-black font-bold py-2 px-4 rounded bg-purple hover:bg-secondary mt-4"
        onClick={() => setIsNewGameFormVisible(true)}
      >
        Create Game
      </button>
      {isNewGameFormVisible && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="p-4 border rounded-lg shadow-lg w-full max-w-md mx-auto bg-primary">
            <h2 className="text-xl font-bold mb-4">Create New Game</h2>
            <div className="mb-4">
              <label className="block mb-2">Passkey:</label>
              <input
                type="password"
                className="w-full p-2 border rounded-lg text-black"
                value={passKey}
                placeholder="Used to secure the game"
                onChange={(e) => setPassKey(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={deductPoints}
                  onChange={(e) => setDeductPoints(e.target.checked)}
                />
                <span className="ml-2">Deduct points for wrong answers</span>
              </label>
            </div>
            <div className="mb-4">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={multipleAttempts}
                  onChange={(e) => setMultipleAttempts(e.target.checked)}
                />
                <span className="ml-2">Allow multiple attempts if answered incorrectly</span>
              </label>
            </div>
            <div className="flex float-right gap-4">
              <button
                className="p-2 bg-primary border border-white text-white rounded-lg"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                className="p-2 bg-purple text-black font-bold rounded-lg"
                onClick={handleCreateGame}
                disabled={!passKey}
              >
                Create Game
              </button>

            </div>
          </div>
        </div>
      )}
      {games.length > 0 && (
        <div className="flex flex-col gap-4 left w-full mt-8">
          <span>Active Games</span>
          <ul className="w-full">
            {games.map((game) => (
              <li
                key={game}
                className="cursor-pointer w-20 h-20 flex items-center justify-center text-black font-bold bg-blue rounded-full shadow-xl hover:bg-purple"
              >
                <a href={`/games/${game}`}>
                  <span>{game}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
