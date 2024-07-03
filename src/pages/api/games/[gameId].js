import { CacheClient, CredentialProvider, CacheSetFetch } from '@gomomento/sdk';
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.NEON);
let cache;

export default async function handler(req, res) {
  try {
    initializeMomento();
    const { gameId, tag } = req.query;

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
    console.log(query)
    const result = tag ? await sql(query, [tag]) : await sql(query);
    const question = result[0];
    if(!question){
      return res.status(404).json({ message: 'No more questions matching requested criteria' });
    }
    await cache.setAddElement('game', gameId, `${question.id}`);
    return res.status(200).json({ question: question.question, answer: question.answer });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

const initializeMomento = async () => {
  if (!cache) {
    cache = new CacheClient({
      credentialProvider: CredentialProvider.fromEnvVar('MOMENTO'),
      defaultTtlSeconds: 3600
    });
  }
};
