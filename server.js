const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const { parseStringPromise } = require('xml2js');
const FTPClient = require('molex-ftp-client');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

//! Privileges editor backend server
//! - Serves static UI and provides helper endpoints for Steam lookups and FTP operations

//! Validate SteamIDs by fetching public Steam profile XML
//! \param req.body.steamids - array of SteamID strings
//! Returns JSON: { results: [ { id, valid, avatar, name } ] }
app.post('/validate', async (req, res) =>
{
  const steamids = Array.isArray(req.body.steamids) ? req.body.steamids : [];
  const results = await Promise.all(steamids.map(async (id) =>
  {
    try
    {
      const url = `https://steamcommunity.com/profiles/${encodeURIComponent(id)}/?xml=1`;
      const r = await fetch(url, { timeout: 8000 });
      if (!r.ok) return { id, valid: false };
      const text = await r.text();
      const parsed = await parseStringPromise(text);
      const player = parsed?.profile || {};
      const avatar = player?.avatarFull?.[0] || player?.avatar?.[0] || null;
      const name = player?.steamID?.[0] || player?.steamID32?.[0] || null;
      return { id, valid: !!avatar, avatar, name };
    } catch (e)
    {
      return { id, valid: false };
    }
  }));
  res.json({ results });
});

//! Upload privileges.xml to remote FTP server (GPortal)
//! \param req.body - { host, port, username, password, xml, remotePath }
//! Returns JSON: { ok: true, uploadedTo }
app.post('/upload-ftp', async (req, res) =>
{
  const { host, port, username, password, xml, remotePath } = req.body;
  if (!host || !username || !password || !xml) return res.status(400).json({ error: 'missing parameters' });

  const client = new FTPClient({
    debug: true,
    logger: (msg, ...args) => console.log(`[FTP Upload ${host}]`, msg, ...args)
  });

  try
  {
    await client.connect({ host, port: port || 21, user: username, password });
    const target = remotePath || '/Assets/privileges.xml';
    await client.upload(xml, target, true);
    res.json({ ok: true, uploadedTo: target, message: 'File uploaded successfully' });
  } catch (err)
  {
    res.status(500).json({ error: err.message || String(err) });
  } finally
  {
    try { await client.close(); } catch (e) { /* ignore close errors */ }
  }
});

//! Download a remote file from FTP and return its contents
//! \param req.body - { host, port, username, password, remotePath }
//! Returns JSON: { ok: true, xml }
app.post('/download-ftp', async (req, res) =>
{
  const { host, port, username, password, remotePath } = req.body;
  if (!host || !username || !password) return res.status(400).json({ error: 'missing parameters' });

  const client = new FTPClient({
    debug: true,
    logger: (msg, ...args) => console.log(`[FTP Download ${host}]`, msg, ...args)
  });

  try
  {
    await client.connect({ host, port: port || 21, user: username, password });
    const target = remotePath || '/Assets/privileges.xml';
    
    // Use downloadStream for better performance with privileges.xml
    const { PassThrough } = require('stream');
    const stream = new PassThrough();
    const chunks = [];

    stream.on('data', (chunk) => chunks.push(chunk));

    await client.downloadStream(target, stream);
    const buffer = Buffer.concat(chunks);
    const xml = buffer.toString('utf8');

    res.json({ ok: true, xml, message: 'File downloaded successfully' });
  } catch (err)
  {
    res.status(500).json({ error: err.message || String(err) });
  } finally
  {
    try { await client.close(); } catch (e) { /* ignore close errors */ }
  }
});

//! Check whether a file exists on the FTP server
//! \param req.body - { host, port, username, password, remotePath }
//! Returns JSON: { exists: boolean, size?: number }
app.post('/check-ftp', async (req, res) =>
{
  const { host, port, username, password, remotePath } = req.body;
  if (!host || !username || !password) return res.status(400).json({ error: 'missing parameters' });

  const client = new FTPClient({
    debug: true,
    logger: (msg, ...args) => console.log(`[FTP Check ${host}]`, msg, ...args)
  });

  try
  {
    await client.connect({ host, port: port || 21, user: username, password });
    const target = remotePath || '/Assets/privileges.xml';
    const info = await client.stat(target);
    res.json({ exists: info.exists, size: info.size, message: info.exists ? 'File exists on server' : 'File not found on server' });
  } catch (err)
  {
    res.status(500).json({ error: err.message || String(err) });
  } finally
  {
    try { await client.close(); } catch (e) { /* ignore close errors */ }
  }
});

//! Resolve a Steam profile URL (vanity or numeric) to a 17-digit SteamID64
//! \query profileUrl - Steam profile URL or vanity path
//! Returns JSON: { steamid64, avatar, name }
app.get('/resolve-steam', async (req, res) =>
{
  const profileUrl = req.query.profileUrl;
  const steamApiKey = process.env.STEAM_API_KEY;
  if (!profileUrl) return res.status(400).json({ error: 'profileUrl query param required' });

  try
  {
    const steamIdMatch = profileUrl.match(/\/id\/([^/]+)|\/profiles\/(\d+)/);
    if (!steamIdMatch) return res.status(400).json({ error: 'Invalid Steam profile URL' });

    const vanityName = steamIdMatch[1];
    const steamIdNumeric = steamIdMatch[2];

    let resolvedSteamId64;
    if (vanityName)
    {
      if (!steamApiKey) return res.status(500).json({ error: 'STEAM_API_KEY not configured' });
      const url = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${steamApiKey}&vanityurl=${encodeURIComponent(vanityName)}`;
      const r = await fetch(url, { timeout: 8000 });
      if (!r.ok) return res.status(500).json({ error: 'Failed to call Steam API' });
      const d = await r.json();
      if (!d.response || d.response.success !== 1) return res.status(400).json({ error: 'Could not resolve vanity URL' });
      resolvedSteamId64 = d.response.steamid;
    } else
    {
      resolvedSteamId64 = steamIdNumeric;
    }

    // public profile XML to retrieve avatar
    const profileXmlUrl = `https://steamcommunity.com/profiles/${encodeURIComponent(resolvedSteamId64)}/?xml=1`;
    const pr = await fetch(profileXmlUrl, { timeout: 8000 });
    if (!pr.ok) return res.status(500).json({ error: 'Failed to fetch Steam profile' });
    const text = await pr.text();
    const parsed = await parseStringPromise(text);
    const player = parsed?.profile || {};
    const avatar = player?.avatarFull?.[0] || player?.avatar?.[0] || null;
    const name = player?.steamID?.[0] || player?.steamID32?.[0] || null;

    return res.json({ steamid64: String(resolvedSteamId64), avatar, name });
  } catch (err)
  {
    console.error('resolve-steam error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 7272;
//! Start HTTP server on configured port
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
