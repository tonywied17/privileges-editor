import { showProfileModal } from './helpers.js';

//! Render all groups and their member lines into the DOM
//! \param app - PrivilegesEditor instance (provides `state` and update methods)
export function renderGroups(app)
{
    const H = { showProfileModal };
    const container = document.getElementById('groups');
    if (!container) return;
    let focused = null;
    const active = document.activeElement;
    if (active && active.tagName === 'INPUT')
    {
        const g = active.dataset?.g; const i = active.dataset?.i;
        if (typeof g !== 'undefined' && typeof i !== 'undefined')
        {
            try { focused = { g: String(g), i: String(i), start: active.selectionStart, end: active.selectionEnd, cls: active.className }; } catch (e) { focused = { g: String(g), i: String(i), cls: active.className }; }
        }
    }
    container.innerHTML = '';
    (app.state.groups || []).forEach((g, gi) =>
    {
        const card = document.createElement('div'); card.className = 'group-card';

        const header = document.createElement('div');
        header.className = 'd-flex justify-content-between align-items-center mb-2';
        const nameWrap = document.createElement('div');
        const nameInput = document.createElement('input');
        nameInput.className = 'group-name-input';
        nameInput.value = (g.comment || '');
        nameInput.addEventListener('input', (ev) => { app.updateGroupName(gi, ev.target.value); });
        nameWrap.appendChild(nameInput);

        const actions = document.createElement('div');
        actions.className = 'group-actions';
        const addBtn = document.createElement('button'); addBtn.className = 'btn btn-sm btn-outline-success me-1'; addBtn.textContent = '+ Admin';
        addBtn.addEventListener('click', () => app.addLine(gi));
        const removeGroupBtn = document.createElement('button'); removeGroupBtn.className = 'btn btn-sm btn-outline-danger'; removeGroupBtn.textContent = '- Group';
        removeGroupBtn.addEventListener('click', () => app.removeGroup(gi));
        actions.appendChild(addBtn); actions.appendChild(removeGroupBtn);
        header.appendChild(nameWrap); header.appendChild(actions);

        card.appendChild(header);
        const list = document.createElement('div');

        (g.entries || []).forEach((e, ei) =>
        {
            const line = document.createElement('div');
            line.className = 'steam-line ' + (e.valid === true ? 'valid' : (e.valid === false ? 'invalid' : ''));

            const avatarWrap = document.createElement('div');
            avatarWrap.style.display = 'inline-block'; avatarWrap.style.marginRight = '6px';
            if (e.loading) avatarWrap.innerHTML = '<span class="spinner"></span>';
            else
            {
                const a = document.createElement('a'); a.href = '#'; a.className = 'avatar-link'; a.dataset.steamid = e.id || '';
                const img = document.createElement('img'); img.src = e.avatar || ''; img.className = 'avatar-thumb'; img.onerror = function () { this.style.visibility = 'hidden'; };
                a.appendChild(img);
                a.addEventListener('click', (ev) => { ev.preventDefault(); const id = a.dataset.steamid || ''; if (id) (H.showProfileModal || (() => { }))(id); });
                avatarWrap.appendChild(a);
            }

            const idInput = document.createElement('input'); idInput.className = 'form-control form-control-sm steam-id-input'; idInput.placeholder = 'Steam ID or Steam Profile URL'; idInput.value = e.id || '';
            idInput.dataset.g = String(gi); idInput.dataset.i = String(ei);
            idInput.addEventListener('input', (ev) => app.updateId(gi, ei, ev.target.value));

            const nameInputEl = document.createElement('input'); nameInputEl.className = 'form-control form-control-sm'; nameInputEl.placeholder = 'Player name'; nameInputEl.value = e.name || '';
            nameInputEl.dataset.g = String(gi); nameInputEl.dataset.i = String(ei);
            nameInputEl.addEventListener('change', (ev) => app.updateName(gi, ei, ev.target.value));

            const showLabel = document.createElement('label'); showLabel.className = 'form-check'; showLabel.style.marginLeft = '8px'; showLabel.style.marginRight = '8px'; showLabel.style.display = 'flex'; showLabel.style.alignItems = 'center'; showLabel.style.gap = '6px';
            const showChk = document.createElement('input'); showChk.type = 'checkbox'; showChk.className = 'form-check-input showcolors-input'; showChk.checked = e.showColors === '1';
            showChk.addEventListener('change', (ev) => app.updateShow(gi, ei, ev.target.checked));
            showLabel.appendChild(showChk); const span = document.createElement('span'); span.textContent = 'Show Colors'; showLabel.appendChild(span);

            const remBtn = document.createElement('button'); remBtn.className = 'btn btn-sm btn-outline-danger'; remBtn.textContent = '✕'; remBtn.addEventListener('click', () => app.removeLine(gi, ei));

            line.appendChild(avatarWrap); line.appendChild(idInput); line.appendChild(nameInputEl); line.appendChild(showLabel); line.appendChild(remBtn);
            list.appendChild(line);
        });

        card.appendChild(list);
        container.appendChild(card);
    });

    if (focused)
    {
        requestAnimationFrame(() => {
            try
            {
                const selector = `input.${focused.cls.split(' ').join('.')}[data-g="${focused.g}"][data-i="${focused.i}"]`;
                const el = container.querySelector(selector);
                if (el)
                {
                    el.focus();
                    if (typeof focused.start === 'number' && typeof el.setSelectionRange === 'function') el.setSelectionRange(focused.start, focused.end);
                }
            } catch (e) { }
        });
    }
}