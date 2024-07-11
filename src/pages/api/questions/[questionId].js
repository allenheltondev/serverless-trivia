import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.NEON);

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { questionId } = req.query;
      const query = 'SELECT * FROM question WHERE id= $1 LIMIT 1';
      const data = await sql(query, [questionId]);
      if (data.length) {
        res.status(200).json(data[0]);
      } else {
        res.status(404).json({ message: 'Question not found' });
      }
    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
};
