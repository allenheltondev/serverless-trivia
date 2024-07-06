const { AuthClient, CacheClient, CredentialProvider, ExpiresIn, TopicRole, CacheRole, GenerateDisposableToken, CacheDictionaryFetch } = require('@gomomento/sdk');
import { verifyHashKey } from "../../security/helper";

const auth = new AuthClient({
  credentialProvider: CredentialProvider.fromEnvVar('MOMENTO')
});

export default async function handler(req, res) {
  try {
    const { gameId } = req.query;
    const { authorization } = req.headers;
    if (req.method === 'POST') {
      const { username, passKey } = req.body;
      if (!authorization || !verifyHashKey(passKey, authorization)) {
        res.status(403).json({ message: 'Unauthorized' });
        return;
      }

      if (!username) {
        res.status(400).json({ message: 'Missing username' });
        return;
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
      if(!authorization){
        res.status(403).json({ message: 'Unauthorized' });
        return;
      }

      const response = await cache.dictionaryFetch('game', `${gameId}-security`);
      console.log(response);
      if(response instanceof CacheDictionaryFetch.Hit){
        const game = response.value();
        const loginUrl = `/games/${gameId}/play?passKey=${game.passKey}&securityKey=${game.hash}`;
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
