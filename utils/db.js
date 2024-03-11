import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const dbPort = process.env.DB_HOST || '27017';
    const dbHost = process.env.DB_PORT || 'localhost';
    const dbName = process.env.DB__DATABASE || 'files_manager';
    const uri = `mongodb://${dbHost}:${dbPort}`;

    this.client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    this.client.connect((err) => {
      if (err) {
        console.error('MongoDB connection error:', err);
      } else {
        console.log('Connected to MongoDB');
      }
    });

    this.db = this.client.db(dbName);
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    try {
      await this.db.collection('users').countDocuments();
    } catch (error) {
      console.error(error);
      await -1;
    }
  }

  async nbFiles() {
    try {
      await this.db.collection('files').countDocuments();
    } catch (error) {
      console.error(error);
      await -1;
    }
  }
}

const dbClient = new DBClient();
export default dbClient;
