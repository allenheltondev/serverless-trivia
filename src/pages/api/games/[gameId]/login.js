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
    const { gameId } = req.query;
    const { authorization } = req.headers;
    if (req.method === 'POST') {
      let { username, team } = req.body;
      const response = await cacheClient.dictionaryGetField('game', `${gameId}-security`, 'passKey');

      if (!authorization || response.is_miss || response.value() != authorization) {
        res.status(403).json({ message: 'Unauthorized' });
        return;
      }

      if (!username) {
        res.status(400).json({ message: 'Missing username' });
        return;
      }

      if (username !== 'host') {
        team = team?.toLowerCase();
        if (!team || (team !== 'blue' && team !== 'purple')) {
          res.status(400).json({ message: 'Invalid team' });
          return;
        }
        await cacheClient.setAddElement('game', `${gameId}-${team}`, username);
        await topicClient.publish('game', `${gameId}-players`, JSON.stringify(
          {
            purple: await getTeamMembers(gameId, 'purple'),
            blue: await getTeamMembers(gameId, 'blue')
          }));
      }

      const tokenScope = getTokenScope(gameId, username);
      const token = await auth.generateDisposableToken(tokenScope, ExpiresIn.hours(1), { tokenId: username });
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
    } else if (req.method === 'GET') {
      const cache = new CacheClient({
        credentialProvider: CredentialProvider.fromString(authorization),
        defaultTtlSeconds: 60
      });
      if (!authorization) {
        res.status(403).json({ message: 'Unauthorized' });
        return;
      }

      const response = await cache.dictionaryFetch('game', `${gameId}-security`);
      if (response instanceof CacheDictionaryFetch.Hit) {
        const game = response.value();
        const loginUrl = `/games/${gameId}/play?passKey=${game.passKey}`;
        res.status(200).json({ loginUrl });
      }
      res.status(409).json({ message: 'Something is wrong with the state of the game' });
    }
    else {
      res.status(405).json({ message: 'Method not allowed' });
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
