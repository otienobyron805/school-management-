import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let dbInstance: Db | null = null;

/**
 * Lazy initialization helper for MongoDB client.
 * Returns the MongoDB Db instance if MONGODB_URI environment variable is provided,
 * or throws a helpful error message if not configured.
 */
export async function getMongoClient(): Promise<{ client: MongoClient; db: Db }> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined. Please configure MONGODB_URI in settings or .env file.');
  }

  const dbName = process.env.MONGODB_DB_NAME || 'school_management_db';

  if (!client) {
    client = new MongoClient(uri, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    dbInstance = client.db(dbName);
    console.log(`[MongoDB] Connected successfully to database: ${dbName}`);
  }

  return { client, db: dbInstance! };
}

/**
 * Checks if MongoDB environment configuration is present and tests the connection.
 */
export async function checkMongoStatus(): Promise<{ connected: boolean; message: string; dbName?: string; collectionsCount?: number }> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return {
      connected: false,
      message: 'MONGODB_URI environment variable is not set',
    };
  }

  try {
    const { db } = await getMongoClient();
    const collections = await db.listCollections().toArray();
    return {
      connected: true,
      message: 'Successfully connected to MongoDB cluster',
      dbName: db.databaseName,
      collectionsCount: collections.length,
    };
  } catch (error: any) {
    return {
      connected: false,
      message: error.message || 'Failed to connect to MongoDB cluster',
    };
  }
}
