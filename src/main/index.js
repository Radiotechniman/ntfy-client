import { app, shell, BrowserWindow, ipcMain, Tray, Menu, Notification, nativeImage, clipboard } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { EventSource } from 'eventsource'
import { exec } from 'child_process'

const store = new Store()

let mainWindow
let tray

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Ntfy Desktop',
    backgroundColor: '#00000000', // Transparent for Mica/Vibrancy
    frame: process.platform !== 'darwin', // Frameless on macOS for a cleaner look
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Add Mica effect for Windows 11 or Vibrancy for macOS
  if (process.platform === 'win32') {
    mainWindow.setVibrancy('mica')
  } else if (process.platform === 'darwin') {
    mainWindow.setVisualEffect('vibrancy', {
      material: 'under-window',
      state: 'active'
    })
  }

  mainWindow.on('ready-to-show', () => {
    // We don't show by default, only on tray click or first run if configured
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
    return false
  })
}

function createTray() {
  const iconPath = is.dev 
    ? join(__dirname, '../../resources/icon.png')
    : join(process.resourcesPath, 'icon.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  
  if (process.platform === 'darwin') {
    icon.setTemplateImage(true)
  }
  
  tray = new Tray(icon)
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open History', click: () => mainWindow.show() },
    { label: 'Settings', click: () => {
      mainWindow.show();
      mainWindow.webContents.send('go-to-settings');
    }},
    { type: 'separator' },
    { label: 'Clear History', click: () => {
      store.set('history', []);
      mainWindow.webContents.send('history-updated', []);
    }},
    { type: 'separator' },
    { label: 'Quit', click: () => {
      app.isQuitting = true;
      app.quit();
    }}
  ])

  tray.setToolTip('Ntfy Desktop Client')
  tray.setContextMenu(contextMenu)
  
  tray.on('double-click', () => {
    mainWindow.show()
  })
}

function openUrl(url) {
  if (!url) return
  const browserPath = store.get('browserPath', '')
  if (browserPath) {
    const cmd = process.platform === 'darwin' 
      ? `open -a "${browserPath}" "${url}"`
      : `"${browserPath}" "${url}"`
    
    exec(cmd, (err) => {
      if (err) {
        console.error('Failed to open with custom browser:', err)
        shell.openExternal(url) // Fallback
      }
    })
  } else {
    shell.openExternal(url)
  }
}

// Ntfy Monitoring Logic
let listeners = []

function setupNtfyListeners() {
  // Close existing listeners
  listeners.forEach(l => l.close())
  listeners = []

  const topics = store.get('topics', [])
  
  topics.forEach(topic => {
    const url = `${topic.server}/${topic.name}/sse`
    const es = new EventSource(url)

    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.event === 'message') {
        handleNewMessage(data, topic)
      }
    }

    es.onerror = (err) => {
      console.error(`Error on topic ${topic.name}:`, err)
    }

    listeners.push(es)
  })
}

function handleNewMessage(msg, topic) {
  const history = store.get('history', [])
  const newMessage = {
    id: msg.id || Date.now(),
    title: msg.title || topic.name,
    message: msg.message,
    time: Date.now(),
    topic: topic.name,
    click: msg.click || ''
  }

  // Update History
  const updatedHistory = [newMessage, ...history].slice(0, 100)
  store.set('history', updatedHistory)

  // Notify Renderer
  if (mainWindow) {
    mainWindow.webContents.send('history-updated', updatedHistory)
  }

  // Windows Notification
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: newMessage.title,
      body: newMessage.message,
      // icon: ...
    })
    
    notification.on('click', () => {
      if (newMessage.click) {
        openUrl(newMessage.click)
      } else {
        clipboard.writeText(newMessage.message)
        if (mainWindow) {
          mainWindow.show()
          mainWindow.webContents.send('show-toast', { message: 'Copied to clipboard!', type: 'success' })
        }
      }
    })
    
    notification.show()
  }
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    electronApp.setAppUserModelId('com.antigravity.ntfy-client')
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC handlers
  ipcMain.handle('get-history', () => store.get('history', []))
  ipcMain.handle('get-topics', () => store.get('topics', []))
  ipcMain.handle('save-topics', (_, topics) => {
    store.set('topics', topics)
    setupNtfyListeners()
    return true
  })
  ipcMain.handle('save-theme', (_, theme) => store.set('theme', theme))
  ipcMain.on('copy-to-clipboard', (_, text) => {
    clipboard.writeText(text)
  })
  ipcMain.handle('get-browser-path', () => store.get('browserPath', ''))
  ipcMain.handle('save-browser-path', (_, path) => store.set('browserPath', path))

  createWindow()
  createTray()
  setupNtfyListeners()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep running in tray
  }
})
