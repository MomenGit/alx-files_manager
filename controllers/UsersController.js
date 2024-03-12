import sha1 from 'sha1';
import { ObjectID } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export async function postNew(req, res) {
  const { email, password } = req.body;
  if (!email) return res.status(400).json({ error: 'Missing email' });
  if (!password) return res.status(400).json({ error: 'Missing password' });

  const usersCollection = dbClient.db.collection('users');
  const existingUser = await usersCollection.findOne({ email });

  if (existingUser) {
    return res.status(400).json({ error: 'Already exist' });
  }

  const hashedPwd = sha1(password);

  const result = await usersCollection.insertOne({
    email,
    password: hashedPwd,
  });
  const { _id, email: userEmail } = result.ops[0];

  return res.status(201).json({ id: _id, email: userEmail });
}

export async function getMe(req, res) {
  const token = req.get('X-Token');

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const key = `auth_${token}`;
  const userId = await redisClient.get(key);

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const user = await dbClient.db
    .collection('users')
    .findOne({ _id: ObjectID(userId) });

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return res.json({ id: user._id, email: user.email });
}
