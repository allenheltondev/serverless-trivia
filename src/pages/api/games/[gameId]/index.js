import { CacheClient, CredentialProvider, CacheDictionaryFetch, CacheSetFetch } from '@gomomento/sdk';

const GAME_STATUSES = ['Waiting for players...', 'Playing', 'Complete'];

const cache = new CacheClient({
  credentialProvider: CredentialProvider.fromEnvVar('MOMENTO'),
  defaultTtlSeconds: 3600
});

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { gameId, passKey } = req.query;
      const response = await cache.dictionaryFetch('game', gameId);;
      if (response instanceof CacheDictionaryFetch.Miss) {
        res.status(404).json({ message: 'Game not found' });
        return;
      }

      const gameDetails = response.value();
      if (!passKey || gameDetails.passKey !== passKey) {
        res.status(403).json({ message: 'Unauthorized' });
        return;
      }

      const game = {
        id: gameId,
        blueTeam: {
          name: gameDetails.blueTeamName,
          players: await getTeamMembers(gameId, 'blue')
        },
        purpleTeam: {
          name: gameDetails.purpleTeamName,
          players: await getTeamMembers(gameId, 'purple')
        },
        deductPoints: gameDetails.deductPoints,
        multipleAttempts: gameDetails.multipleAttempts,
        status: gameDetails.status
      };

      res.status(200).json(game);

    } else if (req.method === 'PUT') {
      const { status } = req.body;
      const { authorization } = req.headers;
      const { gameId} = req.query;

      const response = await cache.dictionaryFetch('game', gameId);
      if(response instanceof CacheDictionaryFetch.Miss) {
        res.status(404).json({ message: 'Game not found' });
        return;
      }

      const game = response.value();
      if(!authorization || game.passKey !== authorization) {
        res.status(403).json({ message: 'Unauthorized' });
        return;
      }

      if(!GAME_STATUSES.includes(status)){
        res.status(400).json({ message: 'Invalid status' });
        return;
      }

      await cache.dictionarySetField('game', gameId, 'status', status);
      res.status(204).end();
      return;
    }
    else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

const getTeamMembers = async (gameId, team) => {
  let teamMembers = [];
  const response = await cache.setFetch('game', `${gameId}-${team}`);
  if (response instanceof CacheSetFetch.Hit) {
    teamMembers = response.value();
  }
  return teamMembers;
};
