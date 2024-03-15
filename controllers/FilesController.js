import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import mime from 'mime-types';
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
    const parentFile = await dbClient.db
      .collection('files')
      .findOne({ _id: ObjectId(parentId) });

    if (!parentFile) {
      return res.status(400).json({ error: 'Parent not found' });
    }

    if (parentFile.type !== 'folder') {
      return res.status(400).json({ error: 'Parent is not a folder' });
    }
  }

  const fileData = {
    userId: ObjectId(userId),
    name,
    type,
    parentId: parentId ? ObjectId(parentId) : parentId,
    isPublic,
  };

  // Writes data to file
  if (type !== 'folder') {
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';

    if (!fs.existsSync(folderPath)) {
      // If current directory does not exist
      // then create it
      try {
        fs.mkdirSync(folderPath);
      } catch (error2) {
        return res.status(500).json({ error: 'Failed to save file' });
      }
    }

    const filename = uuidv4();
    const filePath = path.join(folderPath, filename);
    const fileBuffer = Buffer.from(data, 'base64');

    try {
      fs.writeFileSync(filePath, fileBuffer);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to save file' });
    }

    fileData.localPath = filePath;
  }

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
export async function getIndex(req, res) {
  const { parentId = 0, page = 0 } = req.query;

  let userId;
  try {
    userId = await authorize(req);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  const filesCollection = dbClient.db.collection('files');
  const pageSize = 20;
  const skip = page * pageSize;

  const files = await filesCollection
    .find({
      parentId: parentId ? ObjectId(parentId) : parentId,
      userId: ObjectId(userId),
    })
    .skip(skip)
    .limit(pageSize)
    .toArray();

  return res.json(files);
}
export async function getShow(req, res) {
  let userId;

  try {
    userId = await authorize(req);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
  const filesCollection = dbClient.db.collection('files');

  const file = await filesCollection.findOne({
    _id: ObjectId(req.params.id),
    userId: ObjectId(userId),
  });

  if (!file) {
    return res.status(404).json({ error: 'Not found' });
  }

  return res.json(file);
}

async function publish(req, res, isPublic) {
  let userId;

  try {
    userId = await authorize(req);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
  const filesCollection = dbClient.db.collection('files');

  const updateResult = await filesCollection.findOneAndUpdate(
    {
      _id: ObjectId(req.params.id),
      userId: ObjectId(userId),
    },
    { $set: { isPublic } },
  );

  if (!updateResult.value) {
    return res.status(404).json({ error: 'Not found' });
  }

  const file = {
    id: updateResult.value._id,
    userId: updateResult.value.userId,
    name: updateResult.value.name,
    type: updateResult.value.type,
    isPublic,
    parentId: updateResult.value.parentId,
  };

  return res.status(200).json(file);
}
export async function putPublish(req, res) {
  return publish(req, res, true);
}

export async function putUnpublish(req, res) {
  return publish(req, res, false);
}

export async function getFile(req, res) {
  const filesCollection = dbClient.db.collection('files');
  const file = await filesCollection.findOne({
    _id: ObjectId(req.params.id),
  });

  if (!file) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (!file.isPublic) {
    let userId;

    try {
      userId = await authorize(req);
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!userId || file.userId !== userId) {
      return res.status(404).json({ error: 'Not found' });
    }
  }
  if (file.type === 'folder') {
    return res.status(400).json({ error: "A folder doesn't have content" });
  }
  if (!fs.existsSync(file.localPath)) {
    return res.status(404).json({ error: 'Not found' });
  }

  const mimeType = mime.lookup(file.name) || 'application/octet-stream';
  const fileContent = fs.readFileSync(file.localPath, 'utf-8');

  res.set('Content-Type', mimeType);

  return res.send(fileContent);
}
