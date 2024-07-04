'use client';
import Header from "@/components/Header";
import { useSearchParams, useParams } from 'next/navigation';
import { TopicClient, CredentialProvider, CacheClient, CacheGet } from '@gomomento/sdk-web';
import { useEffect, useState, useRef } from 'react';

export default function Play() {
  const params = useParams();
  const [username, setUsername] = useState();
  const [token, setToken] = useState(null);
  const [topicSub, setTopicSub] = useState(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [topicClient, setTopicClient] = useState(null);
  const [cacheClient, setCacheClient] = useState(null);
  const cacheClientRef = useRef(cacheClient);
  const topicClientRef = useRef(topicClient);
  const isEnabledRef = useRef(isEnabled);

  const name = useSearchParams().get('username');

  useEffect(() => {
    setUsername(name);
  }, [name]);

  useEffect(() => {
    const getToken = async () => {
      const res = await fetch(`/api/games/${params.gameId}/tokens?username=${username}`);
      const data = await res.json();
      setToken(data.token);
    };
    if (username) {
      getToken();
    }
  }, [username]);

  useEffect(() => {
    if (token && window !== 'undefined') {
      const topics = new TopicClient({
        credentialProvider: CredentialProvider.fromString(token)
      });

      setTopicClient(topics);
      topicClientRef.current = topics;

      const cache = new CacheClient({
        defaultTtlSeconds: 300,
        credentialProvider: CredentialProvider.fromString(token)
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
  }, [token]);

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

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <Header />
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
