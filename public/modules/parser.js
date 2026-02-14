//! parsePrivilegesXml - parse privileges XML into groups array
//! \param xmlText - XML string
export function parsePrivilegesXml(xmlText)
{
    const cleanedXml = stripInlineComments(xmlText || '');
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanedXml, 'application/xml');
    const steamIDsNode = doc.querySelector('SteamIDs');
    if (!steamIDsNode) return [{ comment: 'All', entries: [] }];
    const groups = [];
    let current = { comment: 'Default', entries: [] };
    for (const node of steamIDsNode.childNodes)
    {
        if (node.nodeType === Node.COMMENT_NODE)
        {
            if (current.entries.length || current.comment !== 'Default') groups.push(current);
            current = { comment: node.data.trim(), entries: [] };
        }
        else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SteamID')
        {
            current.entries.push({
                id: (node.getAttribute('id') || '').trim(),
                name: node.getAttribute('name') || '',
                showColors: node.getAttribute('showColors') || '0',
                avatar: null,
                valid: null
            });
        }
    }
    groups.push(current);
    return groups;
}

//! Strip inline comments from XML text while preserving full-line comments
//! \param xmlText - XML string
//! \return XML string with inline comments removed
//! stripInlineComments - remove inline XML comments but preserve full-line comments
//! \param xmlText - XML string
function stripInlineComments(xmlText)
{
    const lines = xmlText.split(/\r?\n/);
    const commentPattern = /<!--([\s\S]*?)-->/g;
    return lines.map((line) =>
    {
        if (!commentPattern.test(line)) return line;
        commentPattern.lastIndex = 0;
        const withoutComments = line.replace(commentPattern, '');
        if (withoutComments.trim().length > 0) return withoutComments;
        return line;
    }).join('\n');
}

//! parseCfg - parse dedicated.cfg text into entries/groups
//! \param text - cfg file contents
export function parseCfg(text)
{
    const lines = (text || '').split(/\r?\n/);
    const entries = [];
    let i = 0;
    while (i < lines.length)
    {
        const raw = lines[i];
        const trimmed = raw.trim();
        if (!trimmed)
        {
            i++; continue;
        }

        const grpMatch = trimmed.match(/^(?:\/\/|#)\s*(.+?)\s*$/);
        if (grpMatch)
        {
            const name = grpMatch[1];
            const grpEntries = [];
            i++;
            while (i < lines.length)
            {
                const l = lines[i].trim();
                if (/^(?:\/\/|#)\s*END\b/i.test(l)) { i++; break; }
                if (!l) { i++; continue; }
                if (l.startsWith('//') || l.startsWith('#')) { i++; continue; }
                const idx = l.indexOf('=');
                if (idx === -1) { i++; continue; }
                const key = l.substring(0, idx).trim();
                const value = l.substring(idx + 1).trim();
                grpEntries.push({ key, value });
                i++;
            }
            if (grpEntries.length)
            {
                entries.push({ type: 'group', name: name.trim(), entries: grpEntries });
            }
            continue;
        }

        if (trimmed.startsWith('#') || trimmed.startsWith('//')) { i++; continue; }
        const idx = trimmed.indexOf('=');
        if (idx === -1) { i++; continue; }
        const key = trimmed.substring(0, idx).trim();
        const value = trimmed.substring(idx + 1).trim();
        entries.push({ type: 'entry', key, value });
        i++;
    }
    return entries;
}

//! buildCfg - build dedicated.cfg text from entries/groups
//! \param items - array of cfg entries/groups
export function buildCfg(items)
{
    if (!Array.isArray(items)) return '';
    const lines = [];
    for (const it of items)
    {
        if (it.type === 'group')
        {
            lines.push(`# ${it.name}`);
            for (const e of (it.entries || [])) lines.push(`${e.key}=${e.value}`);
            lines.push(`# END ${it.name}`);
        }
        else if (it.type === 'entry')
        {
            lines.push(`${it.key}=${it.value}`);
        }
    }
    return lines.join('\n');
}

//! detectFileType - heuristic detect of 'cfg' or 'privileges'
//! \param text - file contents
export function detectFileType(text)
{
    const t = (text || '').trim();
    if (!t) return 'unknown';
    if (/\<\?xml/i.test(t)) return 'privileges';
    if (/\<SteamIDs\b/i.test(t)) return 'privileges';
    if (/\<SteamID\b/i.test(t)) return 'privileges';
    // Heuristics for cfg: lines with key=value
    const lines = t.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let eq = 0, xmlLike = 0;
    for (const l of lines.slice(0, 40))
    {
        if (/=/.test(l)) eq++;
        if (/^\</.test(l)) xmlLike++;
    }
    if (eq >= 1 && xmlLike === 0) return 'cfg';
    if (xmlLike > 0 && eq === 0) return 'privileges';
    return 'unknown';
}
