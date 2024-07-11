import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.NEON);

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const query = 'SELECT question FROM question';
      const data = await sql(query);
      return res.status(200).json(data);
    } else if (req.method === 'POST') {
      const { question, answer, tags } = req.body;

      const query = 'INSERT INTO question (question, answer) VALUES ($1, $2) RETURNING id';
      const newQuestion = await sql(query, [question, answer]);
      for (const tag of tags ?? []) {
        const tagSelectQuery = 'SELECT id FROM tag WHERE name = $1';
        const existingTag = await sql(tagSelectQuery, [tag]);
        let tagId;
        if (existingTag.length === 0) {
          const tagInsertQuery = 'INSERT INTO tag (name) VALUES ($1) RETURNING id';
          const newTag = await sql(tagInsertQuery, [tag]);
          tagId = newTag[0].id;
        } else {
          tagId = existingTag[0].id;
        }
        const questionTagQuery = 'INSERT INTO question_tag (question_id, tag_id) VALUES ($1, $2)';
        await sql(questionTagQuery, [newQuestion[0].id, tagId]);
      }
      return res.status(201).json({ id: newQuestion[0].id });
    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}
