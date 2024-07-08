import { CacheClient, CredentialProvider, CacheSetFetch, CacheDictionaryGetField } from '@gomomento/sdk';
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.NEON);
const cache = new CacheClient({
  credentialProvider: CredentialProvider.fromEnvVar('MOMENTO'),
  defaultTtlSeconds: 3600
});

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { gameId, tag } = req.query;
    const { authorization } = req.headers;
    if (!authorization) {
      res.status(403).json({ message: 'Unauthorized' });
      return;
    }

    let game = await cache.dictionaryGetField('game', gameId, 'passKey');
    if (game instanceof CacheDictionaryGetField.Miss || game instanceof CacheDictionaryGetField.Error) {
      res.status(404).json({ message: 'Game not found' });
      return;
    } else {
      if (game.value() !== authorization) {
        res.status(403).json({ message: 'Unauthorized' });
        return;
      }
    }

    const previousResponse = await cache.setFetch('game', gameId);
    let previousIds = [];
    if (previousResponse instanceof CacheSetFetch.Hit) {
      previousIds = previousResponse.value();
    }

    let query = `
        SELECT q.id, q.question, q.answer
        FROM question q
        LEFT JOIN question_tag qt ON q.id = qt.question_id
        LEFT JOIN tag t ON qt.tag_id = t.id
        ${previousIds.length ? `WHERE q.id NOT IN (${previousIds.join(', ')})` : ``}
      `;
    if (tag) {
      if (!previousIds.length) {
        query += ' WHERE ';
      } else {
        query += ' AND ';
      }
      query += `t.name ILIKE $1 ORDER BY RANDOM() LIMIT 1`;
    } else {
      query += ` ORDER BY RANDOM() LIMIT 1`;
    }

    const result = tag ? await sql(query, [tag]) : await sql(query);
    const question = result[0];
    if (!question) {
      res.status(409).json({ message: 'No more questions matching requested criteria. Try changing or removing the tag.' });
    }
    await cache.setAddElement('game', gameId, `${question.id}`);
    res.status(200).json({ id: question.id, question: question.question, answer: question.answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
}
