import { CacheClient, CredentialProvider, CacheDictionaryFetch, CacheSetFetch, CacheDictionaryIncrement, CacheDictionaryGetField } from '@gomomento/sdk';

const GAME_STATUSES = ['Waiting for players...', 'Playing', 'Complete'];

const cache = new CacheClient({
  credentialProvider: CredentialProvider.fromEnvVar('MOMENTO'),
  defaultTtlSeconds: 3600
});

export default async function handler(req, res) {
  try {
    const { authorization } = req.headers;
    if (!authorization) {
      res.status(403).json({ message: 'Unauthorized' });
      return;
    }

    if (req.method === 'POST') {
      const { gameId, questionId } = req.query;
      const input = req.body;
      const response = await cache.dictionaryFetch('game', gameId);;
      if (response instanceof CacheDictionaryFetch.Miss) {
        res.status(404).json({ message: 'Game not found' });
        return;
      }

      const gameDetails = response.value();
      if (gameDetails.passKey !== authorization) {
        res.status(403).json({ message: 'Unauthorized' });
        return;
      }

      if(!input.team || !input.username){
        res.status(204).end();
        return;
      }

      if(!['blue', 'purple'].includes(input.team)){
        res.status(400).json({ message: 'Invalid team' });
        return;
      }

      const teamResponse = await cache.setFetch('game', `${gameId}-${input.team}`);
      if(teamResponse instanceof CacheSetFetch.Miss){
        res.status(404).json({ message: 'Team not found' });
        return;
      } else if(teamResponse instanceof CacheSetFetch.Hit) {
        const teamMembers = teamResponse.value();
        if(!teamMembers.includes(input.username)){
          res.status(400).json({ message: 'User is not found in provided team' });
          return;
        }
      }

      let newScore;
      const isCorrect = input.isCorrect;
      if (isCorrect) {
        const response = await cache.dictionaryIncrement('game', gameId, `${input.team}-score`, 10);
        if (response instanceof CacheDictionaryIncrement.Success) {
          newScore = response.value();
        } else {
          console.error('Could not update score', response.message());
          res.status(500).json({ message: 'Something went wrong' });
          return;
        }
      } else {
        if (gameDetails.deductPoints === 'true') {
          const response = await cache.dictionaryIncrement('game', gameId, `${input.team}-score`, -10);
          if (response instanceof CacheDictionaryIncrement.Success) {
            newScore = response.value();
          } else {
            console.error('Could not update score', response.message());
            res.status(500).json({ message: 'Something went wrong' });
            return;
          }
        } else {
          const response = await cache.dictionaryGetField('game', gameId, `${input.team}-score`);
          if (response instanceof CacheDictionaryGetField.Hit) {
            newScore = Number(response.value());
          }
          else {
            newScore = 0;
          }
        }
      }

      res.status(200).json({ team: input.team, score: newScore });
    }
    else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
};

