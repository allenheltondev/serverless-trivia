import { CacheClient, CredentialProvider, CacheDictionaryFetch, CacheSetFetch } from '@gomomento/sdk';

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
        deductPoints: gameDetails.deductPoints
      };

      res.status(200).json(game);

    } else {
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
