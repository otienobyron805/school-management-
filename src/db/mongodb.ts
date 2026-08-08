import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let dbInstance: Db | null = null;

/**
 * Lazy initialization helper for MongoDB client.
 * Returns the MongoDB Db instance if MONGODB_URI environment variable is provided,
 * or throws a helpful error message if not configured.
 */
export async function getMongoClient(): Promise<{ client: MongoClient; db: Db }> {
  const uri = process.env.MONGODB_URI || "mongodb+srv://otienobyron805_db_user:BYRON805679@school001.e6efz2g.mongodb.net/?retryWrites=true&w=majority&appName=School001";
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined. Please configure MONGODB_URI in settings or .env file.');
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const defaultDbName = isProduction ? 'school_production' : 'school_management';
  const dbName = process.env.MONGODB_DB_NAME || defaultDbName;

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
  const uri = process.env.MONGODB_URI || "mongodb+srv://otienobyron805_db_user:BYRON805679@school001.e6efz2g.mongodb.net/?retryWrites=true&w=majority&appName=School001";
  if (!uri) {
    return {
      connected: false,
      message: 'MONGODB_URI environment variable is not set',
    };
  }

  const maskedUri = uri.replace(/\/\/.*@/, "//****:****@").split('?')[0];

  try {
    const { db } = await getMongoClient();
    const collections = await db.listCollections().toArray();
    return {
      connected: true,
      message: `Successfully connected to MongoDB cluster (${maskedUri})`,
      dbName: db.databaseName,
      collectionsCount: collections.length,
    };
  } catch (error: any) {
    return {
      connected: false,
      message: `Failed to connect to MongoDB cluster (${maskedUri}): ${error.message}`,
    };
  }
}
