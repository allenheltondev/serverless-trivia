'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveCredentials } from "./CredentialManager";

export default function JoinForm({ gameDetail, credentials, setCredentials, gameId }) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [team, setTeam] = useState('purple');

  const join = async (e) => {
    e.preventDefault();
    if (username && team) {
      await getToken(credentials);
    }
  };

  const getToken = async (creds) => {
    const res = await fetch(`/api/games/${gameId}/login`, {
      method: 'POST',
      body: JSON.stringify({
        username,
        team,
        passKey: creds.passKey
      }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': creds.hash
      }
    });

    if (res.status === 403) {
      router.push('/unauthorized');
    }

    const data = await res.json();
    const updatedCredentials = { ...credentials, token: data.token };
    saveCredentials(gameId, updatedCredentials);
    setCredentials(updatedCredentials);
  };

  if (credentials?.token) {
    return null;
  }

  return (
    <form onSubmit={join} method="post" className="border border-white p-8 pb-4 pt-4 rounded-xl shadow-md w-full max-w-md">
      <fieldset className="mb-4">
        <legend className="text-lg font-medium mb-2">Choose a team</legend>
        <div className="flex items-center mb-2 bg-purple font-bold rounded-lg pl-2">
          <input
            type="radio"
            id="purple"
            name="team"
            value="purple"
            className="mr-2"
            checked={team === 'purple'}
            onChange={() => setTeam('purple')}
            disabled={gameDetail?.purpleTeam?.players?.length >= 4}
          />
          <label htmlFor="purple" className="text-black p-2 pr-4">
            {gameDetail?.purpleTeam?.name} ({gameDetail?.purpleTeam?.players?.length} / 4)
          </label>
        </div>
        <div className="flex items-center mb-2 pl-2 bg-blue font-bold rounded-lg">
          <input
            type="radio"
            id="blue"
            name="team"
            value="blue"
            className="mr-2"
            checked={team === 'blue'}
            onChange={() => setTeam('blue')}
            disabled={gameDetail?.blueTeam?.players?.length >= 4}
          />
          <label htmlFor="blue" className="p-2 pr-4 text-black">
            {gameDetail?.blueTeam?.name} ({gameDetail?.blueTeam?.players?.length} / 4)
          </label>
        </div>
      </fieldset>
      <div className="mb-8">
        <label htmlFor="username" className="block text-white text-lg mb-2">Username</label>
        <input
          type="text"
          id="username"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-3 text-black py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      <input
        type="submit"
        value="Join"
        className="w-full bg-blue-500 border border-white text-white py-2 rounded hover:bg-blue-600 transition duration-300"
      />
    </form>
  );
}
