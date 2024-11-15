import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import Store from 'electron-store';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import { Client as discordRpcClient } from "@xhayper/discord-rpc";
import { OPEN_NEW_ISSUE_URL, SPONSOR_URL } from '../constants/utils';
import { getAccessToken } from '../modules/anilist/anilistApi';
import { clientData } from '../modules/clientData';
import isAppImage from '../modules/packaging/isAppImage';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { OS } from '../modules/os';
import { getRandomDiscordPhrase } from '../modules/utils';

const STORE = new Store();

app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');

const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${clientData.clientId}&redirect_uri=${isAppImage || !app.isPackaged ? 'https://anilist.co/api/v2/oauth/pin' : clientData.redirectUri}&response_type=code`;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.autoRunAppAfterInstall = true;

let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const RPCEnabled = STORE.get('rich_presence');

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1300,
    height: 850,
    minWidth: 1280,
    minHeight: 720,
    autoHideMenuBar: true,
    frame: OS.isMac,
    titleBarStyle: 'hidden',
    icon: getAssetPath('icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: false,
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));
  // mainWindow.setBackgroundColor('#0c0b0b');

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.maximize();

      if (STORE.get('logged') !== true) STORE.set('logged', false);

      autoUpdater.checkForUpdates();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });
};

ipcMain.handle('get-is-packaged', async () => {
  return app.isPackaged;
});

ipcMain.on('open-login-url', () => {
  require('electron').shell.openExternal(authUrl);
});

ipcMain.on('logout', () => {
  STORE.set('logged', false);
  STORE.delete('access_token');
  console.log('Logged Out! Relaunching app...');

  if (mainWindow) mainWindow.reload();
});

ipcMain.on('handle-login', async (event, code) => {
  await handleLogin(code);

  if (mainWindow) {
    mainWindow.reload();
  }
});

ipcMain.on('open-sponsor-url', () => {
  require('electron').shell.openExternal(SPONSOR_URL);
});

ipcMain.on('open-issues-url', () => {
  require('electron').shell.openExternal(OPEN_NEW_ISSUE_URL);
});

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('akuse', process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient('akuse');
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', async (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }

    try {
      let code = commandLine
        .find((el) => el.includes('?code='))
        ?.split('?code=')[1];

      await handleLogin(code);

      if (mainWindow) {
        mainWindow.reload();
      }
    } catch (error: any) {
      console.log('something went wrong second-instance', error.message);
    }
  });
}

// Handle the protocol. In this case, we choose to show an Error Box.
app.on('open-url', async (event, url) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }

  try {
    let code = url;

    if (code.includes('?code=')) {
      code = code.split('?code=')[1];

      await handleLogin(code);

      if (mainWindow) {
        mainWindow.reload();
      }
    } else {
      throw new Error('Login code not found in deep link url');
    }
  } catch (error: any) {
    // the commandLine is array of strings in which last element is deep link url
    dialog.showErrorBox(
      'Login failed',
      'An error occurred while trying to log in.',
    );
    console.log('login failed error:', error.message);
  }
});

async function handleLogin(code: any) {
  try {
    const token = await getAccessToken(code);
    STORE.set('access_token', token);
    STORE.set('logged', true);
  } catch (error: any) {
    console.log('login failed with error: ' + error.message);
  }
}

// Handle window controls via IPC
ipcMain.on('shell:open', () => {
  const pageDirectory = __dirname.replace('app.asar', 'app.asar.unpacked')
  const pagePath = path.join('file://', pageDirectory, 'index.html');
  shell.openExternal(pagePath);
});

// controls handlers

ipcMain.on('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.on('toggle-maximize-window', () => {
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize();
});

ipcMain.on('close-window', () => {
  mainWindow?.close();
});

/* AUTO UPDATING */

autoUpdater.on('update-available', (info) => {
  if (!mainWindow) return;

  mainWindow.webContents.send('console-log', info);

  mainWindow.webContents.send('auto-update');
  mainWindow.webContents.send('update-available-info', info);
});

autoUpdater.on('update-downloaded', (info) => {
  autoUpdater.quitAndInstall();
});

autoUpdater.on('download-progress', (info) => {
  if (!mainWindow) return;
  mainWindow.webContents.send('downloading', info);
});

autoUpdater.on('error', (info) => {
  if (!mainWindow) return;
  mainWindow.webContents.send('console-log', info);
});

ipcMain.on('download-update', async () => {
  let pth = await autoUpdater.downloadUpdate();
  if (!mainWindow) return;
  mainWindow.webContents.send('console-log', pth);
});

ipcMain.on('update-section', (event, ...args) => {
  if(!mainWindow) return;
  mainWindow.webContents.send('update-section', ...args);
});

/* DISCORD RPC */

const RPC = new discordRpcClient({
  transport: 'ipc',
  clientId: '1256111110151475241'
});

async function setActivity(details?: string, state?: string, startTimestamp?: number, largeImageKey?: string, largeImageText?: string, smallImageKey?: string, instance?: boolean, buttons?: any[]) {
  if (!RPC || !mainWindow) {
    return;
  }


  RPC.user.setActivity({
    type: 3, // "Watching" type
    details: details || '🌸 Watch anime without ads.',
    state: state || getRandomDiscordPhrase(),
    startTimestamp: startTimestamp || Date.now(),
    largeImageKey: largeImageKey || 'icon',
    largeImageText: largeImageText || 'akuse',
    smallImageKey: smallImageKey,
    instance: instance || false,
    buttons: buttons || [
      {
        label: 'Download akuse',
        url: 'https://github.com/akuse-app/akuse/releases/latest',
      },
    ],
  });
}

RPC.on('ready', () => {
  setActivity();
});
RPC.login().catch(console.error);

ipcMain.on('update-presence', (event, data) => {
  setActivity(data.details, data.state, data.startTimestamp, data.largeImageKey, data.largeImageText, data.smallImageKey, data.instance, data.buttons);
})
