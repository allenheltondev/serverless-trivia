'use client';
import Header from "@/components/Header";
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { TopicClient, CredentialProvider, CacheClient, CacheGet } from '@gomomento/sdk-web';
import { useEffect, useState, useRef } from 'react';
import { saveCredentials, loadCredentials } from "@/components/CredentialManager";
import dynamic from 'next/dynamic';

const JoinForm = dynamic(() => import('@/components/JoinForm'), { ssr: false });

export default function Play() {
  const params = useParams();
  const router = useRouter();

  const [credentials, setCredentials] = useState({ username: '', team: '' });
  const [topicSub, setTopicSub] = useState(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isMyGuess, setIsMyGuess] = useState(false);
  const [gameDetail, setGameDetail] = useState({});
  const [topicClient, setTopicClient] = useState(null);
  const [cacheClient, setCacheClient] = useState(null);
  const cacheClientRef = useRef(cacheClient);
  const topicClientRef = useRef(topicClient);
  const isEnabledRef = useRef(isEnabled);
  const isMyGuessRef = useRef(isMyGuess);

  const passKey = useSearchParams().get('passKey');

  useEffect(() => {
    const loadGame = async (creds) => {
      const response = await fetch(`/api/games/${params.gameId}?passKey=${creds.passKey}`);
      if (response.status === 404) {
        router.push('/not-found');
      } else if (response.status === 403) {
        router.push('/unauthorized');
      };
      const data = await response.json();

      setGameDetail(data);
    };

    const setupCredentials = () => {
      let creds = loadCredentials(params.gameId);
      if (!creds && !passKey) {
        router.push('/unauthorized');
      } else if (passKey) {
        creds = { passKey };
        saveCredentials(params.gameId, creds);
        router.push(window.location.pathname);
      }

      setCredentials(creds);
      return creds;
    };

    if (params.gameId) {
      const creds = setupCredentials();
      loadGame(creds);
    }
  }, [params]);

  useEffect(() => {
    if (credentials?.token && window !== 'undefined') {
      const topics = new TopicClient({
        credentialProvider: CredentialProvider.fromString(credentials.token)
      });

      setTopicClient(topics);
      topicClientRef.current = topics;

      const cache = new CacheClient({
        defaultTtlSeconds: 300,
        credentialProvider: CredentialProvider.fromString(credentials.token)
      });

      setCacheClient(cache);
      cacheClientRef.current = cache;

      // Adding the event listener
      window.addEventListener('beforeunload', updateSession);
      updateSession(false);

      // Removing the event listener on cleanup
      return () => {
        window.removeEventListener('beforeunload', updateSession);
      };
    }
  }, [credentials]);

  useEffect(() => {
    subscribeToGame();
  }, [topicClient]);

  useEffect(() => {
    const getCurrentStatus = async () => {
      const response = await cacheClientRef.current.get('game', `${params.gameId}-status`);
      if (response instanceof CacheGet.Hit) {
        const enabled = (response.value() === 'true');
        setIsEnabled(enabled);
        isEnabledRef.current = enabled;
      }
    };

    if (cacheClientRef?.current) {
      getCurrentStatus();
    }
  }, [cacheClient]);

  const subscribeToGame = async () => {
    if (topicClient && !topicSub) {
      const subscription = await topicClient.subscribe('game', `${params.gameId}-status`, {
        onItem: async (data) => handleGameStatusChange(data.value()),
        onError: (err) => console.error(err)
      });
      setTopicSub(subscription);
    }
  };

  const updateSession = async () => {
    topicSub?.unsubscribe();
  };

  const handleGameStatusChange = async (message) => {
    const response = await cacheClientRef.current.get('game', `${params.gameId}-status`);
    if (response instanceof CacheGet.Hit) {
      const enabled = (response.value() === 'ready');
      setIsEnabled(enabled);
      isEnabledRef.current = enabled;

      const didIGetItFirst = message === credentials.username;
      setIsMyGuess(didIGetItFirst);
      isMyGuessRef.current = didIGetItFirst;
    }
  };

  const answerQuestion = async () => {
    await topicClientRef.current.publish('game', `${params.gameId}-submit`, 'true');
  };

  return (
    <main className="flex min-h-screen flex-col items-center pt-24 w-full">
      <Header />
      <JoinForm
        gameDetail={gameDetail}
        credentials={credentials}
        setCredentials={setCredentials}
        gameId={params.gameId}
      />
      {credentials.team && (
        <div className="flex flex-col items-center w-full">
          <span className="text-xl font-bold mb-4">Playing as {credentials.username} on team {credentials.team}</span>
          <button
            className="bg-purple text-black text-2xl font-bold py-6 px-6 rounded-full mt-4 w-48 h-48 drop-shadow-xl active:bg-blue disabled:bg-gray-400 disabled:text-gray-600 disabled:cursor-not-allowed cursor-pointer"
            onClick={answerQuestion}
            disabled={!isEnabledRef.current}
          >
            I Know the Answer!
          </button>
          {isMyGuess && (
            <div className="w-full text-xl text-black bg-blue p-4 mt-8">
              You buzzed in first! What's your guess?
            </div>
          )}
        </div>
      )}
    </main>
  );
}
