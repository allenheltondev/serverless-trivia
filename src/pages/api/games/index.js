import { CacheClient, CredentialProvider, CacheSetFetch } from '@gomomento/sdk';
import { createHashKey } from '../security/helper';

const cache = new CacheClient({
  credentialProvider: CredentialProvider.fromEnvVar('MOMENTO'),
  defaultTtlSeconds: 3600
});

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      let games = [];
      const response = await cache.setFetch('game', 'gameList');
      if (response instanceof CacheSetFetch.Hit) {
        games = response.value();
      }
      res.status(200).json({ games });
    } else if (req.method == 'POST') {
      const game = req.body;
      game.status = 'Waiting';

      const hash = createHashKey(game.passKey);
      const gameId = generategameId();

      await cache.setAddElement('game', 'gameList', gameId);
      await cache.dictionarySetFields('game', gameId, game);
      await cache.dictionarySetFields('game', `${gameId}-security`, { hash, passKey: game.passKey });

      res.status(201).json({ id: gameId, hash, passKey: game.passKey });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

const generategameId = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let id = '';
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    id += characters[randomIndex];
  }
  return id;
};
