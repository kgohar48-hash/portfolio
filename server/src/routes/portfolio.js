import { Router } from "express";
import { isDbConnected } from "../config/db.js";
import Content from "../models/Content.js";
import { portfolio as filePortfolio } from "../data/portfolio.js";

const router = Router();

// GET /api/portfolio — returns the portfolio content.
// Prefers the DB copy (so it can be edited without a redeploy) and falls
// back to the checked-in file.
router.get("/", async (_req, res) => {
  try {
    if (isDbConnected()) {
      const doc = await Content.findOne({ key: "portfolio" }).lean();
      if (doc?.data) {
        return res.json({ source: "db", data: doc.data });
      }
    }
  } catch (err) {
    console.warn(`[portfolio] DB read failed, serving file copy (${err.message})`);
  }
  return res.json({ source: "file", data: filePortfolio });
});

export default router;
