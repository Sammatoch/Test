import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

let dataDir = ''

const files = {
  settings: 'settings.json',
  books: 'books.json',
  hooks: 'hooks.json',
  posts: 'posts.json',
  images: 'images.json'
}

function filePath(name) {
  return path.join(dataDir, files[name])
}

function readJSON(name) {
  const fp = filePath(name)
  if (!fs.existsSync(fp)) return null
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'))
  } catch {
    return null
  }
}

function writeJSON(name, data) {
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), 'utf8')
}

export function initStore() {
  dataDir = app.getPath('userData')
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

  if (!readJSON('settings')) {
    writeJSON('settings', {
      anthropicKey: '',
      openaiKey: '',
      geminiKey: '',
      defaultBookTitle: 'Mein Sauerteig Backbuch',
      defaultNiche: 'Backen / Sauerteig',
      defaultLanguage: 'de',
      defaultProvider: 'anthropic'
    })
  }
  if (!readJSON('books')) writeJSON('books', [])
  if (!readJSON('hooks')) writeJSON('hooks', [])
  if (!readJSON('posts')) writeJSON('posts', [])
  if (!readJSON('images')) writeJSON('images', [])
}

export const store = {
  settings: {
    get() {
      return readJSON('settings')
    },
    save(data) {
      const current = readJSON('settings') || {}
      writeJSON('settings', { ...current, ...data })
      return store.settings.get()
    }
  },

  books: {
    get() {
      return readJSON('books') || []
    },
    save(book) {
      const list = store.books.get()
      const idx = list.findIndex(b => b.id === book.id)
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...book }
      } else {
        list.unshift({ id: randomUUID(), createdAt: new Date().toISOString(), ...book })
      }
      writeJSON('books', list)
      return store.books.get()
    },
    delete(id) {
      const list = store.books.get().filter(b => b.id !== id)
      writeJSON('books', list)
      return list
    }
  },

  hooks: {
    get() {
      return readJSON('hooks') || []
    },
    save(hook) {
      const list = store.hooks.get()
      const idx = list.findIndex(h => h.id === hook.id)
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...hook }
      } else {
        list.unshift({
          id: randomUUID(),
          isViral: false,
          useCount: 0,
          createdAt: new Date().toISOString(),
          ...hook
        })
      }
      writeJSON('hooks', list)
      return store.hooks.get()
    },
    delete(id) {
      const list = store.hooks.get().filter(h => h.id !== id)
      writeJSON('hooks', list)
      return list
    },
    toggleViral(id) {
      const list = store.hooks.get()
      const idx = list.findIndex(h => h.id === id)
      if (idx >= 0) list[idx].isViral = !list[idx].isViral
      writeJSON('hooks', list)
      return store.hooks.get()
    }
  },

  posts: {
    get() {
      return readJSON('posts') || []
    },
    save(post) {
      const list = store.posts.get()
      const idx = list.findIndex(p => p.id === post.id)
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...post }
      } else {
        list.unshift({ id: randomUUID(), createdAt: new Date().toISOString(), ...post })
      }
      writeJSON('posts', list)
      return store.posts.get()
    },
    delete(id) {
      const list = store.posts.get().filter(p => p.id !== id)
      writeJSON('posts', list)
      return list
    }
  },

  images: {
    get() {
      return readJSON('images') || []
    },
    save(record) {
      const list = store.images.get()
      const idx = list.findIndex(i => i.id === record.id)
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...record }
      } else {
        list.unshift({ useCount: 0, createdAt: new Date().toISOString(), ...record })
      }
      writeJSON('images', list)
      return store.images.get()
    },
    delete(id) {
      const list = store.images.get()
      const item = list.find(i => i.id === id)
      if (item) {
        const fp = path.join(dataDir, 'images', item.filename)
        if (fs.existsSync(fp)) fs.unlinkSync(fp)
      }
      const updated = list.filter(i => i.id !== id)
      writeJSON('images', updated)
      return updated
    },
    getFilePath(id) {
      const list = store.images.get()
      const item = list.find(i => i.id === id)
      if (!item) return null
      return path.join(dataDir, 'images', item.filename)
    },
    saveFromBase64(base64, prompt) {
      const imgDir = path.join(dataDir, 'images')
      if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true })
      const id = randomUUID()
      const filename = `${id}.png`
      const fp = path.join(imgDir, filename)
      const buf = Buffer.from(base64, 'base64')
      fs.writeFileSync(fp, buf)
      const record = { id, filename, prompt, useCount: 0, createdAt: new Date().toISOString() }
      const list = store.images.get()
      list.unshift(record)
      writeJSON('images', list)
      return record
    }
  }
}
