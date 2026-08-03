import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;

if (!uri) {
  throw new Error('MONGODB_URI environment variable is missing');
}

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getMongoDb(): Promise<Db> {
  if (db) return db;

  if (!client) {
    client = new MongoClient(uri!);
    await client.connect();
  }

  db = client.db(dbName);
  return db;
}
