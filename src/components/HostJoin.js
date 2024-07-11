'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveCredentials } from "./CredentialManager";

export default function HostJoin({ gameId, credentials, initialize }) {
  const router = useRouter();
  const [passKey, setPassKey] = useState('');

  if (credentials?.token || credentials?.passKey) {
    return null;
  }

  const handleSubmit = async () => {
    saveCredentials(gameId, {passKey});
    initialize();
  };

  const handleCancel = () => {
    router.push('/');
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="p-4 border rounded-lg shadow-lg w-full max-w-md mx-auto bg-primary">
        <h2 className="text-xl font-bold mb-4">Join game</h2>
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
        <div className="flex float-right gap-4">
          <button
            className="p-2 bg-primary border border-white text-white rounded-lg"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className="p-2 bg-purple text-black font-bold rounded-lg"
            onClick={handleSubmit}
            disabled={!passKey}
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
