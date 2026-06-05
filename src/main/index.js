import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { initStore, store } from './store.js'
import { generateContent, generateImage, applyTikTokIndexing, scrapeViralTikToks, analyzeViralContent, analyzeTranscriptForSlides } from './api.js'

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
ipcMain.handle('images:readAsBase64', (_, id) => {
  const fp = store.images.getFilePath(id)
  if (!fp || !fs.existsSync(fp)) return null
  return fs.readFileSync(fp).toString('base64')
})

// Generation
ipcMain.handle('generate:content', async (_, params) => {
  const settings = store.settings.get()
  return generateContent(params, settings)
})

ipcMain.handle('generate:image', async (_, prompt, imageProvider, referenceImages) => {
  const settings = store.settings.get()
  return generateImage(prompt, settings, imageProvider, referenceImages)
})

ipcMain.handle('generate:tiktokText', (_, text) => applyTikTokIndexing(text))

// Reference images
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif']

ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] })
  if (result.canceled || !result.filePaths.length) return null
  return result.filePaths[0]
})

ipcMain.handle('dialog:selectImageFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Bilder', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }]
  })
  if (result.canceled || !result.filePaths.length) return null
  return result.filePaths[0]
})

ipcMain.handle('references:listFolders', (_, baseDir) => {
  if (!baseDir || !fs.existsSync(baseDir)) return []
  const folders = [{ name: '(Hauptordner)', path: baseDir }]
  try {
    for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
      if (entry.isDirectory()) folders.push({ name: entry.name, path: path.join(baseDir, entry.name) })
    }
  } catch { /* ignore unreadable dir */ }
  return folders
})

ipcMain.handle('references:listImages', (_, folderPath) => {
  if (!folderPath || !fs.existsSync(folderPath)) return []
  try {
    return fs.readdirSync(folderPath, { withFileTypes: true })
      .filter(e => e.isFile() && IMAGE_EXTS.includes(path.extname(e.name).toLowerCase()))
      .map(e => ({ name: e.name, path: path.join(folderPath, e.name) }))
  } catch {
    return []
  }
})

ipcMain.handle('references:readAsBase64', (_, filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return null
  return fs.readFileSync(filePath).toString('base64')
})

// Viral Research
ipcMain.handle('viral:scrape', async (_, query, maxResults) => {
  const settings = store.settings.get()
  return scrapeViralTikToks(query, settings.apifyKey, maxResults)
})

ipcMain.handle('viral:analyze', async (_, videos) => {
  const settings = store.settings.get()
  return analyzeViralContent(videos, settings)
})

ipcMain.handle('viral:analyzeVideo', async (_, { transcript, bookTitle, language, stylePreference }) => {
  const settings = store.settings.get()
  return analyzeTranscriptForSlides({ transcript, bookTitle, language, stylePreference, settings })
})

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
