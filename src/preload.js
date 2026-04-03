const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('taneApi', {
  login: credentials => ipcRenderer.invoke('auth:login', credentials),
  listUsers: () => ipcRenderer.invoke('users:list'),
  createUser: payload => ipcRenderer.invoke('users:create', payload),
  setUserPassword: payload => ipcRenderer.invoke('users:set-password', payload),
  changeOwnPassword: payload => ipcRenderer.invoke('users:change-own-password', payload),
  toggleUserActive: payload => ipcRenderer.invoke('users:toggle-active', payload),
  listClients: () => ipcRenderer.invoke('clients:list'),
  saveClient: payload => ipcRenderer.invoke('clients:save', payload),
  deleteClient: clientId => ipcRenderer.invoke('clients:delete', clientId),
  deleteManyClients: clientIds => ipcRenderer.invoke('clients:delete-many', clientIds),
  listInvoices: () => ipcRenderer.invoke('invoices:list'),
  saveInvoice: payload => ipcRenderer.invoke('invoices:save', payload),
  deleteInvoice: invoiceId => ipcRenderer.invoke('invoices:delete', invoiceId),
  pickImage: () => ipcRenderer.invoke('file:pick-image'),
  exportDataXlsx: () => ipcRenderer.invoke('data:export-xlsx'),
  exportPdf: defaultFileName => ipcRenderer.invoke('pdf:export', defaultFileName),
  printPage: () => ipcRenderer.invoke('page:print')
});
