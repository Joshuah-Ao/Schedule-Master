const { app, BrowserWindow, ipcMain, Notification } = require('electron')
const path = require('path')

let mainWindow

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.setMenuBarVisibility(false) // 隐藏传统菜单栏使其感觉更像现代APP
  mainWindow.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// 处理从渲染进程发来的系统通知请求
ipcMain.on('show-notification', (event, { title, body }) => {
  new Notification({
    title,
    body,
    // icon: 可以选加应用图标
  }).show()
})
