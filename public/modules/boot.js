/*
 * File: c:\Users\tonyw\Desktop\PRIVS\public\modules\boot.js
 * Project: c:\Users\tonyw\Desktop\PRIVS
 * Created Date: Saturday January 31st 2026
 * Author: Tony Wiedman
 * -----
 * Last Modified: Sat January 31st 2026 9:13:11 
 * Modified By: Tony Wiedman
 * -----
 * Copyright (c) 2026 MolexWorks
 */

//!
//! Bootstraps the application by instantiating the controller
//! and wiring UI, FTP, and render modules.
//!
import PrivilegesEditor from '../app.js';
import { bindUi } from './ui.js';
import { bind as bindFtp } from './ftp.js';
import { renderGroups } from './render.js';

try
{
    const app = new PrivilegesEditor();
    app.init();
    if (bindUi) bindUi(app);
    if (bindFtp) bindFtp(app);
    if (renderGroups) renderGroups(app);
    window.privApp = app;
} catch (e)
{
    console.error('Boot error initializing PrivilegesEditor:', e);
}
