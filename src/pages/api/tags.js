import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.NEON);

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const query = 'SELECT name FROM tag';
      const data = await sql(query);
      return res.status(200).json(data.map(tag => tag.name).sort());
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
}
