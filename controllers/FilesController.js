import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ObjectID } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import authorize from '../utils/auth';

// eslint-disable-next-line import/prefer-default-export
export async function postUpload(req, res) {
  const token = req.get('X-Token');

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const key = `auth_${token}`;
  const userId = await redisClient.get(key);

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  // eslint-disable-next-line object-curly-newline
  const { name, type, parentId = 0, isPublic = false, data } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Missing name' });
  }

  if (!type || !['folder', 'file', 'image'].includes(type)) {
    return res.status(400).json({ error: 'Missing type' });
  }
  if (type !== 'folder' && !data) {
    return res.status(400).json({ error: 'Missing data' });
  }

  if (parentId) {
    const parentFile = dbClient.db
      .collection('files')
      .findOne({ _id: ObjectID(parentId) });

    if (!parentFile) {
      return res.status(400).json({ error: 'Parent not found' });
    }

    if (parentFile.type !== 'folder') {
      return res.status(400).json({ error: 'Parent is not a folder' });
    }
  }
  const fileData = {
    userId: ObjectID(userId),
    name,
    type,
    parentId: ObjectID(parentId),
    isPublic,
  };

  const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
  const filename = uuidv4();
  const filePath = path.join(folderPath, filename);

  if (type !== 'folder') {
    const fileBuffer = Buffer.from(data, 'base64');

    try {
      fs.writeFileSync(filePath, fileBuffer);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to save file' });
    }
  }

  fileData.localPath = filePath;

  const opResult = await dbClient.db.collection('files').insertOne(fileData);
  const newFile = {
    id: opResult.insertedId,
    userId,
    name,
    type,
    isPublic,
    parentId,
  };

  return res.status(201).json(newFile);
}

// eslint-disable-next-line no-unused-vars, no-empty-function
export async function getIndex(req, res) {}
export async function getShow(req, res) {
  let userId;

  try {
    userId = await authorize(req);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
  const filesCollection = dbClient.db.collection('files');

  const file = filesCollection.findOne({
    _id: ObjectID(req.params.id),
    userId,
  });

  if (!file) {
    return res.status(404).json({ error: 'Not found' });
  }

  return res.json(file);
}
