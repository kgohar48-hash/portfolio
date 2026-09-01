import mongoose from "mongoose";

let connected = false;

export function isDbConnected() {
  return connected && mongoose.connection.readyState === 1;
}

/**
 * Connect to MongoDB. Non-fatal: if MONGO_URI is missing or the connection
 * fails, the API keeps running and contact messages fall back to a local file.
 */
export async function connectDb() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn("[db] MONGO_URI not set — running without a database (contact messages will be written to server/data/messages.local.json)");
    return false;
  }

  mongoose.connection.on("disconnected", () => {
    connected = false;
    console.warn("[db] disconnected");
  });
  mongoose.connection.on("reconnected", () => {
    connected = true;
    console.log("[db] reconnected");
  });

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    connected = true;
    console.log("[db] connected to MongoDB");
    return true;
  } catch (err) {
    connected = false;
    console.warn(`[db] connection failed (${err.message}) — continuing without a database`);
    return false;
  }
}
