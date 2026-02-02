import { showToast } from './helpers.js';
import { doFtpUpload, testFtpConnection } from './api.js';
import { renderGroups } from './render.js';

//! Bind FTP modal and upload/download controls
//! \param app - PrivilegesEditor instance
export function bind(app)
{
    const loadFtpBtn = document.getElementById('loadFtpBtn');
    loadFtpBtn?.addEventListener('click', () =>
    {
        const modal = document.getElementById('ftpConnectModal'); if (!modal) return showToast ? showToast('FTP modal not found') : null;
        document.getElementById('ftpModalHost').value = ''; document.getElementById('ftpModalPort').value = ''; document.getElementById('ftpModalRemotePath').value = '/Assets/privileges.xml';
        document.getElementById('ftpModalRemotePath').readOnly = true; document.getElementById('ftpModalUser').value = ''; document.getElementById('ftpModalPass').value = ''; document.getElementById('ftpModalStatus').innerText = '';
        modal.style.display = 'block';
    });

    const ftpModal = document.getElementById('ftpConnectModal');
    if (ftpModal)
    {
        document.getElementById('ftpCloseBtn')?.addEventListener('click', () => ftpModal.style.display = 'none');
        document.getElementById('ftpModalCancel')?.addEventListener('click', () => ftpModal.style.display = 'none');
        
        // Test Connection button handler
        document.getElementById('ftpModalTest')?.addEventListener('click', async () =>
        {
            const status = document.getElementById('ftpModalStatus');
            const host = document.getElementById('ftpModalHost').value.trim();
            const portStr = document.getElementById('ftpModalPort').value.trim();
            const port = portStr ? (parseInt(portStr, 10) || undefined) : undefined;
            const user = document.getElementById('ftpModalUser').value.trim();
            const pass = document.getElementById('ftpModalPass').value;
            
            if (!host || !user) { 
                if (status) status.innerText = 'Host and username required'; 
                return; 
            }
            
            try {
                if (status) status.innerText = 'Testing connection...';
                document.getElementById('ftpModalTest').disabled = true;
                
                const result = await testFtpConnection({ host, port, user, pass });
                
                if (result.ok && result.json.connected) {
                    const state = result.json.state;
                    if (status) status.innerHTML = `
                        <span style="color: #28a745;">✅ Connection successful!</span><br>
                        <small>${state.user}@${state.host}:${state.port}</small>
                    `;
                    showToast('FTP connection test successful!', null, { type: 'success' });
                } else {
                    const errorMsg = result.json.error || 'Connection failed';
                    if (status) status.innerHTML = `<span style="color: #dc3545;">❌ ${errorMsg}</span>`;
                    showToast(`FTP test failed: ${errorMsg}`, null, { type: 'error' });
                }
            } catch (e) {
                if (status) status.innerHTML = `<span style="color: #dc3545;">❌ Test error: ${e.message}</span>`;
                showToast(`FTP test error: ${e.message}`, null, { type: 'error' });
            } finally {
                document.getElementById('ftpModalTest').disabled = false;
            }
        });
        
        document.getElementById('ftpModalConnect')?.addEventListener('click', async () =>
        {
            const remoteInput = document.getElementById('ftpModalRemotePath'); if (remoteInput) remoteInput.readOnly = true;
            const status = document.getElementById('ftpModalStatus');
            const host = document.getElementById('ftpModalHost').value.trim();
            const portStr = document.getElementById('ftpModalPort').value.trim();
            const port = portStr ? (parseInt(portStr, 10) || undefined) : undefined;
            const user = document.getElementById('ftpModalUser').value.trim();
            const pass = document.getElementById('ftpModalPass').value;
            const remotePath = document.getElementById('ftpModalRemotePath').value.trim() || '/Assets/privileges.xml';
            if (!host || !user) { if (status) status.innerText = 'Host and username required'; return; }
            try
            {
                if (status) status.innerText = 'Connecting...'; document.getElementById('ftpModalConnect').disabled = true;
                const body = { host, username: user, password: pass, remotePath }; if (port) body.port = port;
                const res = await fetch('/download-ftp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
                if (!res.ok) { const j = await res.json().catch(() => ({ error: res.statusText })); if (status) status.innerText = 'Download failed: ' + (j.error || res.statusText); document.getElementById('ftpModalConnect').disabled = false; return; }
                const j = await res.json(); if (!j.ok) { if (status) status.innerText = 'Download failed'; document.getElementById('ftpModalConnect').disabled = false; return; }
                const txt = j.xml || ''; document.getElementById('pasteXml').value = txt;
                const hostField = document.getElementById('ftpHost'); if (hostField) hostField.value = host;
                const portField = document.getElementById('ftpPort'); if (portField) portField.value = port ? String(port) : '';
                const userField = document.getElementById('ftpUser'); if (userField) userField.value = user;
                const passField = document.getElementById('ftpPass'); if (passField) passField.value = pass;
                app.state.groups = app.parsePrivilegesXml(txt); renderGroups(app); await app.validateAll(); if (remoteInput) remoteInput.readOnly = true; ftpModal.style.display = 'none'; app.setStep(2); showToast(j.message || 'FTP download successful', null, { type: 'success' });
            } catch (e) { if (status) status.innerText = 'FTP error: ' + e.message; console.error(e); }
            document.getElementById('ftpModalConnect').disabled = false;
            if (status && status.innerText && (status.innerText.toLowerCase().includes('failed') || status.innerText.toLowerCase().includes('error'))) { if (remoteInput) remoteInput.readOnly = false; }
        });
    }

    document.getElementById('ftpUploadBtn')?.addEventListener('click', async () =>
    {
        const host = document.getElementById('ftpHost').value.trim(); const port = parseInt(document.getElementById('ftpPort').value.trim() || '21', 10);
        const user = document.getElementById('ftpUser').value.trim(); const pass = document.getElementById('ftpPass').value; const xml = app.buildXml(); const resDiv = document.getElementById('ftpResult'); if (resDiv) resDiv.innerText = '';
        try
        {
            const chk = await fetch('/check-ftp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ host, port, username: user, password: pass, remotePath: '/Assets/privileges.xml' }) });
            if (!chk.ok) { const err = await chk.json(); showToast('FTP check failed: ' + (err.error || chk.statusText)); return; }
            const cj = await chk.json();
            if (cj.exists)
            {
                const filePath = '/Assets/privileges.xml';
                const sizeInfo = cj.size ? ` (${(cj.size / 1024).toFixed(1)} KB)` : '';
                showToast(`File exists: ${filePath}${sizeInfo} — Overwrite?`, [{ label: 'Overwrite', style: 'btn-danger', onClick: async () => { const r = await doFtpUpload({ host, port, user, pass, xml }); if (r.ok) showToast(r.json?.message || `Uploaded to ${filePath}`, null, { type: 'success' }); else showToast(r.json?.error || 'Upload error', null, { type: 'error' }); } }, { label: 'Cancel', style: 'btn-outline-secondary', onClick: () => { } }]);
            } else { const r = await doFtpUpload({ host, port, user, pass, xml }); if (r.ok) showToast(r.json?.message || 'Upload successful', null, { type: 'success' }); else showToast(r.json?.error || 'Upload error', null, { type: 'error' }); }
        } catch (e) { showToast('FTP check error: ' + e.message); }
    });
}
