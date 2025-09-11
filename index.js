const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Import classes from data.js
const { Detail, Entry, Scene, Chapter, Story } = require('./data.js');

let mainWindow;

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    });

    // Load the index.html of the app.
    mainWindow.loadFile('index.html');

    // Open the DevTools.
    //mainWindow.webContents.openDevTools();
}

// IPC handlers for file operations
ipcMain.handle('save-file', async (event, filePath, content) => {
    try {
        fs.writeFileSync(filePath, content, 'utf8');
        return { success: true, filePath: filePath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('save-file-as', async (event, content, defaultName) => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Save Project As',
            defaultPath: defaultName || 'untitled.json',
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (!result.canceled && result.filePath) {
            fs.writeFileSync(result.filePath, content, 'utf8');
            return { success: true, filePath: result.filePath };
        } else {
            return { success: false, error: 'Save cancelled' };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-file', async (event) => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Load Project',
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile']
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            const content = fs.readFileSync(filePath, 'utf8');
            return { success: true, content: content, filePath: filePath };
        } else {
            return { success: false, error: 'Load cancelled' };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('check-file-exists', async (event, filePath) => {
    try {
        return fs.existsSync(filePath);
    } catch (error) {
        return false;
    }
});

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
