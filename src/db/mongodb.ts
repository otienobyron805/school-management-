import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let dbInstance: Db | null = null;

/**
 * Sanitizes the MongoDB URI by removing accidental prefixes and surrounding quotes.
 */
function sanitizeUri(uri: string): string {
  let cleaned = uri.trim();
  if (cleaned.startsWith('MONGODB_URI=')) {
    cleaned = cleaned.replace('MONGODB_URI=', '').trim();
  }
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.substring(1, cleaned.length - 1).trim();
  }
  return cleaned;
}

/**
 * Lazy initialization helper for MongoDB client.
 * Returns the MongoDB Db instance if MONGODB_URI environment variable is provided,
 * or throws a helpful error message if not configured.
 */
export async function getMongoClient(): Promise<{ client: MongoClient; db: Db }> {
  const rawUri = process.env.MONGODB_URI || "mongodb+srv://otienobyron805_db_user:BYRON805679@school001.e6efz2g.mongodb.net/?retryWrites=true&w=majority&appName=School001";
  const uri = sanitizeUri(rawUri);
  
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined. Please configure MONGODB_URI in settings or .env file.');
  }

  const dbName = process.env.MONGODB_DB_NAME || "school_management";

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
  const rawUri = process.env.MONGODB_URI || "mongodb+srv://otienobyron805_db_user:BYRON805679@school001.e6efz2g.mongodb.net/?retryWrites=true&w=majority&appName=School001";
  const uri = sanitizeUri(rawUri);
  
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
