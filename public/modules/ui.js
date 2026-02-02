import { renderGroups } from './render.js';

//! Bind UI controls to the PrivilegesEditor instance
//! \param app - PrivilegesEditor instance
export function bindUi(app)
{
    if (!app) return;

    document.getElementById('loadBtn')?.addEventListener('click', () =>
    {
        const txt = document.getElementById('pasteXml').value.trim(); if (!txt) return alert('Paste some XML or upload a file');
        app.state.groups = app.parsePrivilegesXml(txt); renderGroups(app); app.validateAll().then(() => app.setStep(2));
    });

    document.getElementById('newBtn')?.addEventListener('click', (e) =>
    {
        // prevent the click from bubbling to the fileDrop parent (which opens the file input)
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        app.state.groups = [{ comment: 'Default', entries: [{ id: '', name: '', showColors: '1', avatar: null, valid: null }] }]; renderGroups(app); app.setStep(2);
    });

    document.getElementById('fileInput')?.addEventListener('change', async (ev) =>
    {
        const f = ev.target.files[0]; if (!f) return; const txt = await f.text(); document.getElementById('pasteXml').value = txt;
        try { app.state.groups = app.parsePrivilegesXml(txt); renderGroups(app); await app.validateAll(); app.setStep(2); } catch (e) { console.error('Failed parsing uploaded XML', e); alert('Failed to parse XML'); }
    });

    const pasteArea = document.getElementById('pasteXml');
    if (pasteArea)
    {
        pasteArea.addEventListener('dragover', (e) => { e.preventDefault(); pasteArea.classList.add('dragover'); });
        ['dragleave', 'dragend'].forEach(ev => pasteArea.addEventListener(ev, () => pasteArea.classList.remove('dragover')));
        pasteArea.addEventListener('drop', async (e) =>
        {
            e.preventDefault(); pasteArea.classList.remove('dragover'); const f = e.dataTransfer.files?.[0];
            if (f) { const txt = await f.text(); pasteArea.value = txt; try { app.state.groups = app.parsePrivilegesXml(txt); renderGroups(app); await app.validateAll(); app.setStep(2); } catch (err) { alert('Failed to parse dropped file'); } return; }
            const txt = e.dataTransfer.getData('text'); if (txt) { pasteArea.value = txt; try { app.state.groups = app.parsePrivilegesXml(txt); renderGroups(app); await app.validateAll(); app.setStep(2); } catch (err) { alert('Failed to parse dropped text'); } }
        });
    }

    document.getElementById('addGroupBtn')?.addEventListener('click', () => { app.addGroup(); });
    document.getElementById('exportBtn')?.addEventListener('click', () => { document.getElementById('exportXml').value = app.buildXml(); app.setStep(3); });
    document.getElementById('exportInEditBtn')?.addEventListener('click', () => { document.getElementById('exportXml').value = app.buildXml(); app.setStep(3); });
    document.getElementById('step2btn')?.addEventListener('click', () => app.setStep(2));
    document.getElementById('step1btn')?.addEventListener('click', () => app.setStep(1));
    document.getElementById('step3btn')?.addEventListener('click', () =>
    {
        const b = document.getElementById('step3btn'); if (b && b.disabled) return; const exportEl = document.getElementById('exportXml'); if (exportEl) exportEl.value = app.buildXml(); app.setStep(3);
    });

    const fileDrop = document.getElementById('fileDrop'); const fileInput = document.getElementById('fileInput');
    if (fileDrop)
    {
        fileDrop.addEventListener('click', () => fileInput.click());
        fileDrop.addEventListener('dragover', (e) => { e.preventDefault(); fileDrop.classList.add('dragover'); });
        ['dragleave', 'dragend'].forEach(ev => fileDrop.addEventListener(ev, () => fileDrop.classList.remove('dragover')));
        fileDrop.addEventListener('drop', async (e) =>
        {
            e.preventDefault(); fileDrop.classList.remove('dragover'); const f = e.dataTransfer.files?.[0]; if (!f) return; fileInput.files = e.dataTransfer.files; const txt = await f.text(); document.getElementById('pasteXml').value = txt; try { app.state.groups = app.parsePrivilegesXml(txt); renderGroups(app); await app.validateAll(); app.setStep(2); } catch (err) { alert('Failed to parse dropped file'); }
        });
    }

    document.getElementById('downloadBtn')?.addEventListener('click', () =>
    {
        const xml = app.buildXml(); const blob = new Blob([xml], { type: 'application/xml' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'privileges.xml'; a.click(); URL.revokeObjectURL(url);
    });

    document.getElementById('copyBtn')?.addEventListener('click', () => { const xml = app.buildXml(); navigator.clipboard.writeText(xml).then(() => alert('Copied')); });
}
