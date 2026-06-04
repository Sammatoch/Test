import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import { initStore, store } from './store.js'
import { generateContent, generateImage, applyTikTokIndexing } from './api.js'

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.NODE_ENV === 'development' || process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  initStore()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Settings
ipcMain.handle('settings:get', () => store.settings.get())
ipcMain.handle('settings:save', (_, data) => store.settings.save(data))

// Books
ipcMain.handle('books:get', () => store.books.get())
ipcMain.handle('books:save', (_, book) => store.books.save(book))
ipcMain.handle('books:delete', (_, id) => store.books.delete(id))

// Hooks
ipcMain.handle('hooks:get', () => store.hooks.get())
ipcMain.handle('hooks:save', (_, hook) => store.hooks.save(hook))
ipcMain.handle('hooks:delete', (_, id) => store.hooks.delete(id))
ipcMain.handle('hooks:toggleViral', (_, id) => store.hooks.toggleViral(id))

// Posts
ipcMain.handle('posts:get', () => store.posts.get())
ipcMain.handle('posts:save', (_, post) => store.posts.save(post))
ipcMain.handle('posts:delete', (_, id) => store.posts.delete(id))

// Images
ipcMain.handle('images:get', () => store.images.get())
ipcMain.handle('images:saveFromBase64', (_, base64, prompt) => store.images.saveFromBase64(base64, prompt))
ipcMain.handle('images:delete', (_, id) => store.images.delete(id))
ipcMain.handle('images:getFilePath', (_, id) => store.images.getFilePath(id))

// Generation
ipcMain.handle('generate:content', async (_, params) => {
  const settings = store.settings.get()
  return generateContent(params, settings)
})

ipcMain.handle('generate:image', async (_, prompt) => {
  const settings = store.settings.get()
  return generateImage(prompt, settings)
})

ipcMain.handle('generate:tiktokText', (_, text) => applyTikTokIndexing(text))

// Export
ipcMain.handle('export:post', async (_, imageBase64, filename) => {
  const desktopPath = path.join(app.getPath('desktop'), 'TikTok Exports')
  if (!fs.existsSync(desktopPath)) fs.mkdirSync(desktopPath, { recursive: true })
  const filePath = path.join(desktopPath, filename)
  const buf = Buffer.from(imageBase64, 'base64')
  fs.writeFileSync(filePath, buf)
  shell.openPath(desktopPath)
  return filePath
})
