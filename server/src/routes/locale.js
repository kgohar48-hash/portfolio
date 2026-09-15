import { Router } from "express";
import { clientIp } from "../lib/enrich.js";
import { geolocate } from "../lib/geo.js";

const router = Router();

// GET /api/locale — best-effort IP geolocation so the client can auto-pick a
// language (e.g. Germany/Austria/Switzerland -> German) for visitors whose
// browser doesn't already disclose a language preference. Never blocks or
// throws; falls back to { countryCode: null }.
router.get("/", async (req, res) => {
  const ip = clientIp(req);
  const geo = await geolocate(ip).catch(() => null);
  res.json({ countryCode: geo?.countryCode || null });
});

export default router;
