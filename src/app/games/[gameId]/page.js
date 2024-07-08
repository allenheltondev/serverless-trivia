'use client';
import 'react-toastify/dist/ReactToastify.css';
import Header from "@/components/Header";
import { useRef, useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { loadCredentials, saveCredentials } from "@/components/CredentialManager";
import { TopicClient, CredentialProvider, CacheClient } from '@gomomento/sdk-web';
import { Flip, ToastContainer, toast } from 'react-toastify';
import QRCode from 'react-qr-code';

const WAITING = 'Waiting for players...';
const PLAYING = 'Playing';

const defaultGame = {
  status: 'Loading...',
  blueTeam: {
    name: 'Blue Team',
    players: []
  },
  purpleTeam: {
    name: 'Purple Team',
    players: []
  },
  deductPoints: false,
  multipleAttempts: false
};

export default function Game() {
  const params = useParams();
  const router = useRouter();

  const [topicSubs, setTopicSubs] = useState([]);
  const [isWaitingForAnswer, setIsWaitingForAnswer] = useState(false);
  const [guessingUser, setGuessingUser] = useState({ team: '', username: '' });
  const [credentials, setCredentials] = useState({});
  const [topicClient, setTopicClient] = useState(null);
  const [cacheClient, setCacheClient] = useState(null);
  const [bluePlayers, setBluePlayers] = useState([]);
  const [purplePlayers, setPurplePlayers] = useState([]);
  const [game, setGame] = useState(defaultGame);
  const [question, setQuestion] = useState('');
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);

  const cacheClientRef = useRef(cacheClient);
  const topicClientRef = useRef(topicClient);
  const guessingUserRef = useRef(guessingUser);
  const isWaitingRef = useRef(isWaitingForAnswer);
  const bluePlayersRef = useRef(bluePlayers);
  const purplePlayersRef = useRef(purplePlayers);

  const passKey = useSearchParams().get('passKey');

  useEffect(() => {
    const getToken = async (creds) => {
      const res = await fetch(`/api/games/${params.gameId}/login`, {
        method: 'POST',
        body: JSON.stringify({
          username: 'host'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': creds.passKey
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
      getToken(creds);
      getGameDetail(creds);
    }
  }, [params]);

  const getGameDetail = async (creds) => {
    const res = await fetch(`/api/games/${params.gameId}?passKey=${creds.passKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();
    if (res.status !== 200) {
      router.push('/unauthorized');
    }

    setGame(data);
    setPlayers(data.blueTeam.players, data.purpleTeam.players);
  };

  const setPlayers = (blueTeam, purpleTeam) => {
    setBluePlayers(blueTeam);
    bluePlayersRef.current = blueTeam;
    setPurplePlayers(purpleTeam);
    purplePlayersRef.current = purpleTeam;
  };

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
    if (topicClient && topicSubs.length === 0) {
      const answerSub = await topicClient.subscribe('game', `${params.gameId}-submit`, {
        onItem: async (data) => handleAnswerRequest(data.tokenId()),
        onError: (err) => console.error(err)
      });
      const playerChangeSub = await topicClient.subscribe('game', `${params.gameId}-players`, {
        onItem: async (data) => { const players = JSON.parse(data.value()); setPlayers(players.blueTeam, players.purpleTeam); },
        onError: (err) => console.error(err)
      });
      setTopicSubs([answerSub, playerChangeSub]);
    }
  };

  const updateSession = async () => {
    for (const sub of topicSubs) {
      sub.unsubscribe();
    }
    setTopicSubs([]);
  };

  const handleAnswerRequest = async (user) => {
    setIsWaitingForAnswer(false);
    isWaitingRef.current = false;

    const [team, username] = user.split('#');
    setGuessingUser({ team, username });
    guessingUserRef.current = { team, username };

    await cacheClientRef.current.set('game', `${params.gameId}-status`, 'guessing');
    await topicClientRef.current.publish('game', `${params.gameId}-status`, user);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(`${window.location.href}/play?passKey=${credentials.passKey}`);
    toast.info('Link copied to clipboard', { position: 'bottom-center', theme: 'dark', autoClose: 1500, hideProgressBar: true, transition: Flip });
  };

  const updateGameStatus = async (status) => {
    await fetch(`/api/games/${params.gameId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': credentials.passKey
      }
    });
    setGame({ ...game, status });
  };

  const getNextQuestion = async () => {
    const response = await fetch(`/api/games/${params.gameId}/questions`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': credentials.passKey
      }
    });
    const data = await response.json();
    if (response.status == 404) {
      router.push('/not-found');
    } else if (response.status == 403) {
      router.push('/unauthorized');
    } else if (response.status == 409) {
      toast.warn(data.message, { position: 'bottom-center', theme: 'dark', autoClose: 1500, hideProgressBar: true, transition: Flip });
    } else if (response.status == 500) {
      toast.error(data.message, { position: 'bottom-center', theme: 'dark', autoClose: 1500, hideProgressBar: true, transition: Flip });
    } else {
      setIsAnswerVisible(false);
      setQuestion(data);
      setGuessingUser({ team: '', username: '' });
      guessingUserRef.current = { team: '', username: '' };

      await cacheClientRef.current.set('game', `${params.gameId}-status`, 'ready');
      const r = await topicClientRef.current.publish('game', `${params.gameId}-status`, '#');
      console.log(r);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24 w-full">
      <Header />
      <span className="text-2xl font-bold mb-4">{game.status}</span>
      <div className="flex flex-col items-center w-full">
        <div id="mid-container" className="w-max-1/2">
          {game.status == WAITING && (
            <div className="flex flex-col items-center">
              <a href={`${window?.location?.href}/play?passKey=${credentials.passKey}`} target="_blank">
                <QRCode value={`${window?.location?.href}/play?passKey=${credentials.passKey}`} size={500} style={{ height: "auto", maxWidth: "200" }} />
              </a>
              <div className="text-xl font-bold mb-4 mt-4">
                <span>Scan code or </span>
                <span onClick={copyShareLink} className="cursor-pointer underline">share link</span>
                <span> to join</span>
              </div>
              <button
                className="w-full font-bold border border-white text-white py-2 rounded hover:bg-blue-600 transition duration-300"
                onClick={() => updateGameStatus('Playing')}
              >Start game</button>
            </div>
          )}
          {game.status == PLAYING && (
            <div className="flex flex-col gap-4 items-center">
              <div className="flex flex-row gap-4 items-center justify-center">
                <button className="font-bold bg-purple text-black p-2 rounded" onClick={getNextQuestion}>Next Question</button>
                {question && (
                  <button className="font-bold bg-blue text-black p-2 rounded" onClick={() => setIsAnswerVisible(true)}>Show Answer</button>
                )}
              </div>
              <span className="text-2xl font-bold mt-4">{question.question}</span>
              {isAnswerVisible && <span className="text-lg italic font-bold mb-4">{question.answer}</span>}
            </div>
          )}
        </div>
        <div className="flex flex-row justify-between w-full">
          <div className="flex flex-col items-left">
            <span className="text-xl font-bold mb-4">{game.blueTeam.name}</span>
            <ul>
              {bluePlayersRef.current.map((player, index) => (
                <li key={index}>
                  {(guessingUserRef.current.username === player && guessingUserRef.current.team == 'blue') ? (
                    <div className="flex flex-row gap-4 items-center bg-darkPurple p-2 rounded-xl drop-shadow-xl text-black font-bold">
                      <div className="w-8 h-8 bg-blue rounded-full text-black font-bold flex justify-center items-center text-xl">
                        {player.charAt(0).toUpperCase()}
                      </div>
                      {player}
                    </div>
                  ) : (
                    <div className="flex flex-row gap-4 items-center p-2 rounded-xl">
                      <div className="w-8 h-8 bg-blue rounded-full text-black font-bold flex justify-center items-center text-xl">
                        {player.charAt(0).toUpperCase()}
                      </div>
                      {player}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xl font-bold mb-4">{game.purpleTeam.name}</span>
            <ul className="w-full">
              {purplePlayersRef.current.map((player, index) => (
                <li key={index}>
                  {(guessingUserRef.current.username === player && guessingUserRef.current.team == 'purple') ? (
                    <div className="flex flex-row gap-4 items-center justify-end bg-darkBlue p-2 rounded-lg w-full drop-shadow-xl text-black font-bold">
                      {player}
                      <div className="w-8 h-8 bg-purple rounded-full text-black font-bold flex justify-center items-center text-xl">
                        {player.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-row gap-4 items-center justify-end p-2 rounded-lg w-full">
                      {player}
                      <div className="w-8 h-8 bg-purple rounded-full text-black font-bold flex justify-center items-center text-xl">
                        {player.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <ToastContainer />
    </main>
  );
}
