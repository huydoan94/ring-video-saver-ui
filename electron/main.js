const electron = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const ipcHelpers = require('./ipcHelpers');

const { app, BrowserWindow, Menu } = electron;

let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 992,
    height: 680,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
    },
  });

  if (process.platform === 'darwin') {
    const template = [
      {
        label: app.getName(),
        submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'quit' }],
      },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  } else {
    Menu.setApplicationMenu(null);
  }

  mainWindow.loadURL(isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`);
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.on('closed', () => { mainWindow = null; });

  ipcHelpers();
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
