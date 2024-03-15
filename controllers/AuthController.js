import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export async function getConnect(req, res) {
  const authHeader = req.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const encodedCredentials = authHeader.slice('Basic '.length);
  const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString(
    'utf-8',
  );

  if (!decodedCredentials.includes(':')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const [email, password] = decodedCredentials.split(':');

  const user = await dbClient.db
    .collection('users')
    .findOne({ email, password: sha1(password) });

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = uuidv4();
  const key = `auth_${token}`;

  await redisClient.set(key, user._id.toString(), 24 * 60 * 60);

  return res.status(200).json({ token });
}

/**
 * GET /disconnect should sign-out the user based on the token:
 * Retrieve the user based on the token:
 *     If not found, return an error Unauthorized with a status code 401
 *     Otherwise, delete the token in Redis and return nothing with a status code 204
 * @param {*} req
 * @param {*} res
 * @returns
 */
export async function getDisconnect(req, res) {
  const token = req.get('X-Token');

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const key = `auth_${token}`;
  const userId = await redisClient.get(key);

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  redisClient.del(key);

  return res.status(204).send();
}
