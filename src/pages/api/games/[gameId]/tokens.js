const { AuthClient, CacheClient, Configurations, CredentialProvider, ExpiresIn, TopicRole, CacheRole, GenerateDisposableToken } = require('@gomomento/sdk');

const auth = new AuthClient({
  credentialProvider: CredentialProvider.fromEnvVar('MOMENTO')
});

// /api/game/{gameId}/tokens?username=allen
export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ message: 'Method not allowed' });
      return;
    }

    const { gameId, username } = req.query;
    if (!username) {
      res.status(400).json({ message: 'Missing username' });
      return;
    }
    console.log(username);

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
          role: TopicRole.PublishOnly,
          cache: 'game',
          topic: `${gameId}-status`
        },
        {
          role: CacheRole.WriteOnly,
          cache: 'game',
          item: {
            key: `${gameId}-status`
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
