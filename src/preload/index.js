import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (data) => ipcRenderer.invoke('settings:save', data)
  },
  books: {
    get: () => ipcRenderer.invoke('books:get'),
    save: (book) => ipcRenderer.invoke('books:save', book),
    delete: (id) => ipcRenderer.invoke('books:delete', id)
  },
  hooks: {
    get: () => ipcRenderer.invoke('hooks:get'),
    save: (hook) => ipcRenderer.invoke('hooks:save', hook),
    delete: (id) => ipcRenderer.invoke('hooks:delete', id),
    toggleViral: (id) => ipcRenderer.invoke('hooks:toggleViral', id)
  },
  posts: {
    get: () => ipcRenderer.invoke('posts:get'),
    save: (post) => ipcRenderer.invoke('posts:save', post),
    delete: (id) => ipcRenderer.invoke('posts:delete', id)
  },
  images: {
    get: () => ipcRenderer.invoke('images:get'),
    saveFromBase64: (base64, prompt) => ipcRenderer.invoke('images:saveFromBase64', base64, prompt),
    delete: (id) => ipcRenderer.invoke('images:delete', id),
    getFilePath: (id) => ipcRenderer.invoke('images:getFilePath', id),
    readAsBase64: (id) => ipcRenderer.invoke('images:readAsBase64', id)
  },
  generate: {
    content: (params) => ipcRenderer.invoke('generate:content', params),
    image: (prompt, imageProvider, referenceImages) => ipcRenderer.invoke('generate:image', prompt, imageProvider, referenceImages),
    tiktokText: (text) => ipcRenderer.invoke('generate:tiktokText', text)
  },
  references: {
    selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
    selectImageFile: () => ipcRenderer.invoke('dialog:selectImageFile'),
    listFolders: (baseDir) => ipcRenderer.invoke('references:listFolders', baseDir),
    listImages: (folderPath) => ipcRenderer.invoke('references:listImages', folderPath),
    readAsBase64: (filePath) => ipcRenderer.invoke('references:readAsBase64', filePath)
  },
  export: {
    post: (imageBase64, filename) => ipcRenderer.invoke('export:post', imageBase64, filename),
    openFolder: () => ipcRenderer.invoke('export:openFolder')
  },
  viral: {
    scrape: (query, maxResults) => ipcRenderer.invoke('viral:scrape', query, maxResults),
    analyze: (videos) => ipcRenderer.invoke('viral:analyze', videos),
    analyzeVideo: (params) => ipcRenderer.invoke('viral:analyzeVideo', params),
    fetchTranscript: (params) => ipcRenderer.invoke('viral:fetchTranscript', params)
  }
})
