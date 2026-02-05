/*
 * File: c:\Users\tonyw\Desktop\PRIVS\public\app.js
 * Project: c:\Users\tonyw\Desktop\PRIVS\privileges-editor
 * Created Date: Saturday January 31st 2026
 * Author: Tony Wiedman
 * -----
 * Last Modified: Thu February 5th 2026 5:20:06 
 * Modified By: Tony Wiedman
 * -----
 * Copyright (c) 2026 MolexWorks
 */

import { validateBatch, validateSingle as apiValidateSingle, resolveSteamProfile as apiResolveSteamProfile, doFtpUpload as apiDoFtpUpload } from './modules/api.js';
import { parsePrivilegesXml as parserParse } from './modules/parser.js';
import { buildXml as xmlBuild } from './modules/xmlbuilder.js';
import { renderGroups } from './modules/render.js';
import { showToast, showProfileModal } from './modules/helpers.js';
import { updateFtpDisplay } from './modules/ftp.js';

//! Toggle visible step panels and step button states
//! \param n - step number (1..3)
export default class PrivilegesEditor
{
  constructor()
  {
    this.state = { groups: [], debounce: {}, ftpCredentials: null };
    this.observer = new MutationObserver(() => { });
  }

  //! Set currently visible step in UI
  //! \param n - step number (1..3)
  setStep(n)
  {
    const steps = [1, 2, 3];
    steps.forEach(s => document.getElementById('step' + s)?.classList.toggle('d-none', n !== s));
    steps.forEach(s => document.getElementById('step' + s + 'btn')?.classList.toggle('active', n === s));
    const step2btn = document.getElementById('step2btn');
    const step3btn = document.getElementById('step3btn');
    if (step2btn) step2btn.disabled = n < 2;
    if (step3btn) step3btn.disabled = n < 2;

    // update ftp display when navigating to export page
    if (n === 3)
    {
      updateFtpDisplay(this);
    }
  }

  //! Escape string for HTML insertion
  //! \param s - input string
  escapeHtml(s)
  {
    return (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  //! Escape attribute value for XML output
  //! \param s - attribute value
  escapeXmlAttr(s) { return (s || '').replace(/"/g, '&quot;'); }

  //! Parse the privileges XML into internal groups structure
  //! \param xmlText - XML source string
  parsePrivilegesXml(xmlText)
  {
    return parserParse(xmlText || '');
  }

  //! Update id typed by user and perform resolution/validation when appropriate
  //! \param g - group index
  //! \param i - entry index
  //! \param val - new id value
  async updateId(g, i, val)
  {
    const v = (val || '').trim();
    const entry = this.state.groups[g]?.entries[i];
    if (!entry) return;
    entry.id = v;
    const key = `${g}-${i}`;
    const looksLikeUrl = /steamcommunity\.com|steam:\/\//i.test(v) || /\/id\/|\/profiles\//i.test(v);
    if (looksLikeUrl)
    {
      if (this.state.debounce[key]) { clearTimeout(this.state.debounce[key]); delete this.state.debounce[key]; }
      entry.loading = true; entry.valid = null; renderGroups(this);
      try
      {
        const resolved = await apiResolveSteamProfile(v);
        if (resolved && resolved.steamid64)
        {
          entry.id = resolved.steamid64;
          entry.avatar = resolved.avatar || null;
          if (resolved.name && !entry.name) entry.name = resolved.name;
          const result = await apiValidateSingle(resolved.steamid64);
          entry.valid = result ? result.valid : false;
          entry.avatar = result && result.avatar ? result.avatar : entry.avatar;
          if (result && result.name && !entry.name) entry.name = result.name;
        } else { entry.valid = false; entry.avatar = null; }
      } catch (e) { entry.valid = false; entry.avatar = null; }
      entry.loading = false; renderGroups(this);
      return;
    }

    if (!/^\d{17}$/.test(v))
    {
      if (this.state.debounce[key]) { clearTimeout(this.state.debounce[key]); delete this.state.debounce[key]; }
      if (entry.loading || entry.valid !== null || entry.avatar !== null)
      {
        entry.loading = false; entry.valid = null; entry.avatar = null; renderGroups(this);
      }
      return;
    }

    if (this.state.debounce[key]) clearTimeout(this.state.debounce[key]);
    this.state.debounce[key] = setTimeout(async () =>
    {
      const e = this.state.groups[g]?.entries[i]; if (!e) return;
      e.loading = true; renderGroups(this);
      const result = await apiValidateSingle(e.id);
      e.loading = false;
      if (result) { e.valid = result.valid; e.avatar = result.avatar || null; if (result.name && !e.name) e.name = result.name; }
      else { e.valid = false; e.avatar = null; }
      renderGroups(this); delete this.state.debounce[key];
    }, 700);
  }

  //! Update player name for an entry
  //! \param g - group index
  //! \param i - entry index
  //! \param val - new name
  updateName(g, i, val) { if (this.state.groups[g]) this.state.groups[g].entries[i].name = val; }

  //! Toggle showColors flag
  //! \param g - group index
  //! \param i - entry index
  //! \param checked - boolean
  updateShow(g, i, checked) { if (this.state.groups[g]) this.state.groups[g].entries[i].showColors = checked ? '1' : '0'; }

  //! Rename a group
  //! \param g - group index
  //! \param val - new name
  updateGroupName(g, val) { if (this.state.groups[g]) this.state.groups[g].comment = val; }

  //! Add a blank admin entry to the given group
  //! \param gIdx - group index
  addLine(gIdx) { this.state.groups[gIdx].entries.push({ id: '', name: '', showColors: '1', avatar: null, valid: null }); renderGroups(this); }

  //! Remove an entry from a group
  //! \param g - group index
  //! \param i - entry index
  removeLine(g, i) { this.state.groups[g].entries.splice(i, 1); renderGroups(this); }

  //! Remove an entire group
  //! \param i - group index
  removeGroup(i) { this.state.groups.splice(i, 1); renderGroups(this); }

  //! Add a new group
  //! \no params
  addGroup() { this.state.groups.push({ comment: 'New group', entries: [] }); renderGroups(this); }

  //! Validate all 17-digit steamids in the state in a single batch
  //! \no params
  async validateAll()
  {
    const ids = [];
    this.state.groups.forEach(g => g.entries.forEach(e => { if (e.id && /^\d{17}$/.test(e.id)) ids.push(e.id); }));
    if (!ids.length) return;
    this.state.groups.forEach(g => g.entries.forEach(e => { if (e.id && /^\d{17}$/.test(e.id)) e.loading = true; }));
    renderGroups(this);
    const results = await validateBatch(ids);
    const map = {};
    (results || []).forEach(it => map[it.id] = it);
    this.state.groups.forEach(g => g.entries.forEach(e =>
    {
      if (e.id && /^\d{17}$/.test(e.id))
      {
        const m = map[e.id];
        if (m) { e.valid = m.valid; e.avatar = m.avatar || null; if (m.name && !e.name) e.name = m.name; }
        else { e.valid = false; e.avatar = null; }
        e.loading = false;
      }
    }));
    renderGroups(this);
  }

  //! Validate single steamid via backend
  //! \param id - 17-digit steamid
  async validateSingle(id)
  {
    return await apiValidateSingle(id);
  }

  //! Resolve a Steam profile URL or vanity to steamid64 via backend
  //! \param profileUrl - URL or vanity string
  async resolveSteamProfile(profileUrl)
  {
    return await apiResolveSteamProfile(profileUrl);
  }

  //! Build XML from current state
  //! \returns XML string
  buildXml()
  {
    return xmlBuild(this.state);
  }

  //! Do FTP upload (POST to backend)
  //! \param options - { host, port, user, pass, xml }
  async doFtpUpload({ host, port, user, pass, xml })
  {
    const resDiv = document.getElementById('ftpResult'); if (resDiv) resDiv.innerText = 'Uploading...';
    try
    {
      const r = await apiDoFtpUpload({ host, port, user, pass, xml });
      const j = r.json || {};
      if (r.ok) { if (resDiv) resDiv.innerText = 'Uploaded: ' + (j.uploadedTo || 'ok'); showToast('Upload successful', null, { type: 'success' }); }
      else { if (resDiv) resDiv.innerText = 'Error: ' + (j.error || JSON.stringify(j)); showToast('Upload error: ' + (j.error || JSON.stringify(j))); }
    } catch (e) { if (resDiv) resDiv.innerText = 'Error: ' + e.message; showToast('Upload error: ' + e.message); }
  }

  //! Show toast notification
  //! \param message - message text
  //! \param actions - optional actions array
  //! \param opts - optional options
  showToast(message, actions, opts)
  {
    return showToast(message, actions, opts);
  }

  //! Show modal prompting to open steam profile
  //! \param steamid - steamid string
  showProfileModal(steamid)
  {
    return showProfileModal(steamid);
  }

  //! Wire DOM event listeners and expose any needed globals
  //! \no params
  init()
  {
    window.privApp = this;
  }
}