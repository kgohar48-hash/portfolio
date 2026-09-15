import { Router } from "express";
import { isDbConnected } from "../config/db.js";
import Content from "../models/Content.js";
import { portfolio as filePortfolioEn } from "../data/portfolio.js";
import { portfolio as filePortfolioDe } from "../data/portfolio.de.js";

const router = Router();

const FILES = { en: filePortfolioEn, de: filePortfolioDe };
const CONTENT_KEYS = { en: "portfolio", de: "portfolio_de" };

// GET /api/portfolio?lang=en|de — returns the portfolio content in the
// requested language (defaults to English). Prefers the DB copy for that
// language (so it can be edited without a redeploy) and falls back to the
// checked-in file.
router.get("/", async (req, res) => {
  const lang = req.query.lang === "de" ? "de" : "en";
  const filePortfolio = FILES[lang];
  try {
    if (isDbConnected()) {
      const doc = await Content.findOne({ key: CONTENT_KEYS[lang] }).lean();
      if (doc?.data) {
        return res.json({ source: "db", lang, data: doc.data });
      }
    }
  } catch (err) {
    console.warn(`[portfolio] DB read failed, serving file copy (${err.message})`);
  }
  return res.json({ source: "file", lang, data: filePortfolio });
});

export default router;
