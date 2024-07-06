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

  const [username, setUsername] = useState('');
  const [team, setTeam] = useState('purple');
  const [credentials, setCredentials] = useState(null);
  const [topicSub, setTopicSub] = useState(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [gameDetail, setGameDetail] = useState({});
  const [topicClient, setTopicClient] = useState(null);
  const [cacheClient, setCacheClient] = useState(null);
  const cacheClientRef = useRef(cacheClient);
  const topicClientRef = useRef(topicClient);
  const isEnabledRef = useRef(isEnabled);

  const passKey = useSearchParams().get('passKey');
  const hash = useSearchParams().get('securityKey');

  useEffect(() => {
    const loadGame = async (creds) => {
      const response = await fetch(`/api/games/${params.gameId}?passKey=${creds.passKey}&securityKey=${creds.hash}`);
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
      if (!creds && (!hash || !passKey)) {
        router.push('/unauthorized');
      } else if (hash && passKey) {
        creds = { hash, passKey };
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
        onItem: async (data) => processMessage(data.value()),
        onError: (err) => console.error(err)
      });
      setTopicSub(subscription);
    }
  };

  const updateSession = async () => {
    topicSub?.unsubscribe();
  };

  const processMessage = async () => {
    const response = await cacheClientRef.current.get('game', `${params.gameId}-status`);
    if (response instanceof CacheGet.Hit) {
      const enabled = (response.value() === 'true');
      setIsEnabled(enabled);
      isEnabledRef.current = enabled;
    }
  };

  const answerQuestion = async () => {
    await topicClientRef.current.publish('game', `${params.gameId}-submit`, 'true');
  };

  const setToken = (token) => {
    credentials.token = token;
    setCredentials(credentials);
    saveCredentials(params.gameId, credentials);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <Header />
      <JoinForm
        gameDetail={gameDetail}
        credentials={credentials}
        setCredentials={setCredentials}
        gameId={params.gameId}
      />
      <span>Hello Player!</span>
      <button
        className="bg-blue-500 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
        disabled={!isEnabledRef.current}
        onClick={answerQuestion}
      >
        Click Me
      </button>
    </main>
  );
}
