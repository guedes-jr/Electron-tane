const state = {
  users: [],
  currentUser: null,
  clients: [],
  invoices: [],
  selectedClientId: '',
  selectedInvoiceId: '',
  selectedClientIds: new Set(),
  multiSelectMode: false,
  currentScreen: 'clients-screen'
};

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function currency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));
}

function decimal(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDateToBr(value) {
  if (!value) {
    return '-';
  }

  const text = String(value).trim();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    return text;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split('-');
    return `${day}/${month}/${year}`;
  }

  return text;
}

function formatMonthReference(value) {
  if (!value) {
    return '--/----';
  }

  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split('-');
    return `${month}/${year}`;
  }

  return value;
}

function formatMonthName(value) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return 'MÊS';
  }

  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase();
}

function formatDateForInput(value) {
  if (!value) {
    return '';
  }

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return formatDateToBr(text);
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    return text;
  }

  return text;
}

function formatMonthForInput(value) {
  if (!value) {
    return '';
  }

  const text = String(value).trim();

  if (/^\d{4}-\d{2}$/.test(text)) {
    return formatMonthReference(text);
  }

  if (/^\d{2}\/\d{4}$/.test(text)) {
    return text;
  }

  return text;
}

function normalizeBrDate(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);

  if (digits.length < 8) {
    return '';
  }

  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return `${day}/${month}/${year}`;
}

function normalizeBrMonth(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 6);

  if (digits.length < 6) {
    return '';
  }

  const month = digits.slice(0, 2);
  const year = digits.slice(2, 6);
  return `${month}/${year}`;
}

function brDateToIso(value) {
  const text = String(value || '').trim();

  if (!text) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const normalized = normalizeBrDate(text);
  if (!normalized) {
    return '';
  }

  const [day, month, year] = normalized.split('/');
  const monthNumber = Number(month);
  const dayNumber = Number(day);

  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) {
    return '';
  }

  return `${year}-${month}-${day}`;
}

function brMonthToIso(value) {
  const text = String(value || '').trim();

  if (!text) {
    return '';
  }

  if (/^\d{4}-\d{2}$/.test(text)) {
    return text;
  }

  const normalized = normalizeBrMonth(text);
  if (!normalized) {
    return '';
  }

  const [month, year] = normalized.split('/');
  const monthNumber = Number(month);

  if (monthNumber < 1 || monthNumber > 12) {
    return '';
  }

  return `${year}-${month}`;
}

function applyDateMask(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);

  if (digits.length > 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }

  if (digits.length > 2) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return digits;
}

function applyMonthMask(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 6);

  if (digits.length > 2) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return digits;
}

function applyCpfCnpjMask(value) {
  let v = String(value || '').replace(/\D/g, '').slice(0, 14);
  if (v.length <= 11) {
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    v = v.replace(/^(\d{2})(\d)/, "$1.$2");
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
    v = v.replace(/(\d{4})(\d)/, "$1-$2");
  }
  return v;
}

function attachMaskedInput(inputId, formatter) {
  const element = byId(inputId);

  if (!element) {
    return;
  }

  const handler = event => {
    event.target.value = formatter(event.target.value);
  };

  element.addEventListener('input', handler);
  element.addEventListener('change', handler);
}

function attachInputMasks() {
  attachMaskedInput('invoice-competence', applyMonthMask);
  attachMaskedInput('invoice-due-date', applyDateMask);
  attachMaskedInput('invoice-period-start', applyDateMask);
  attachMaskedInput('invoice-period-end', applyDateMask);
  attachMaskedInput('client-document', applyCpfCnpjMask);
}

function isAdmin() {
  return state.currentUser?.role === 'admin';
}

function requireAuth(action) {
  if (!state.currentUser) {
    window.alert('Faça login para continuar.');
    return false;
  }

  if (action === 'admin' && !isAdmin()) {
    window.alert('Essa ação é permitida apenas para o administrador.');
    return false;
  }

  return true;
}

function updateSessionUI() {
  const appShell = byId('app-shell');
  const loginScreen = byId('login-screen');
  const goUsersBtn = byId('go-users-btn');

  if (state.currentUser) {
    appShell.classList.remove('hidden');
    loginScreen.classList.add('hidden');
    byId('session-user-name').textContent = state.currentUser.name || state.currentUser.username || '-';
    byId('session-user-role').textContent = isAdmin() ? 'Administrador' : 'Usuário';
    goUsersBtn.classList.toggle('hidden', !isAdmin());
    return;
  }

  appShell.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  goUsersBtn.classList.add('hidden');
}

function showScreen(screenId) {
  if (!state.currentUser) {
    return;
  }

  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.toggle('hidden', screen.id !== screenId);
    screen.classList.toggle('active', screen.id === screenId);
  });

  state.currentScreen = screenId;
}

function getClientById(clientId) {
  return state.clients.find(client => client.id === clientId) || null;
}

function getInvoiceById(invoiceId) {
  return state.invoices.find(invoice => invoice.id === invoiceId) || null;
}

function getInvoicesForClient(clientId) {
  return state.invoices
    .filter(invoice => invoice.clientId === clientId)
    .sort((a, b) => String(b.competence || '').localeCompare(String(a.competence || '')));
}

function getAggregateForClient(clientId) {
  const invoices = getInvoicesForClient(clientId);

  return invoices.reduce((acc, invoice) => {
    acc.totalEconomy += Number(invoice.savedAmount || 0);
    acc.totalSolarWallet += Number(invoice.compensatedKwh || invoice.totalKwh || 0);
    return acc;
  }, {
    totalEconomy: 0,
    totalSolarWallet: 0
  });
}

function updateCounters() {
  byId('clients-count').textContent = String(state.clients.length);
  byId('invoices-count').textContent = String(state.invoices.length);
}

function updateSelectionCounter() {
  const counter = byId('selection-counter');
  const removeSelectedBtn = byId('remove-selected-btn');
  const count = state.selectedClientIds.size;

  if (!state.multiSelectMode) {
    counter.classList.add('hidden');
    removeSelectedBtn.disabled = true;
    counter.textContent = '0 clientes selecionados';
    return;
  }

  counter.classList.remove('hidden');
  counter.textContent = `${count} cliente${count === 1 ? '' : 's'} selecionado${count === 1 ? '' : 's'}`;
  removeSelectedBtn.disabled = count === 0;
}

function resetSelection() {
  state.selectedClientIds.clear();
  updateSelectionCounter();
}

function renderClientsList() {
  const container = byId('client-list');
  container.innerHTML = '';

  if (!state.clients.length) {
    container.innerHTML = `
      <div class="empty-card">
        <h3>Nenhum cliente cadastrado</h3>
        <p>Clique em “Novo cliente” para criar o primeiro cadastro.</p>
      </div>
    `;
    return;
  }

  state.clients
    .slice()
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
    .forEach(client => {
      const invoices = getInvoicesForClient(client.id);
      const latestInvoice = invoices[0] || null;
      const isSelected = state.selectedClientIds.has(client.id);
      const card = document.createElement('div');

      card.className = `client-card ${isSelected ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="client-card-header">
          <div>
            <h3 class="client-card-title">${escapeHtml(client.name || 'Sem nome')}</h3>
            <div class="client-card-subtitle">UC: ${escapeHtml(client.installationNumber || client.uc || '-')}</div>
            <div class="client-card-subtitle">${escapeHtml(client.distributor || 'ENEL')} · ${escapeHtml(applyCpfCnpjMask(client.document) || 'Sem documento')}</div>
          </div>
          ${state.multiSelectMode ? '<input type="checkbox" class="client-card-checkbox" />' : ''}
        </div>
        <div class="client-card-footer">
          <span>${invoices.length} lançamento(s)</span>
          <strong>${latestInvoice ? formatMonthReference(latestInvoice.competence) : 'Sem competência'}</strong>
        </div>
      `;

      if (state.multiSelectMode) {
        const checkbox = card.querySelector('.client-card-checkbox');
        checkbox.checked = isSelected;

        checkbox.addEventListener('click', event => {
          event.stopPropagation();
        });

        checkbox.addEventListener('change', event => {
          if (event.target.checked) {
            state.selectedClientIds.add(client.id);
          } else {
            state.selectedClientIds.delete(client.id);
          }
          renderClientsList();
          updateSelectionCounter();
        });

        card.addEventListener('click', () => {
          if (state.selectedClientIds.has(client.id)) {
            state.selectedClientIds.delete(client.id);
          } else {
            state.selectedClientIds.add(client.id);
          }
          renderClientsList();
          updateSelectionCounter();
        });
      } else {
        card.addEventListener('click', () => openClientDetail(client.id));
      }

      container.appendChild(card);
    });
}

function clearClientForm() {
  byId('client-form').reset();
  byId('client-id').value = '';
  byId('client-distributor').value = 'ENEL';
  byId('client-form-title').textContent = 'Novo cliente';
  byId('save-client-btn').textContent = 'Salvar cliente';
}

function populateClientForm(client) {
  byId('client-id').value = client.id || '';
  byId('client-name').value = client.name || '';
  byId('client-installation').value = client.installationNumber || client.uc || '';
  byId('client-document').value = applyCpfCnpjMask(client.document || '');
  byId('client-address').value = client.address || '';
  byId('client-distributor').value = client.distributor || 'ENEL';
  byId('client-message').value = client.message || '';
  byId('client-form-title').textContent = 'Editar cliente';
  byId('save-client-btn').textContent = 'Salvar alterações';
}

function collectClientPayload() {
  return {
    id: byId('client-id').value || undefined,
    name: byId('client-name').value.trim(),
    installationNumber: byId('client-installation').value.trim(),
    uc: byId('client-installation').value.trim(),
    document: byId('client-document').value.trim(),
    address: byId('client-address').value.trim(),
    distributor: byId('client-distributor').value.trim() || 'ENEL',
    message: byId('client-message').value.trim()
  };
}

function openNewClientForm() {
  clearClientForm();
  showScreen('client-form-screen');
}

function openEditClientForm() {
  const client = getClientById(state.selectedClientId);
  if (!client) {
    return;
  }

  populateClientForm(client);
  showScreen('client-form-screen');
}

function openClientDetail(clientId) {
  const client = getClientById(clientId);
  if (!client) {
    return;
  }

  state.selectedClientId = clientId;
  state.selectedInvoiceId = '';
  fillClientDetail(client);
  renderInvoiceList();
  showScreen('client-detail-screen');
}

function fillClientDetail(client) {
  byId('detail-client-name').textContent = client.name || 'Cliente';
  byId('detail-client-subtitle').textContent = `UC ${client.installationNumber || client.uc || '-'} · ${client.distributor || 'ENEL'}`;
  byId('detail-installation').textContent = client.installationNumber || client.uc || '-';
  byId('detail-document').textContent = applyCpfCnpjMask(client.document) || '-';
  byId('detail-distributor').textContent = client.distributor || '-';
  byId('detail-address').textContent = client.address || '-';
}

function renderInvoiceList() {
  const container = byId('invoice-list');
  const client = getClientById(state.selectedClientId);

  if (!client) {
    container.innerHTML = '<div class="empty-card"><p>Selecione um cliente.</p></div>';
    return;
  }

  const invoices = getInvoicesForClient(client.id);
  if (!invoices.length) {
    container.innerHTML = `
      <div class="empty-card">
        <h3>Nenhum lançamento cadastrado</h3>
        <p>Crie o primeiro lançamento mensal para este cliente.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = invoices.map(invoice => {
    return `
      <div class="invoice-row ${invoice.id === state.selectedInvoiceId ? 'active' : ''}">
        <div>
          <div class="invoice-row-title">Competência ${escapeHtml(formatMonthReference(invoice.competence))}</div>
          <div class="invoice-row-subtitle">Vencimento ${escapeHtml(formatDateToBr(invoice.dueDate))}</div>
        </div>
        <div class="invoice-row-values">
          <span>${escapeHtml(currency(invoice.taneTotal || 0))}</span>
          <div class="invoice-row-actions">
            <button data-invoice-open="${escapeHtml(invoice.id)}" class="mini-btn">Abrir</button>
            <button data-invoice-edit="${escapeHtml(invoice.id)}" class="mini-btn">Editar</button>
            <button data-invoice-delete="${escapeHtml(invoice.id)}" class="mini-btn danger-text">Excluir</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-invoice-open]').forEach(button => {
    button.addEventListener('click', () => openInvoicePreview(button.dataset.invoiceOpen));
  });

  container.querySelectorAll('[data-invoice-edit]').forEach(button => {
    button.addEventListener('click', () => openInvoiceForm(button.dataset.invoiceEdit));
  });

  container.querySelectorAll('[data-invoice-delete]').forEach(button => {
    button.addEventListener('click', async () => deleteInvoice(button.dataset.invoiceDelete));
  });
}

function clearInvoiceForm() {
   byId('invoice-form').reset();
   byId('invoice-id').value = '';
   byId('invoice-form-title').textContent = 'Novo lançamento';
   byId('invoice-boleto-image-path').value = '';
   updateInvoiceImageName('');
   byId('invoice-items').innerHTML = '';
   byId('invoice-discount-percent').value = '25';
   addInvoiceItemRow();
   recalculateInvoiceForm();
}

function populateInvoiceForm(invoice) {
   byId('invoice-id').value = invoice.id || '';
   byId('invoice-competence').value = formatMonthForInput(invoice.competence);
   byId('invoice-due-date').value = formatDateForInput(invoice.dueDate);
   byId('invoice-period-start').value = formatDateForInput(invoice.periodStart);
   byId('invoice-period-end').value = formatDateForInput(invoice.periodEnd);
   byId('invoice-original-total').value = Number(invoice.originalTotal || 0);
   byId('invoice-tane-total').value = Number(invoice.taneTotal || 0);
   byId('invoice-discount-percent').value = Number(invoice.discountPercent || 25);
   byId('invoice-billed-kwh').value = Number(invoice.billedKwh || 0);
   byId('invoice-boleto-image-path').value = invoice.boletoImagePath || '';
   updateInvoiceImageName(invoice.boletoImagePath || '');
   byId('invoice-form-title').textContent = `Editar lançamento ${formatMonthReference(invoice.competence)}`;

   byId('invoice-items').innerHTML = '';
   if (Array.isArray(invoice.items) && invoice.items.length) {
     invoice.items.forEach(item => addInvoiceItemRow(item));
   } else {
     addInvoiceItemRow();
   }

   recalculateInvoiceForm();
}

function addInvoiceItemRow(item = null) {
  const container = byId('invoice-items');
  const row = document.createElement('div');
  row.className = 'invoice-item-row';
  row.innerHTML = `
    <input class="invoice-item-description" type="text" placeholder="Descrição do item" value="${escapeHtml(item?.description || '')}" />
    <input class="invoice-item-value" type="number" step="0.01" placeholder="0,00" value="${item ? Number(item.value || 0) : ''}" />
    <button type="button" class="icon-btn small remove-item-btn" title="Remover item" aria-label="Remover item">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12M10 11v5M14 11v5" /></svg>
    </button>
  `;

  row.querySelector('.remove-item-btn').addEventListener('click', () => {
    if (container.children.length === 1) {
      row.querySelector('.invoice-item-description').value = '';
      row.querySelector('.invoice-item-value').value = '';
    } else {
      row.remove();
    }
    recalculateInvoiceForm();
  });

  row.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', recalculateInvoiceForm);
    input.addEventListener('change', recalculateInvoiceForm);
  });

  container.appendChild(row);
}

function collectInvoiceItems() {
  return Array.from(document.querySelectorAll('.invoice-item-row')).map(row => {
    return {
      description: row.querySelector('.invoice-item-description').value.trim(),
      value: Number(row.querySelector('.invoice-item-value').value || 0)
    };
  }).filter(item => item.description || item.value !== 0);
}

function getFileNameFromPath(filePath) {
  if (!filePath) {
    return '';
  }

  const parts = String(filePath).split(/[\\/]/);
  return parts[parts.length - 1] || '';
}

function updateInvoiceImageName(filePath) {
  const nameElement = byId('invoice-boleto-image-name');

  if (!nameElement) {
    return;
  }

  if (!filePath) {
    nameElement.textContent = 'Nenhuma imagem vinculada.';
    return;
  }

  nameElement.textContent = getFileNameFromPath(filePath);
}

function recalculateInvoiceForm() {
   const items = collectInvoiceItems();
   const itemsTotal = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
   let originalTotal = Number(byId('invoice-original-total').value || 0);
   const discountPercent = Number(byId('invoice-discount-percent').value || 0);
   let taneTotal = Number(byId('invoice-tane-total').value || 0);

   // Prioriza o input "Total sem plano", mas usa soma de itens se vazio/zero
   if (!originalTotal && itemsTotal) {
     originalTotal = itemsTotal;
     byId('invoice-original-total').value = String(itemsTotal);
   }

   // Calcula o valor a pagar com desconto baseado no percentual
   if (originalTotal) {
     const discountAmount = originalTotal * (discountPercent / 100);
     taneTotal = originalTotal - discountAmount;
     byId('invoice-tane-total').value = Number(taneTotal).toFixed(2);
   }

   const savedAmount = originalTotal - taneTotal;
   byId('items-total').textContent = currency(itemsTotal);
   byId('invoice-saved-amount').textContent = currency(savedAmount);
}

function collectInvoicePayload() {
   const competence = brMonthToIso(byId('invoice-competence').value);
   const dueDate = brDateToIso(byId('invoice-due-date').value);
   const periodStart = brDateToIso(byId('invoice-period-start').value);
   const periodEnd = brDateToIso(byId('invoice-period-end').value);

   return {
     id: byId('invoice-id').value || undefined,
     clientId: state.selectedClientId,
     competence,
     dueDate,
     periodStart,
     periodEnd,
     billingPeriod: periodStart && periodEnd
       ? `${formatDateToBr(periodStart)} - ${formatDateToBr(periodEnd)}`
       : '',
     originalTotal: Number(byId('invoice-original-total').value || 0),
     taneTotal: Number(byId('invoice-tane-total').value || 0),
     discountPercent: Number(byId('invoice-discount-percent').value || 0),
     billedKwh: Number(byId('invoice-billed-kwh').value || 0),
     boletoImagePath: byId('invoice-boleto-image-path').value.trim(),
     savedAmount: Number(byId('invoice-original-total').value || 0) - Number(byId('invoice-tane-total').value || 0),
     items: collectInvoiceItems()
   };
}

function openInvoiceForm(invoiceId = '') {
  const client = getClientById(state.selectedClientId);
  if (!client) {
    return;
  }

  if (invoiceId) {
    const invoice = getInvoiceById(invoiceId);
    if (!invoice) {
      return;
    }
    state.selectedInvoiceId = invoice.id;
    populateInvoiceForm(invoice);
  } else {
    state.selectedInvoiceId = '';
    clearInvoiceForm();
  }

  showScreen('invoice-form-screen');
}

function getDefaultMessage(client, invoice) {
  return client.message || `Parabéns ${client.name || 'cliente'}, você economizou ${currency(invoice.savedAmount || 0)} nesse mês.`;
}

function renderStatementItems(items) {
  const container = byId('statement-details');
  const validItems = Array.isArray(items) ? items : [];

  if (!validItems.length) {
    container.innerHTML = '<div class="statement-detail-row"><span>Sem itens cadastrados</span><strong>R$ 0,00</strong></div>';
    return;
  }

  container.innerHTML = validItems.map(item => {
    return `
      <div class="statement-detail-row">
        <span>${escapeHtml(item.description || '-')}</span>
        <strong>${escapeHtml(currency(item.value || 0))}</strong>
      </div>
    `;
  }).join('');
}

function setPreviewFinalImage(imagePath) {
  const section = byId('preview-final-image-section');
  const image = byId('preview-final-image');

  if (!section || !image) {
    return;
  }

  if (!imagePath) {
    image.removeAttribute('src');
    section.classList.add('hidden');
    return;
  }

  image.src = imagePath;
  section.classList.remove('hidden');
}

function updatePreview(invoiceId = '') {
  const client = getClientById(state.selectedClientId);
  const invoice = invoiceId ? getInvoiceById(invoiceId) : getInvoiceById(state.selectedInvoiceId);

  if (!client || !invoice) {
    byId('details-client-name').textContent = 'Pré-visualização da fatura';
    byId('preview-subtitle').textContent = 'Selecione um lançamento para imprimir.';
    byId('preview-economy-top').textContent = currency(0);
    byId('preview-reference-month').textContent = '--/----';
    byId('preview-total-pay').textContent = currency(0);
    byId('preview-installation').textContent = '-';
    byId('preview-billing-period').textContent = '-';
    byId('preview-without-plan-striked').textContent = currency(0);
    byId('preview-with-plan').textContent = currency(0);
    byId('preview-due-date').textContent = '-';
    byId('preview-message').textContent = 'Selecione um lançamento para imprimir.';
    byId('preview-without-plan').textContent = currency(0);
    byId('preview-with-plan-left').textContent = currency(0);
    byId('preview-economy-left').textContent = currency(0);
    byId('preview-total-economy').textContent = currency(0);
    byId('preview-solar-wallet').textContent = `${decimal(0)} kWh`;
    byId('preview-statement-without-plan').textContent = currency(0);
    byId('preview-statement-with-plan').textContent = currency(0);
    byId('preview-statement-economy').textContent = currency(0);
    byId('preview-discount-line').textContent = currency(0);
    byId('preview-black-total').textContent = currency(0);
    byId('preview-enel-total').textContent = currency(0);
    renderStatementItems([]);
    setPreviewFinalImage('');
    return;
  }

   state.selectedInvoiceId = invoice.id;
   const aggregate = getAggregateForClient(client.id);
   const billingPeriod = invoice.billingPeriod || (invoice.periodStart && invoice.periodEnd
     ? `${formatDateToBr(invoice.periodStart)} - ${formatDateToBr(invoice.periodEnd)}`
     : '-');

   // Calcula o desconto baseado no percentual e no valor total sem plano
   const originalTotal = Number(invoice.originalTotal || 0);
   const discountPercent = Number(invoice.discountPercent || 0);
   const discountAmount = originalTotal * (discountPercent / 100);
   const taneTotal = originalTotal - discountAmount;

   byId('details-client-name').textContent = client.name || 'Pré-visualização da fatura';
   byId('preview-subtitle').textContent = `Competência ${formatMonthReference(invoice.competence)}`;
   byId('preview-economy-top').textContent = currency(discountAmount);
   byId('preview-reference-month').textContent = formatMonthReference(invoice.competence);
   byId('preview-total-pay').textContent = currency(taneTotal);

   const topSummaryLabel = document.querySelector('.invoice-top-summary .top-summary-item:nth-child(2) .top-summary-label');
   if (topSummaryLabel) {
     topSummaryLabel.textContent = formatMonthName(invoice.competence);
   }

   byId('preview-installation').textContent = client.installationNumber || client.uc || '-';
   byId('preview-billing-period').textContent = billingPeriod;
   byId('preview-without-plan-striked').textContent = currency(originalTotal);
   byId('preview-with-plan').textContent = currency(taneTotal);
   byId('preview-due-date').textContent = formatDateToBr(invoice.dueDate);
   byId('preview-message').textContent = getDefaultMessage(client, invoice);
   byId('preview-without-plan').textContent = currency(originalTotal);
   byId('preview-with-plan-left').textContent = currency(taneTotal);
   byId('preview-economy-left').textContent = currency(discountAmount);
   byId('preview-total-economy').textContent = currency(aggregate.totalEconomy || 0);
   byId('preview-solar-wallet').textContent = `${decimal(aggregate.totalSolarWallet || 0)} kWh`;
   byId('preview-statement-without-plan').textContent = currency(originalTotal);
   byId('preview-statement-with-plan').textContent = currency(taneTotal);
   byId('preview-statement-economy').textContent = currency(discountAmount);
   byId('preview-discount-line').textContent = currency(discountAmount);
   byId('preview-black-total').textContent = currency(taneTotal);
   byId('preview-enel-total').textContent = currency(originalTotal);
  renderStatementItems(invoice.items || []);
  setPreviewFinalImage(invoice.boletoImagePath || '');
}

function openInvoicePreview(invoiceId) {
  updatePreview(invoiceId);
  renderInvoiceList();
  showScreen('preview-screen');
}

async function deleteCurrentClient() {
  const client = getClientById(state.selectedClientId);
  if (!client) {
    return;
  }

  const confirmed = window.confirm(`Deseja remover o cliente "${client.name}"?`);
  if (!confirmed) {
    return;
  }

  await window.taneApi.deleteClient(client.id);
  state.selectedClientId = '';
  state.selectedInvoiceId = '';
  await loadData();
  showScreen('clients-screen');
}

async function deleteSelectedClients() {
  const ids = Array.from(state.selectedClientIds);
  if (!ids.length) {
    return;
  }

  const confirmed = window.confirm(`Deseja remover ${ids.length} cliente(s) selecionado(s)?`);
  if (!confirmed) {
    return;
  }

  await window.taneApi.deleteManyClients(ids);
  state.multiSelectMode = false;
  resetSelection();
  await loadData();
  showScreen('clients-screen');
}

async function deleteInvoice(invoiceId) {
  const invoice = getInvoiceById(invoiceId);
  if (!invoice) {
    return;
  }

  const confirmed = window.confirm(`Deseja remover o lançamento ${formatMonthReference(invoice.competence)}?`);
  if (!confirmed) {
    return;
  }

  await window.taneApi.deleteInvoice(invoice.id);

  if (state.selectedInvoiceId === invoice.id) {
    state.selectedInvoiceId = '';
  }

  await loadData();
  openClientDetail(state.selectedClientId);
}

async function loadData() {
  if (!state.currentUser) {
    return;
  }

  const [clients, invoices] = await Promise.all([
    window.taneApi.listClients(),
    window.taneApi.listInvoices()
  ]);

  state.clients = Array.isArray(clients) ? clients : [];
  state.invoices = Array.isArray(invoices) ? invoices : [];

  updateCounters();
  renderClientsList();
  updateSelectionCounter();

  if (state.selectedClientId) {
    const selectedClient = getClientById(state.selectedClientId);
    if (selectedClient) {
      fillClientDetail(selectedClient);
      renderInvoiceList();
    }
  }

  if (state.selectedInvoiceId) {
    updatePreview(state.selectedInvoiceId);
  }
}

async function loadUsers() {
  if (!isAdmin()) {
    return;
  }

  const users = await window.taneApi.listUsers();
  state.users = Array.isArray(users) ? users : [];
  renderUsersList();
}

function renderUsersList() {
  const container = byId('users-list');

  if (!isAdmin()) {
    container.innerHTML = '<div class="empty-card"><p>Somente o administrador pode visualizar esta área.</p></div>';
    return;
  }

  if (!state.users.length) {
    container.innerHTML = '<div class="empty-card"><p>Nenhum usuário cadastrado.</p></div>';
    return;
  }

  container.innerHTML = state.users.map(user => `
    <div class="user-row">
      <div class="user-row-info">
        <strong>${escapeHtml(user.name || user.username || 'Usuário')}</strong>
        <span>${escapeHtml(user.username || '')}</span>
        <div class="user-tags">
          <span class="user-tag ${user.role === 'admin' ? 'admin' : ''}">${user.role === 'admin' ? 'Administrador' : 'Usuário'}</span>
          <span class="user-tag ${user.isActive ? '' : 'disabled'}">${user.isActive ? 'Ativo' : 'Desabilitado'}</span>
        </div>
      </div>
      <div class="user-actions">
        <button class="secondary-btn" data-user-password="${escapeHtml(user.id)}">Redefinir senha</button>
        ${user.role !== 'admin' ? `<button class="${user.isActive ? 'danger-btn' : 'secondary-btn'}" data-user-toggle="${escapeHtml(user.id)}">${user.isActive ? 'Desabilitar' : 'Habilitar'}</button>` : ''}
      </div>
    </div>
  `).join('');

  container.querySelectorAll('[data-user-password]').forEach(button => {
    button.addEventListener('click', () => openPasswordModal('admin-reset', button.dataset.userPassword));
  });

  container.querySelectorAll('[data-user-toggle]').forEach(button => {
    button.addEventListener('click', async () => {
      const user = state.users.find(item => item.id === button.dataset.userToggle);
      if (!user) {
        return;
      }

      const nextStatus = !user.isActive;
      const confirmed = window.confirm(`${nextStatus ? 'Habilitar' : 'Desabilitar'} o acesso de ${user.name || user.username}?`);
      if (!confirmed) {
        return;
      }

      const result = await window.taneApi.toggleUserActive({ userId: user.id, isActive: nextStatus });
      if (!result.success) {
        window.alert(result.message || 'Não foi possível atualizar o usuário.');
        return;
      }

      await loadUsers();
    });
  });
}

function openPasswordModal(mode, targetUserId = '') {
  byId('password-mode').value = mode;
  byId('password-target-user-id').value = targetUserId;
  byId('new-password').value = '';
  byId('current-password').value = '';

  const isOwn = mode === 'own-change';
  byId('current-password-group').classList.toggle('hidden', !isOwn);
  byId('password-modal-title').textContent = isOwn ? 'Alterar minha senha' : 'Redefinir senha do usuário';
  byId('password-modal').classList.remove('hidden');
}

function closePasswordModal() {
  byId('password-modal').classList.add('hidden');
}

function clearLoginMessage() {
  const box = byId('login-message');
  box.classList.add('hidden');
  box.textContent = '';
}

function showLoginMessage(message) {
  const box = byId('login-message');
  box.textContent = message;
  box.classList.remove('hidden');
}

async function handleLogin(event) {
  event.preventDefault();
  clearLoginMessage();

  const credentials = {
    username: byId('login-username').value.trim(),
    password: byId('login-password').value
  };

  const result = await window.taneApi.login(credentials);
  if (!result.success) {
    showLoginMessage(result.message || 'Não foi possível entrar.');
    return;
  }

  state.currentUser = result.user;
  updateSessionUI();
  await loadData();

  if (isAdmin()) {
    await loadUsers();
  }

  showScreen('clients-screen');

  if (state.currentUser.mustChangePassword) {
    openPasswordModal('own-change', state.currentUser.id);
  }
}

function logout() {
  state.currentUser = null;
  state.users = [];
  state.clients = [];
  state.invoices = [];
  state.selectedClientId = '';
  state.selectedInvoiceId = '';
  state.selectedClientIds.clear();
  state.multiSelectMode = false;
  byId('login-form').reset();
  clearLoginMessage();
  updateSessionUI();
}

function handleNavigation(button) {
  const target = button.dataset.go;
  if (!target) {
    return;
  }

  if (target === 'clients-screen') {
    showScreen('clients-screen');
    return;
  }

  if (target === 'client-detail-screen') {
    if (state.selectedClientId) {
      openClientDetail(state.selectedClientId);
    } else {
      showScreen('clients-screen');
    }
  }
}

function attachEvents() {
  byId('login-form').addEventListener('submit', handleLogin);
  byId('logout-btn').addEventListener('click', logout);
  byId('change-password-btn').addEventListener('click', () => {
    if (!requireAuth()) {
      return;
    }
    openPasswordModal('own-change', state.currentUser.id);
  });

  byId('close-password-modal-btn').addEventListener('click', closePasswordModal);
  byId('password-form').addEventListener('submit', async event => {
    event.preventDefault();

    const mode = byId('password-mode').value;
    const userId = byId('password-target-user-id').value;
    const newPassword = byId('new-password').value;

    if (!newPassword) {
      window.alert('Informe a nova senha.');
      return;
    }

    let result;
    if (mode === 'own-change') {
      result = await window.taneApi.changeOwnPassword({
        userId,
        currentPassword: byId('current-password').value,
        newPassword
      });
    } else {
      if (!requireAuth('admin')) {
        return;
      }
      result = await window.taneApi.setUserPassword({ userId, password: newPassword });
    }

    if (!result.success) {
      window.alert(result.message || 'Não foi possível atualizar a senha.');
      return;
    }

    if (state.currentUser && result.user && state.currentUser.id === result.user.id) {
      state.currentUser = result.user;
      updateSessionUI();
    }

    closePasswordModal();
    await loadUsers();
    window.alert('Senha atualizada com sucesso.');
  });

  byId('go-clients-btn').addEventListener('click', () => showScreen('clients-screen'));
  byId('go-preview-btn').addEventListener('click', () => {
    if (state.selectedInvoiceId) {
      openInvoicePreview(state.selectedInvoiceId);
    } else if (state.selectedClientId) {
      const invoices = getInvoicesForClient(state.selectedClientId);
      if (invoices[0]) {
        openInvoicePreview(invoices[0].id);
      } else {
        window.alert('Esse cliente ainda não possui lançamento cadastrado.');
      }
    } else {
      window.alert('Selecione um cliente primeiro.');
    }
  });
  byId('go-users-btn').addEventListener('click', async () => {
    if (!requireAuth('admin')) {
      return;
    }
    await loadUsers();
    showScreen('users-screen');
  });

  document.querySelectorAll('[data-go]').forEach(button => {
    button.addEventListener('click', () => handleNavigation(button));
  });

  byId('export-xlsx-btn').addEventListener('click', async () => {
    if (!requireAuth()) {
      return;
    }
    const result = await window.taneApi.exportDataXlsx();
    if (result?.canceled) {
      return;
    }
    if (!result?.success) {
      window.alert(result?.message || 'Não foi possível exportar o XLSX.');
      return;
    }
    window.alert('Exportação concluída com sucesso.');
  });

  byId('new-client-btn').addEventListener('click', () => {
    state.multiSelectMode = false;
    resetSelection();
    renderClientsList();
    openNewClientForm();
  });

  byId('toggle-multi-select-btn').addEventListener('click', () => {
    state.multiSelectMode = !state.multiSelectMode;
    if (!state.multiSelectMode) {
      resetSelection();
    }
    renderClientsList();
    updateSelectionCounter();
  });

  byId('remove-selected-btn').addEventListener('click', async () => {
    await deleteSelectedClients();
  });

  byId('client-form').addEventListener('submit', async event => {
    event.preventDefault();
    const payload = collectClientPayload();

    if (!payload.name) {
      window.alert('Informe o nome do cliente.');
      return;
    }

    const savedClient = await window.taneApi.saveClient(payload);
    state.selectedClientId = savedClient.id;
    await loadData();
    openClientDetail(savedClient.id);
  });

  byId('edit-client-btn').addEventListener('click', openEditClientForm);
  byId('delete-client-btn').addEventListener('click', async () => {
    await deleteCurrentClient();
  });
  byId('new-invoice-btn').addEventListener('click', () => openInvoiceForm(''));
  byId('invoice-preview-btn').addEventListener('click', () => {
    if (state.selectedInvoiceId) {
      openInvoicePreview(state.selectedInvoiceId);
      return;
    }

    const payload = collectInvoicePayload();
    if (!payload.competence) {
      window.alert('Preencha a competência antes de abrir a impressão.');
      return;
    }

    const tempInvoice = {
      ...payload,
      id: 'TEMP'
    };

    const currentInvoices = state.invoices.filter(invoice => invoice.id !== 'TEMP');
    state.invoices = [...currentInvoices, tempInvoice];
    state.selectedInvoiceId = tempInvoice.id;
    updatePreview(tempInvoice.id);
    showScreen('preview-screen');
  });

  byId('add-item-btn').addEventListener('click', () => {
    addInvoiceItemRow();
  });

  byId('pick-boleto-image-btn').addEventListener('click', async () => {
    const imagePath = await window.taneApi.pickImage();
    if (!imagePath) {
      return;
    }

    byId('invoice-boleto-image-path').value = imagePath;
    updateInvoiceImageName(imagePath);
  });

  byId('clear-boleto-image-btn').addEventListener('click', () => {
    byId('invoice-boleto-image-path').value = '';
    updateInvoiceImageName('');
  });

   [
     'invoice-original-total',
     'invoice-tane-total',
     'invoice-discount-percent',
     'invoice-billed-kwh'
   ].forEach(id => {
     const element = byId(id);
     element.addEventListener('input', recalculateInvoiceForm);
     element.addEventListener('change', recalculateInvoiceForm);
   });

  byId('invoice-form').addEventListener('submit', async event => {
    event.preventDefault();

    if (!state.selectedClientId) {
      window.alert('Selecione um cliente antes de salvar um lançamento.');
      return;
    }

    const payload = collectInvoicePayload();

    if (!payload.competence) {
      window.alert('Informe a competência do lançamento.');
      return;
    }

    if (!payload.items.length) {
      window.alert('Adicione pelo menos um item no detalhamento da cobrança.');
      return;
    }

    const savedInvoice = await window.taneApi.saveInvoice(payload);
    state.selectedInvoiceId = savedInvoice.id;
    await loadData();
    openInvoicePreview(savedInvoice.id);
  });

  byId('preview-edit-invoice-btn').addEventListener('click', () => {
    if (!state.selectedInvoiceId) {
      window.alert('Selecione um lançamento primeiro.');
      return;
    }
    openInvoiceForm(state.selectedInvoiceId);
  });

  async function doExportPdf() {
    if (!state.selectedInvoiceId) {
      window.alert('Selecione um lançamento primeiro.');
      return;
    }

    const invoice = getInvoiceById(state.selectedInvoiceId);
    const filename = invoice ? `fatura-${invoice.competence || 'tane'}.pdf` : 'fatura-tane.pdf';
    const result = await window.taneApi.exportPdf(filename);

    if (!result?.success) {
      window.alert(result?.message || 'Não foi possível gerar o PDF.');
      return;
    }

    window.alert(`PDF gerado com sucesso em:\n${result.filePath}`);
  }

  byId('export-pdf-btn').addEventListener('click', () => {
    doExportPdf();
  });

  byId('user-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!requireAuth('admin')) {
      return;
    }

    const payload = {
      name: byId('user-name').value.trim(),
      username: byId('user-username').value.trim(),
      password: byId('user-password').value
    };

    const result = await window.taneApi.createUser(payload);
    if (!result.success) {
      window.alert(result.message || 'Não foi possível criar o usuário.');
      return;
    }

    byId('user-form').reset();
    await loadUsers();
    window.alert('Usuário criado com sucesso.');
  });
}

function setInitialState() {
  updateSessionUI();
  byId('password-modal').classList.add('hidden');
  updateSelectionCounter();
}

function init() {
  attachEvents();
  attachInputMasks();
  clearInvoiceForm();
  setInitialState();
}

init();
