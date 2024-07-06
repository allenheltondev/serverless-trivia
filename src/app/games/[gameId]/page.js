'use client';
import Header from "@/components/Header";
import { useRef, useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { loadCredentials, saveCredentials } from "@/components/CredentialManager";
import { TopicClient, CredentialProvider, CacheClient } from '@gomomento/sdk-web';

export default function Game() {
  const params = useParams();
  const router = useRouter();

  const [token, setToken] = useState(null);
  const [topicSub, setTopicSub] = useState(null);
  const [isWaitingForAnswer, setIsWaitingForAnswer] = useState(false);
  const [username, setUsername] = useState('Hello World!');
  const [credentials, setCredentials] = useState({});
  const [topicClient, setTopicClient] = useState(null);
  const [cacheClient, setCacheClient] = useState(null);
  const cacheClientRef = useRef(cacheClient);
  const topicClientRef = useRef(topicClient);
  const usernameRef = useRef(username);
  const isWaitingRef = useRef(isWaitingForAnswer);

  const passKey = useSearchParams().get('passKey');
  const hash = useSearchParams().get('securityKey');

  useEffect(() => {
    const getToken = async (creds) => {
      const res = await fetch(`/api/games/${params.gameId}/login`, {
        method: 'POST',
        body: JSON.stringify({
          username: 'host',
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
      creds.token = data.token;
      saveCredentials(params.gameId, creds);

      return creds;
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
      getToken(creds);
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

  const subscribeToGame = async () => {
    if (topicClient && !topicSub) {
      const subscription = await topicClient.subscribe('game', `${params.gameId}-submit`, {
        onItem: async (data) => processMessage(data.tokenId()),
        onError: (err) => console.error(err)
      });
      setTopicSub(subscription);
    }
  };

  const updateSession = async () => {
    topicSub?.unsubscribe();
  };

  const processMessage = async (name) => {
    setIsWaitingForAnswer(false);
    isWaitingRef.current = false;

    setUsername(name);
    usernameRef.current = name;

    await cacheClientRef.current.set('game', `${params.gameId}-status`, 'false');
    await topicClientRef.current.publish('game', `${params.gameId}-status`, name);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <Header />
      <span>{usernameRef.current}</span>
    </main>
  );
}
