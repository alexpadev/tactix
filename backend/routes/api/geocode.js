const express = require('express');
const fetch = require('node-fetch');
const Bottleneck = require('bottleneck');
const limiter = new Bottleneck({ minTime: 1000 });
require('dotenv').config();

async function reverseGeocode(lat, lon) {
  const key = process.env.LOCATIONIQ_KEY;
  const url = new URL('https://us1.locationiq.com/v1/reverse');
  url.searchParams.set('key', key);
  url.searchParams.set('lat', lat);
  url.searchParams.set('lon', lon);
  url.searchParams.set('format', 'json');

  try {
    const resp = await limiter.schedule(() => fetch(url.toString()));
    if (!resp.ok) return 'Ubicación desconocida';
    const json = await resp.json();
    const addr = json.address || {};
    const street   = addr.road || addr.pedestrian || '';
    const city     = addr.city || addr.town || addr.village || '';
    const province = addr.state || '';
    const country  = addr.country || '';
    return [street, city, province, country].filter(Boolean).join(', ') || 'Ubicación desconocida';
  } catch {
    return 'Ubicación desconocida';
  }
}

const router = express.Router();
router.get('/reverse', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat y lon obligatorios' });
  const address = await reverseGeocode(lat, lon);
  res.json({ address });
});

module.exports = { router, reverseGeocode };
