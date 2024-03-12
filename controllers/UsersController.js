import sha1 from 'sha1';
import dbClient from '../utils/db';

export async function postNew(req, res) {
  const { email, password } = req.body;
  if (!email) return res.status(400).json({ error: 'Missing email' });
  if (!password) return res.status(400).json({ error: 'Missing password' });

  const usersCollection = dbClient.db.collection('users');
  const existingUser = await usersCollection.findOne({ email });

  if (existingUser) {
    return res.status(400).json({ error: 'Already exists' });
  }

  const hashedPwd = sha1(password);

  const result = await usersCollection.insertOne({
    email,
    password: hashedPwd,
  });
  const { _id, email: userEmail } = result.ops[0];

  return res.status(201).json({ id: _id, email: userEmail });
}

export function getMe(req, res) {
  return req + res;
}
