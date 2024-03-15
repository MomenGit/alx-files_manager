import redisClient from './redis';

export default async function authorize(req) {
  const token = req.get('X-Token');

  if (!token) {
    throw new Error('Unauthorized');
  }

  const key = `auth_${token}`;
  const userId = await redisClient.get(key);

  if (!userId) throw new Error('Unauthorized');

  return userId;
}
