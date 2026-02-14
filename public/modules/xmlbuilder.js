//! Escape double quotes for XML attribute values
//! \param s - input string
function escapeXmlAttr(s) { return (s || '').replace(/"/g, '&quot;'); }

export function buildXml(state)

//! buildXml - construct privileges XML from state
//! \param state - application state containing groups
{
    let out = '<Privileges>\n    <Privilege Name="Administrator">\n        <SteamIDs>\n';
    (state.groups || []).forEach(g =>
    {
        if (g.comment) out += `            <!-- ${g.comment} -->\n`;
        (g.entries || []).forEach(e =>
        {
            const id = escapeXmlAttr(e.id);
            const name = escapeXmlAttr(e.name);
            const show = escapeXmlAttr(e.showColors || '1');
            out += `\t\t\t<SteamID id="${id}" showColors="${show}" name="${name}"/>\n`;
        });
    });
    out += '        </SteamIDs>\n        <Commands bHasPrevious="true">\n';
    const defaultCommands = [
        'Lobby.Kick.RichId', 'Chat.SystemMessage', 'Online.Server.Password', 'sv_servername', 'Ban.User.SteamID', 'Admin.ShowAdminStatus', 'weather.stormfactor.setnewtarget', 'e_timeofday', 'game.skirmish.setnextarea', 'game.skirmish.forceendround', 'g_teamSizeMaxUserPercentageDifference'
    ];
    defaultCommands.forEach(c => { out += `            <Command Name="${c}"/>\n`; });
    out += '        </Commands>\n    </Privilege>\n</Privileges>\n';
    return out;
}
