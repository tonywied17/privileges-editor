//! Parse Privileges XML into internal groups structure
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
