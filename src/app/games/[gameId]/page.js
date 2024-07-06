'use client';
import Header from "@/components/Header";
import { useRef, useState, useEffect } from "react";
import { useParams } from 'next/navigation';
import { TopicClient, CredentialProvider, CacheClient } from '@gomomento/sdk-web';

export default function Game() {
  const params = useParams();
  const [token, setToken] = useState(null);
  const [topicSub, setTopicSub] = useState(null);
  const [isWaitingForAnswer, setIsWaitingForAnswer] = useState(false);
  const [username, setUsername] = useState('Hello World!');
  const [topicClient, setTopicClient] = useState(null);
  const [cacheClient, setCacheClient] = useState(null);
  const cacheClientRef = useRef(cacheClient);
  const topicClientRef = useRef(topicClient);
  const usernameRef = useRef(username);
  const isWaitingRef = useRef(isWaitingForAnswer);

  useEffect(() => {
    const getToken = async () => {
      const res = await fetch(`/api/games/${params.gameId}/tokens?username=host`);
      const data = await res.json();
      setToken(data.token);
    };

    getToken();
  }, []);

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
