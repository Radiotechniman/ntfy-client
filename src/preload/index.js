import { contextBridge, ipcRenderer, clipboard } from 'electron'
import { electronAPI } from '@electron-toolkit/utils'

// Custom APIs for renderer
const api = {
  getHistory: () => ipcRenderer.invoke('get-history'),
  getTopics: () => ipcRenderer.invoke('get-topics'),
  saveTopics: (topics) => ipcRenderer.invoke('save-topics', topics),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  saveTheme: (theme) => ipcRenderer.invoke('save-theme', theme),
  getBrowserPath: () => ipcRenderer.invoke('get-browser-path'),
  saveBrowserPath: (path) => ipcRenderer.invoke('save-browser-path', path),
  onHistoryUpdated: (callback) => ipcRenderer.on('history-updated', (_, history) => callback(history)),
  onGoToSettings: (callback) => ipcRenderer.on('go-to-settings', () => callback()),
  copyToClipboard: (text) => ipcRenderer.send('copy-to-clipboard', text),
  onShowToast: (callback) => ipcRenderer.on('show-toast', (_, data) => callback(data))
}

// Use `contextBridge` to expose Electron APIs to
// renderer only if main world isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
