import "dotenv/config";
import mongoose from "mongoose";
import { connectDb, isDbConnected } from "./config/db.js";
import Content from "./models/Content.js";
import { portfolio } from "./data/portfolio.js";

async function run() {
  await connectDb();
  if (!isDbConnected()) {
    console.error("[seed] no database connection — set MONGO_URI in server/.env first");
    process.exit(1);
  }

  await Content.findOneAndUpdate(
    { key: "portfolio" },
    { key: "portfolio", data: portfolio },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log("[seed] portfolio content upserted into MongoDB");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
