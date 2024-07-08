const { AuthClient, CacheClient, TopicClient, CredentialProvider, ExpiresIn, TopicRole, CacheRole, GenerateDisposableToken, CacheDictionaryFetch, CacheSetFetch } = require('@gomomento/sdk');

const auth = new AuthClient({
  credentialProvider: CredentialProvider.fromEnvVar('MOMENTO')
});

const topicClient = new TopicClient({
  credentialProvider: CredentialProvider.fromEnvVar('MOMENTO')
});

const cacheClient = new CacheClient({
  credentialProvider: CredentialProvider.fromEnvVar('MOMENTO'),
  defaultTtlSeconds: 3600
});

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ message: 'Method not allowed' });
      return;
    }

    const { gameId } = req.query;
    const { authorization } = req.headers;
    if (!authorization) {
      res.status(403).json({ message: 'Unauthorized' });
      return;
    }

    let { username, team } = req.body;
    const response = await cacheClient.dictionaryFetch('game', gameId);
    let game;

    if (response instanceof CacheDictionaryFetch.Miss || response instanceof CacheDictionaryFetch.Error) {
      res.status(404).json({ message: 'Game not found' });
      return;
    } else {
      game = response.value();
      if (game.passKey !== authorization) {
        res.status(403).json({ message: 'Unauthorized' });
        return;
      }
    }

    if (!username) {
      res.status(400).json({ message: 'Missing username' });
      return;
    }

    if (username !== 'host') {
      if (game.status !== 'Waiting for players...') {
        res.status(409).json({ message: 'Game has already started' });
        return;
      }

      team = team?.toLowerCase();
      if (!team || (team !== 'blue' && team !== 'purple')) {
        res.status(400).json({ message: 'Invalid team' });
        return;
      }

      const currentTeam = await cacheClient.setFetch('game', `${gameId}-${team}`);
      if (currentTeam instanceof CacheSetFetch.Hit) {
        const teamMembers = currentTeam.value();
        if (!teamMembers.includes(username) && teamMembers.length >= 4) {
          res.status(409).json({ message: `The ${team} team is full.` });
          return;
        }
      }

      await cacheClient.setAddElement('game', `${gameId}-${team}`, username);
      await topicClient.publish('game', `${gameId}-players`, JSON.stringify(
        {
          purpleTeam: await getTeamMembers(gameId, 'purple'),
          blueTeam: await getTeamMembers(gameId, 'blue')
        }));
    }

    const tokenScope = getTokenScope(gameId, username);
    const token = await auth.generateDisposableToken(tokenScope, ExpiresIn.hours(1), { tokenId: `${team}#${username}` });
    if (token instanceof GenerateDisposableToken.Success) {
      const vendedToken = {
        token: token.authToken,
        exp: token.expiresAt.epoch()
      };
      res.status(200).json(vendedToken);
    } else if (token instanceof GenerateDisposableToken.Error) {
      console.error(token.errorCode());
      console.error(token.message());
      throw new Error('Unable to create auth token');
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
};

const getTokenScope = (gameId, username) => {
  if (username == 'host') {
    return {
      permissions: [
        {
          role: TopicRole.SubscribeOnly,
          cache: 'game',
          topic: `${gameId}-submit`
        },
        {
          role: TopicRole.SubscribeOnly,
          cache: 'game',
          topic: `${gameId}-players`
        },
        {
          role: TopicRole.PublishOnly,
          cache: 'game',
          topic: `${gameId}-status`
        },
        {
          role: CacheRole.ReadWrite,
          cache: 'game',
          item: {
            keyPrefix: gameId
          }
        }
      ]
    };
  } else {
    return {
      permissions: [
        {
          role: TopicRole.PublishOnly,
          cache: 'game',
          topic: `${gameId}-submit`
        },
        {
          role: TopicRole.SubscribeOnly,
          cache: 'game',
          topic: `${gameId}-status`
        },
        {
          role: CacheRole.ReadOnly,
          cache: 'game',
          item: {
            key: `${gameId}-status`
          }
        }
      ]
    };
  }
};

const getTeamMembers = async (gameId, team) => {
  let teamMembers = [];
  const response = await cacheClient.setFetch('game', `${gameId}-${team}`);
  if (response instanceof CacheSetFetch.Hit) {
    teamMembers = response.value();
  }
  return teamMembers;
};
