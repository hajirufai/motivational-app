const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  app: {
    getVersion: () => ipcRenderer.invoke('get-app-version')
  },
  user: {
    getData: () => ipcRenderer.invoke('get-user-data'),
    setData: (userData) => ipcRenderer.invoke('set-user-data', userData),
    clearData: () => ipcRenderer.invoke('clear-user-data')
  },
  notifications: {
    show: (title, body) => {
      new Notification(title, { body });
    }
  }
});

// Expose Firebase API to renderer process
contextBridge.exposeInMainWorld('firebaseConfig', {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
});

// Expose API URL to renderer process
contextBridge.exposeInMainWorld('apiConfig', {
  baseUrl: process.env.API_URL
});

// Expose app configuration to renderer process
contextBridge.exposeInMainWorld('appConfig', {
  name: process.env.APP_NAME,
  version: process.env.APP_VERSION,
  enableOfflineMode: process.env.ENABLE_OFFLINE_MODE === 'true',
  enableNotifications: process.env.ENABLE_NOTIFICATIONS === 'true'
});