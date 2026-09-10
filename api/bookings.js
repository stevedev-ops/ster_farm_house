// Vercel Serverless Function: Manage & Fetch Booked Dates
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-pin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const ADMIN_PIN = String(process.env.ADMIN_PIN || '2540').trim();
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO = process.env.GITHUB_REPO || 'stevedev-ops/ster_farm_house';
  const KV_URL = process.env.KV_REST_API_URL;
  const KV_TOKEN = process.env.KV_REST_API_TOKEN;

  // 1. GET: Fetch currently booked dates
  if (req.method === 'GET') {
    try {
      // Option A: Vercel KV
      if (KV_URL && KV_TOKEN) {
        const kvRes = await fetch(`${KV_URL}/get/booked_dates`, {
          headers: { Authorization: `Bearer ${KV_TOKEN}` }
        });
        if (kvRes.ok) {
          const kvData = await kvRes.json();
          const dates = kvData.result ? JSON.parse(kvData.result) : [];
          return res.status(200).json({ dates, source: 'vercel_kv' });
        }
      }

      // Option B: GitHub Repository data/booked-dates.json
      if (GITHUB_TOKEN) {
        const ghRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data/booked-dates.json`, {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'STER-Farmhouse-Admin'
          }
        });
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          const content = Buffer.from(ghData.content, 'base64').toString('utf-8');
          const dates = JSON.parse(content);
          return res.status(200).json({ dates, source: 'github_file', sha: ghData.sha });
        }
      }

      // Option C: Local filesystem
      const localFile = path.join(process.cwd(), 'data', 'booked-dates.json');
      if (fs.existsSync(localFile)) {
        const raw = fs.readFileSync(localFile, 'utf-8');
        const dates = JSON.parse(raw || '[]');
        return res.status(200).json({ dates, source: 'local_file' });
      }

      return res.status(200).json({ dates: [], source: 'default' });
    } catch (err) {
      console.error('Error fetching booked dates:', err);
      return res.status(200).json({ dates: [], error: err.message });
    }
  }

  // 2. POST: Update booked dates (Requires PIN)
  if (req.method === 'POST') {
    try {
      let bodyData = req.body;
      if (typeof bodyData === 'string') {
        try { bodyData = JSON.parse(bodyData); } catch (e) {}
      }

      let pin = req.headers['x-admin-pin'] || (bodyData && bodyData.pin);
      pin = String(pin || '').trim();

      if (pin !== ADMIN_PIN) {
        return res.status(401).json({ error: 'Unauthorized: Invalid Admin PIN' });
      }

      const rawDates = bodyData && Array.isArray(bodyData.dates) ? bodyData.dates : [];
      // Clean and sort dates
      const uniqueSortedDates = Array.from(new Set(rawDates)).sort();

      let savedSource = 'local_file';

      // Save to Vercel KV if available
      if (KV_URL && KV_TOKEN) {
        await fetch(`${KV_URL}/set/booked_dates`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${KV_TOKEN}` },
          body: JSON.stringify(JSON.stringify(uniqueSortedDates))
        });
        savedSource = 'vercel_kv';
      }

      // Save to GitHub repo if token is set
      if (GITHUB_TOKEN) {
        // Get existing file SHA
        const getFile = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data/booked-dates.json`, {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'STER-Farmhouse-Admin'
          }
        });

        let sha = null;
        if (getFile.ok) {
          const fileData = await getFile.json();
          sha = fileData.sha;
        }

        const newContent = Buffer.from(JSON.stringify(uniqueSortedDates, null, 2)).toString('base64');
        const payload = {
          message: `Admin: update booked dates (${uniqueSortedDates.length} dates reserved)`,
          content: newContent
        };
        if (sha) payload.sha = sha;

        await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data/booked-dates.json`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'STER-Farmhouse-Admin'
          },
          body: JSON.stringify(payload)
        });
        savedSource = 'github_file';
      }

      // Save locally as well if possible
      try {
        const localFile = path.join(process.cwd(), 'data', 'booked-dates.json');
        fs.writeFileSync(localFile, JSON.stringify(uniqueSortedDates, null, 2), 'utf-8');
      } catch (e) {
        // In read-only serverless environment this is ignored
      }

      return res.status(200).json({
        success: true,
        message: 'Booked dates updated successfully',
        savedSource,
        dates: uniqueSortedDates
      });
    } catch (err) {
      console.error('Error saving booked dates:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
