import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export function getStatus(req, res) {
  res.json({ redis: redisClient.isAlive(), db: dbClient.isAlive() });
  res.send();
}

export async function getStats(req, res) {
  res.json({
    users: await dbClient.nbUsers(),
    files: await dbClient.nbFiles(),
  });
  res.send();
}
