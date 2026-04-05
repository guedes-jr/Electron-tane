const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Forçar visualização dos inputs type="date" em formato brasileiro (DD/MM/YYYY)
app.commandLine.appendSwitch('lang', 'pt-BR');
let XLSX = null;

try {
  XLSX = require('xlsx');
} catch (error) {
  XLSX = null;
}

const DATA_DIR = path.join(app.getPath('userData'), 'data');
const CLIENTS_FILE = path.join(DATA_DIR, 'clients.json');
const INVOICES_FILE = path.join(DATA_DIR, 'invoices.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PX_TO_MICRONS = 264.5833333333;

function pxToMicrons(value) {
  return Math.max(1000, Math.ceil(Number(value || 0) * PX_TO_MICRONS));
}

function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function readJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, { encoding: 'utf8' });
    if (!content) {
      return [];
    }

    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Erro ao ler JSON de ${filePath}:`, error);
    return [];
  }
}

function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data || [], null, 2), { encoding: 'utf8' });
  } catch (error) {
    console.error(`Erro ao gravar JSON em ${filePath}:`, error);
    throw error;
  }
}

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(CLIENTS_FILE)) {
    writeJson(CLIENTS_FILE, []);
  }

  if (!fs.existsSync(INVOICES_FILE)) {
    writeJson(INVOICES_FILE, []);
  }

  if (!fs.existsSync(USERS_FILE)) {
    writeJson(USERS_FILE, []);
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

function sanitizeUser(user) {
  if (!user || typeof user !== 'object') {
    return null;
  }

  return {
    id: user.id || '',
    username: user.username || '',
    name: user.name || '',
    role: user.role || 'user',
    isActive: Boolean(user.isActive),
    mustChangePassword: Boolean(user.mustChangePassword),
    createdAt: user.createdAt || '',
    updatedAt: user.updatedAt || ''
  };
}

function ensureUsersConsistency() {
  const users = readJson(USERS_FILE);
  let normalizedUsers = Array.isArray(users) ? users : [];

  if (!normalizedUsers.some(u => String(u.role || '').toLowerCase() === 'admin')) {
    const defaultAdmin = {
      id: `USR-${Date.now()}`,
      username: 'admin',
      name: 'Administrador',
      passwordHash: sha256('admin'),
      role: 'admin',
      isActive: true,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    normalizedUsers.push(defaultAdmin);
    writeJson(USERS_FILE, normalizedUsers);
  }

  // Ensure users are an array and persist any possible fixes.
  writeJson(USERS_FILE, normalizedUsers);
  return normalizedUsers;
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1300,
    minHeight: 640,
    show: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  return mainWindow;
}

async function withDesktopExportLayout(sourceWin, callback) {
  const wasMaximized = sourceWin.isMaximized();
  const originalBounds = sourceWin.getBounds();

  try {
    if (wasMaximized) {
      sourceWin.unmaximize();
      await wait(120);
    }

    const exportWidth = Math.max(originalBounds.width, 1500);
    const exportHeight = Math.max(originalBounds.height, 1400);
    sourceWin.setBounds({
      x: originalBounds.x,
      y: originalBounds.y,
      width: exportWidth,
      height: exportHeight
    }, false);
    await wait(220);

    return await callback();
  } finally {
    sourceWin.setBounds(originalBounds, false);
    if (wasMaximized) {
      sourceWin.maximize();
    }
    await wait(120);
  }
}

async function buildPrintablePreview(win) {
   const result = await win.webContents.executeJavaScript(`
     (async () => {
       const previous = document.getElementById('pdf-capture-root');
       if (previous) {
         previous.remove();
       }

       document.body.classList.add('pdf-export-capture');

       const preview =
         document.getElementById('invoice-preview') ||
         document.querySelector('.invoice-preview');

       if (!preview) {
         return { success: false, message: 'Preview da fatura não encontrado.' };
       }

       const root = document.createElement('div');
       root.id = 'pdf-capture-root';
       root.style.position = 'absolute';
       root.style.left = '50%';
       root.style.top = '0';
       root.style.transform = 'translateX(-50%)';
       root.style.zIndex = '2147483647';
       root.style.background = '#ffffff';
       root.style.padding = '0';
       root.style.margin = '0 auto';
       root.style.width = '1050px';
       root.style.minWidth = '1050px';
       root.style.maxWidth = '1050px';
       root.style.boxSizing = 'border-box';
       root.style.overflow = 'visible';

       const previewClone = preview.cloneNode(true);
       previewClone.style.margin = '0 auto';
       previewClone.style.minWidth = '1050px';
       previewClone.style.maxWidth = '1050px';
       previewClone.style.width = '1050px';
       previewClone.style.boxShadow = 'none';
       previewClone.style.border = 'none';
       previewClone.style.borderRadius = '0';
       previewClone.style.background = 'transparent';
       previewClone.style.overflow = 'visible';

       root.appendChild(previewClone);

       document.body.appendChild(root);
       window.scrollTo(0, 0);

       const images = Array.from(root.querySelectorAll('img'));
       await Promise.all(images.map(img => {
         if (img.complete) {
           return Promise.resolve();
         }

         return new Promise(resolve => {
           const done = () => resolve();
           img.addEventListener('load', done, { once: true });
           img.addEventListener('error', done, { once: true });
         });
       }));

       await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

       const rect = root.getBoundingClientRect();
       const width = Math.max(1, Math.ceil(rect.width));
       const height = Math.max(1, Math.ceil(root.scrollHeight || rect.height));

       return {
         success: true,
         x: Math.max(0, Math.floor(rect.left)),
         y: 0,
         width,
         height
       };
     })();
   `);

   const cleanupScript = `
     (() => {
       const root = document.getElementById('pdf-capture-root');
       if (root) {
         root.remove();
       }
       document.body.classList.remove('pdf-export-capture');
     })();
   `;

   if (!result?.success) {
     try {
       await win.webContents.executeJavaScript(cleanupScript);
     } catch (error) {
       null;
     }
     throw new Error(result?.message || 'Não foi possível preparar a fatura para exportação.');
   }

   await wait(220);

   const image = await win.webContents.capturePage({
     x: result.x,
     y: result.y,
     width: Math.max(1, result.width),
     height: Math.max(1, result.height)
   });

   try {
     await win.webContents.executeJavaScript(cleanupScript);
   } catch (error) {
     null;
   }

   return {
     pngBase64: image.toPNG().toString('base64'),
     width: result.width,
     height: result.height
   };
}

function createPrintableHtml(imageDataUrl, width, height) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Exportação PDF</title>
<style>
  @page {
    size: A4;
    margin: 0;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    width: 210mm;
    min-height: 297mm;
    background: #ffffff;
    overflow: visible;
  }

  body {
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }

  .container {
    width: 210mm;
    max-width: 210mm;
    background: #ffffff;
    box-sizing: border-box;
    page-break-inside: avoid;
  }

  img {
    display: block;
    width: 100%;
    height: auto;
    object-fit: contain;
    object-position: top center;
  }
</style>
</head>
<body>
  <div class="container">
    <img src="${imageDataUrl}" alt="Fatura TANE" />
  </div>
</body>
</html>`;
}

async function withPrintWindow(sourceWin, callback) {
  return await withDesktopExportLayout(sourceWin, async () => {
    const preview = await buildPrintablePreview(sourceWin);
    const imageDataUrl = `data:image/png;base64,${preview.pngBase64}`;

    const printWin = new BrowserWindow({
      show: false,
      autoHideMenuBar: true,
      backgroundColor: '#ffffff',
      width: Math.max(1200, preview.width + 80),
      height: Math.min(Math.max(900, preview.height + 80), 2200),
      webPreferences: {
        sandbox: false
      }
    });

    try {
      await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(createPrintableHtml(imageDataUrl, preview.width, preview.height))}`);
      await wait(250);
      return await callback(printWin, preview);
    } finally {
      if (!printWin.isDestroyed()) {
        printWin.close();
      }
    }
  });
}

app.whenReady().then(() => {

  ensureStorage();
  ensureUsersConsistency();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('auth:login', (_, credentials) => {
  const users = ensureUsersConsistency();
  const username = String(credentials?.username || '').trim().toLowerCase();
  const password = String(credentials?.password || '');
  const user = users.find(item => String(item.username || '').toLowerCase() === username);

  if (!user) {
    return { success: false, message: 'Usuário ou senha inválidos.' };
  }

  if (!user.isActive) {
    return { success: false, message: 'Este usuário está desabilitado.' };
  }

  if (user.passwordHash !== sha256(password)) {
    return { success: false, message: 'Usuário ou senha inválidos.' };
  }

  return {
    success: true,
    user: sanitizeUser(user)
  };
});

ipcMain.handle('users:list', () => {
  const users = ensureUsersConsistency();
  return users.map(sanitizeUser);
});

ipcMain.handle('users:create', (_, payload) => {
  const users = ensureUsersConsistency();
  const username = String(payload?.username || '').trim().toLowerCase();
  const name = String(payload?.name || '').trim();
  const password = String(payload?.password || '');

  if (!username || !name || !password) {
    return { success: false, message: 'Preencha nome, usuário e senha.' };
  }

  if (users.some(user => String(user.username || '').toLowerCase() === username)) {
    return { success: false, message: 'Já existe um usuário com esse login.' };
  }

  const now = new Date().toISOString();
  const user = {
    id: `USR-${Date.now()}`,
    username,
    name,
    passwordHash: sha256(password),
    role: 'user',
    isActive: true,
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now
  };

  users.push(user);
  writeJson(USERS_FILE, users);

  return { success: true, user: sanitizeUser(user) };
});

ipcMain.handle('users:set-password', (_, payload) => {
  const users = ensureUsersConsistency();
  const userId = String(payload?.userId || '').trim();
  const password = String(payload?.password || '');

  if (!userId || !password) {
    return { success: false, message: 'Usuário e senha são obrigatórios.' };
  }

  const index = users.findIndex(user => user.id === userId);
  if (index < 0) {
    return { success: false, message: 'Usuário não encontrado.' };
  }

  users[index] = {
    ...users[index],
    passwordHash: sha256(password),
    mustChangePassword: false,
    updatedAt: new Date().toISOString()
  };

  writeJson(USERS_FILE, users);
  return { success: true, user: sanitizeUser(users[index]) };
});

ipcMain.handle('users:change-own-password', (_, payload) => {
  const users = ensureUsersConsistency();
  const userId = String(payload?.userId || '').trim();
  const currentPassword = String(payload?.currentPassword || '');
  const newPassword = String(payload?.newPassword || '');

  if (!userId || !currentPassword || !newPassword) {
    return { success: false, message: 'Preencha a senha atual e a nova senha.' };
  }

  const index = users.findIndex(user => user.id === userId);
  if (index < 0) {
    return { success: false, message: 'Usuário não encontrado.' };
  }

  if (users[index].passwordHash !== sha256(currentPassword)) {
    return { success: false, message: 'Senha atual incorreta.' };
  }

  users[index] = {
    ...users[index],
    passwordHash: sha256(newPassword),
    mustChangePassword: false,
    updatedAt: new Date().toISOString()
  };

  writeJson(USERS_FILE, users);
  return { success: true, user: sanitizeUser(users[index]) };
});

ipcMain.handle('users:toggle-active', (_, payload) => {
  const users = ensureUsersConsistency();
  const userId = String(payload?.userId || '').trim();
  const isActive = Boolean(payload?.isActive);

  const index = users.findIndex(user => user.id === userId);
  if (index < 0) {
    return { success: false, message: 'Usuário não encontrado.' };
  }

  if (users[index].role === 'admin' && !isActive) {
    return { success: false, message: 'O administrador principal não pode ser desabilitado.' };
  }

  users[index] = {
    ...users[index],
    isActive,
    updatedAt: new Date().toISOString()
  };

  writeJson(USERS_FILE, users);
  return { success: true, user: sanitizeUser(users[index]) };
});

ipcMain.handle('clients:list', () => readJson(CLIENTS_FILE));
ipcMain.handle('invoices:list', () => readJson(INVOICES_FILE));

ipcMain.handle('clients:save', (_, payload) => {
  const clients = readJson(CLIENTS_FILE);
  const client = {
    id: payload.id || `CLI-${Date.now()}`,
    name: String(payload.name || '').trim(),
    document: String(payload.document || '').trim(),
    uc: String(payload.uc || payload.installationNumber || '').trim(),
    installationNumber: String(payload.installationNumber || payload.uc || '').trim(),
    address: String(payload.address || '').trim(),
    distributor: String(payload.distributor || 'ENEL').trim(),
    referenceMonth: String(payload.referenceMonth || '').trim(),
    dueDate: String(payload.dueDate || '').trim(),
    billingPeriod: String(payload.billingPeriod || '').trim(),
    withoutPlan: Number(payload.withoutPlan || 0),
    withPlan: Number(payload.withPlan || 0),
    economy: Number(payload.economy || 0),
    totalEconomy: Number(payload.totalEconomy || 0),
    solarWallet: Number(payload.solarWallet || 0),
    message: String(payload.message || '').trim(),
    updatedAt: new Date().toISOString()
  };

  const existingIndex = clients.findIndex(item => item.id === client.id);
  if (existingIndex >= 0) {
    clients[existingIndex] = {
      ...clients[existingIndex],
      ...client
    };
  } else {
    clients.push({
      ...client,
      createdAt: new Date().toISOString()
    });
  }

  writeJson(CLIENTS_FILE, clients);
  return clients.find(item => item.id === client.id);
});

ipcMain.handle('clients:delete', (_, clientId) => {
  if (!clientId) {
    return { removed: false, reason: 'missing-id' };
  }

  const clients = readJson(CLIENTS_FILE);
  const invoices = readJson(INVOICES_FILE);
  const client = clients.find(item => item.id === clientId);

  if (!client) {
    return { removed: false, reason: 'not-found' };
  }

  const remainingClients = clients.filter(item => item.id !== clientId);
  const remainingInvoices = invoices.filter(item => item.clientId !== clientId);
  const removedInvoicesCount = invoices.length - remainingInvoices.length;

  writeJson(CLIENTS_FILE, remainingClients);
  writeJson(INVOICES_FILE, remainingInvoices);

  return {
    removed: true,
    client,
    removedInvoicesCount
  };
});

ipcMain.handle('clients:delete-many', (_, clientIds = []) => {
  const ids = Array.isArray(clientIds)
    ? [...new Set(clientIds.filter(Boolean))]
    : [];

  if (!ids.length) {
    return { removed: false, reason: 'missing-ids' };
  }

  const clients = readJson(CLIENTS_FILE);
  const invoices = readJson(INVOICES_FILE);
  const removedClients = clients.filter(item => ids.includes(item.id));

  if (!removedClients.length) {
    return { removed: false, reason: 'not-found' };
  }

  const remainingClients = clients.filter(item => !ids.includes(item.id));
  const remainingInvoices = invoices.filter(item => !ids.includes(item.clientId));
  const removedInvoicesCount = invoices.length - remainingInvoices.length;

  writeJson(CLIENTS_FILE, remainingClients);
  writeJson(INVOICES_FILE, remainingInvoices);

  return {
    removed: true,
    removedClients,
    removedClientsCount: removedClients.length,
    removedInvoicesCount
  };
});

 ipcMain.handle('invoices:save', (_, payload) => {
   const invoices = readJson(INVOICES_FILE);
   const items = Array.isArray(payload.items)
     ? payload.items
       .filter(item => String(item.description || '').trim() || Number(item.value || 0) !== 0)
       .map((item, index) => ({
         id: item.id || `ITEM-${Date.now()}-${index}`,
         description: String(item.description || '').trim(),
         value: Number(item.value || 0)
       }))
     : [];

   const totalFromItems = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
   let originalTotal = Number(payload.originalTotal || 0);
   
   // Se originalTotal não foi informado, usa a soma dos itens
   if (!originalTotal && totalFromItems) {
     originalTotal = totalFromItems;
   }

   const discountPercent = Number(payload.discountPercent || 0);
   // Calcula taneTotal aplicando o desconto percentual
   const discountAmount = originalTotal * (discountPercent / 100);
   const taneTotal = originalTotal - discountAmount;
   const savedAmount = discountAmount;
   const competence = String(payload.competence || '').trim();
   const clientId = String(payload.clientId || '').trim();

   const invoice = {
     id: payload.id || `FAT-${Date.now()}`,
     clientId,
     competence,
     dueDate: String(payload.dueDate || '').trim(),
     periodStart: String(payload.periodStart || '').trim(),
     periodEnd: String(payload.periodEnd || '').trim(),
     billingPeriod: String(payload.billingPeriod || '').trim(),
     originalTotal,
     discountPercent,
     taneTotal,
     savedAmount,
     totalKwh: Number(payload.totalKwh || 0),
     billedKwh: Number(payload.billedKwh || 0),
     compensatedKwh: Number(payload.compensatedKwh || 0),
     boletoImagePath: String(payload.boletoImagePath || '').trim(),
     items,
     updatedAt: new Date().toISOString(),
     createdAt: payload.createdAt || new Date().toISOString()
   };

   const existingIndex = invoices.findIndex(item => {
     if (payload.id && item.id === payload.id) {
       return true;
     }

     return item.clientId === clientId && item.competence === competence;
   });

   if (existingIndex >= 0) {
     invoices[existingIndex] = {
       ...invoices[existingIndex],
       ...invoice,
       id: invoices[existingIndex].id || invoice.id,
       createdAt: invoices[existingIndex].createdAt || invoice.createdAt
     };
   } else {
     invoices.push(invoice);
   }

   writeJson(INVOICES_FILE, invoices);
   return existingIndex >= 0 ? invoices[existingIndex] : invoice;
});

ipcMain.handle('invoices:delete', (_, invoiceId) => {
  if (!invoiceId) {
    return { removed: false, reason: 'missing-id' };
  }

  const invoices = readJson(INVOICES_FILE);
  const invoice = invoices.find(item => item.id === invoiceId);

  if (!invoice) {
    return { removed: false, reason: 'not-found' };
  }

  const remainingInvoices = invoices.filter(item => item.id !== invoiceId);
  writeJson(INVOICES_FILE, remainingInvoices);

  return { removed: true, invoice };
});

ipcMain.handle('file:pick-image', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Imagens', extensions: ['png', 'jpg', 'jpeg', 'webp'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return '';
  }

  return result.filePaths[0];
});

ipcMain.handle('data:export-xlsx', async event => {
  const win = BrowserWindow.fromWebContents(event.sender);

  if (!XLSX) {
    return {
      success: false,
      message: 'Dependência de exportação não encontrada. Rode npm install para instalar o pacote xlsx.'
    };
  }

  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Exportar dados em XLSX',
    defaultPath: 'tane-dados.xlsx',
    filters: [{ name: 'Planilha Excel', extensions: ['xlsx'] }]
  });

  if (canceled || !filePath) {
    return { success: false, canceled: true };
  }

  const clients = readJson(CLIENTS_FILE);
  const invoices = readJson(INVOICES_FILE);
  const workbook = XLSX.utils.book_new();

  clients
    .slice()
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
    .forEach(client => {
      const clientInvoices = invoices
        .filter(invoice => invoice.clientId === client.id)
        .sort((a, b) => String(a.competence || '').localeCompare(String(b.competence || '')));

      const rows = [
        ['Dados do cliente'],
        ['ID', client.id || ''],
        ['Nome', client.name || ''],
        ['Documento', client.document || ''],
        ['Unidade consumidora', client.installationNumber || client.uc || ''],
        ['Distribuidora', client.distributor || ''],
        ['Endereço', client.address || ''],
        ['Mensagem padrão', client.message || ''],
        [],
        ['Lançamentos'],
        ['Competência', 'Vencimento', 'Período', 'Total sem plano', 'Total TANE', 'Economia', 'Desconto %', 'kWh total', 'kWh faturado', 'kWh compensado', 'Imagem final', 'Detalhamento']
      ];

      clientInvoices.forEach(invoice => {
        const details = Array.isArray(invoice.items)
          ? invoice.items.map(item => `${item.description || ''}: ${Number(item.value || 0).toFixed(2)}`).join(' | ')
          : '';

        rows.push([
          invoice.competence || '',
          invoice.dueDate || '',
          invoice.billingPeriod || '',
          Number(invoice.originalTotal || 0),
          Number(invoice.taneTotal || 0),
          Number(invoice.savedAmount || 0),
          Number(invoice.discountPercent || 0),
          Number(invoice.totalKwh || 0),
          Number(invoice.billedKwh || 0),
          Number(invoice.compensatedKwh || 0),
          invoice.boletoImagePath || '',
          details
        ]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      worksheet['!cols'] = [
        { wch: 18 },
        { wch: 18 },
        { wch: 24 },
        { wch: 16 },
        { wch: 16 },
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 },
        { wch: 40 },
        { wch: 70 }
      ];

      const sheetNameBase = `${client.id || 'SEM-ID'} - ${String(client.name || 'Cliente').trim().split(/\s+/).slice(0, 2).join(' ')}`;
      const sheetName = sheetNameBase.slice(0, 31) || `Cliente-${Date.now()}`;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

  if (!workbook.SheetNames.length) {
    const worksheet = XLSX.utils.aoa_to_sheet([['Nenhum cliente cadastrado']]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumo');
  }

  XLSX.writeFile(workbook, filePath);
  return { success: true, filePath };
});

async function exportInvoicePdf(sourceWin, defaultFileName = 'fatura.pdf') {
  if (!sourceWin || sourceWin.isDestroyed()) {
    return { success: false, saved: false, message: 'Janela não encontrada.' };
  }

  try {
    const pdfData = await withPrintWindow(sourceWin, async (printWin) => {
      const data = await printWin.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { marginType: 'none' },
        scaleFactor: 100,
        landscape: false
      });
      return data;
    });

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Salvar PDF',
      defaultPath: defaultFileName || 'fatura.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (canceled || !filePath) {
      return { success: false, saved: false, message: 'Salvar PDF cancelado.' };
    }

    fs.writeFileSync(filePath, pdfData);
    return { success: true, saved: true, filePath };
  } catch (error) {
    console.error('ERRO AO GERAR PDF:', error);
    return { success: false, saved: false, message: error.message || 'Erro desconhecido ao gerar PDF.' };
  }
}

ipcMain.handle('pdf:export', async (event, defaultFileName = 'fatura.pdf') => {
  const sourceWin = BrowserWindow.fromWebContents(event.sender);
  return await exportInvoicePdf(sourceWin, defaultFileName);
});

ipcMain.handle('page:print', async () => ({ success: false, failureReason: 'A impressão direta foi desabilitada. Use Exportar PDF.' }));
