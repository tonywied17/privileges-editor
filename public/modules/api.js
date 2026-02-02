
//! Validate a single SteamID via server
//! \param id - Steam ID string
export async function validateSingle(id)
{
    try
    {
        const r = await fetch('/validate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ steamids: [id] }) });
        if (!r.ok) return null;
        const j = await r.json();
        return (j.results || [])[0] || null;
    } catch (e) { return null; }
}

//! Validate an array of SteamIDs via server
//! \param ids - array of Steam ID strings
export async function validateBatch(ids)
{
    try
    {
        const r = await fetch('/validate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ steamids: ids }) });
        if (!r.ok) return null;
        const j = await r.json();
        return j.results || [];
    } catch (e) { return null; }
}

//! Resolve a Steam profile URL to a SteamID via server
//! \param profileUrl - Steam profile URL
export async function resolveSteamProfile(profileUrl)
{
    try
    {
        const q = '/resolve-steam?profileUrl=' + encodeURIComponent(profileUrl);
        const r = await fetch(q, { method: 'GET' });
        if (!r.ok) return null;
        const j = await r.json();
        return j;
    } catch (e) { return null; }
}

//! Upload XML to FTP via server endpoint
//! \param { host, port, user, pass, xml } - connection info and XML payload
export async function doFtpUpload({ host, port, user, pass, xml })
{
    const r = await fetch('/upload-ftp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ host, port, username: user, password: pass, xml, remotePath: '/Assets/privileges.xml' }) });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, json: j };
}
