import { state, markUnsavedChanges } from './app.js';
import { renderAnalytics } from './analytics.js';

const categoryMap = {
  'food': { icon: 'bi-cup-hot-fill', color: 'bg-danger' },
  'dining': { icon: 'bi-shop', color: 'bg-danger' },
  'restaurant': { icon: 'bi-shop', color: 'bg-danger' },
  'rent': { icon: 'bi-house-fill', color: 'bg-warning text-dark' }, 
  'housing': { icon: 'bi-house-fill', color: 'bg-warning text-dark' },
  'phone': { icon: 'bi-telephone-fill', color: 'bg-primary' },
  'utilities': { icon: 'bi-lightning-charge-fill', color: 'bg-primary' },
  'transport': { icon: 'bi-car-front-fill', color: 'bg-success' },
  'entertainment': { icon: 'bi-film', color: 'text-bg-secondary' },
  'shopping': { icon: 'bi-bag-fill', color: 'bg-danger' },
  'health': { icon: 'bi-heart-pulse-fill', color: 'bg-danger' },
  'kids': { icon: 'bi-person-hearts', color: 'bg-info' },
  'insurance': { icon: 'bi-shield-fill-check', color: 'bg-warning text-dark' }, /* Based on image "Assicurazione" is orange */
  'software': { icon: 'bi-laptop', color: 'bg-primary' },
  'default': { icon: 'bi-receipt-cutoff', color: 'bg-secondary' }
};

function getCategoryMeta(category) {
  if (!category) return categoryMap['default'];
  const lower = category.toLowerCase();
  for (const key in categoryMap) {
    if (lower.includes(key)) return categoryMap[key];
  }
  const colors = ['bg-primary', 'bg-success', 'bg-danger', 'bg-warning text-dark', 'bg-info', 'bg-secondary'];
  const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return { icon: 'bi-tag-fill', color: colors[hash % colors.length] };
}

let expenseModalInstance = null;

/**
 * Initializes listeners for DOM elements related to the UI layer.
 */
export function setupUIEvents() {
  const modalElement = document.getElementById('expenseModal');
  if (modalElement) {
    expenseModalInstance = new bootstrap.Modal(modalElement);
    // Reset form every time the modal closes
    modalElement.addEventListener('hidden.bs.modal', resetForm);
  }
  
  const expenseForm = document.getElementById('expenseForm');
  if (expenseForm) {
    expenseForm.addEventListener('submit', handleTransactionSubmit);
  }
  
  const inlineInput = document.getElementById('inlineInput');
  if (inlineInput) {
    inlineInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (!val) return;
      const parts = val.split(',').map(p => p.trim());
      
      if (parts.length > 0 && parts[0]) {
        const dateMatch = parts[0].match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3];
          document.getElementById('inputDate').value = `${year}-${month}-${day}`;
        }
      }
      
      if (parts.length > 1 && parts[1]) {
        let amountStr = parts[1].replace(',', '.').replace(/[^\d\.\+\-]/g, '');
        const amountFloat = parseFloat(amountStr);
        if (!isNaN(amountFloat)) {
          document.getElementById('inputAmount').value = amountFloat;
        }
      }
      
      if (parts.length > 2 && parts[2]) {
        document.getElementById('inputDescription').value = parts.slice(2).join(', ');
      }
    });
  }
  
  const btnDelete = document.getElementById('btnDeleteTransactionModal');
  if (btnDelete) {
    btnDelete.addEventListener('click', () => {
      const id = document.getElementById('editTransactionId').value;
      if (id) {
        deleteTransaction(id);
        if (expenseModalInstance) expenseModalInstance.hide();
      }
    });
  }
  
  const inputCategory = document.getElementById('inputCategory');
  if (inputCategory) {
    inputCategory.addEventListener('change', handleCategoryChange);
  }

  // Home section links
  const linkToTransactions = document.getElementById('linkToTransactions');
  if (linkToTransactions) {
    linkToTransactions.addEventListener('click', () => {
      const tab = new bootstrap.Tab(document.getElementById('list-tab'));
      tab.show();
    });
  }
  const linkToAnalytics = document.getElementById('linkToAnalytics');
  if (linkToAnalytics) {
    linkToAnalytics.addEventListener('click', () => {
      const tab = new bootstrap.Tab(document.getElementById('analytics-tab'));
      tab.show();
    });
  }
  
  // Attach sorting events to sortable headers
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const column = th.getAttribute('data-sort');
      if (state.sort.column === column) {
        state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        state.sort.column = column;
        state.sort.direction = 'desc';
      }
      renderTransactions();
    });
  });

  const inputSearchTransaction = document.getElementById('inputSearchTransaction');
  const btnClearSearch = document.getElementById('btnClearSearch');
  if (inputSearchTransaction && btnClearSearch) {
    inputSearchTransaction.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      btnClearSearch.classList.toggle('d-none', !e.target.value);
      renderTransactions();
    });

    btnClearSearch.addEventListener('click', () => {
      inputSearchTransaction.value = '';
      state.searchQuery = '';
      btnClearSearch.classList.add('d-none');
      inputSearchTransaction.focus();
      renderTransactions();
    });
  }
}

/**
 * Toggles the main visibility between the landing screen and the app dashboard.
 */
export function renderApp() {
  const landingView = document.getElementById('landingView');
  const appView = document.getElementById('appView');
  const navActions = document.getElementById('navActions');
  const currentFileName = document.getElementById('currentFileName');
  
  if (state.fileName) {
    // A file is open
    landingView.classList.add('d-none');
    appView.classList.remove('d-none');
    navActions.classList.remove('d-none');
    currentFileName.textContent = state.fileName;
    
    populateCategoriesDropdown();
    renderTransactions();
    renderHomeSection();
  } else {
    // No file is open
    landingView.classList.remove('d-none');
    appView.classList.add('d-none');
    navActions.classList.add('d-none');
    currentFileName.textContent = 'No file opened';
    
    // Clear search input on close
    const inputSearch = document.getElementById('inputSearchTransaction');
    if (inputSearch) inputSearch.value = '';
    const btnClear = document.getElementById('btnClearSearch');
    if (btnClear) btnClear.classList.add('d-none');
  }
}

/**
 * Fills the category dropdown from the loaded JSON data.
 */
function populateCategoriesDropdown() {
  const select = document.getElementById('inputCategory');
  select.innerHTML = '<option value="" disabled selected>Select Category</option>';
  
  Object.keys(state.categories).forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
}

/**
 * Updates the subcategory dropdown based on the chosen category.
 */
function handleCategoryChange(e) {
  const category = e.target.value;
  const subSelect = document.getElementById('inputSubcategory');
  subSelect.innerHTML = '<option value="" disabled selected>Select Subcategory</option>';
  
  if (state.categories[category]) {
    state.categories[category].forEach(sub => {
      const opt = document.createElement('option');
      opt.value = sub;
      opt.textContent = sub;
      subSelect.appendChild(opt);
    });
  }
}

/**
 * Resets the modal form inputs back to defaults.
 */
function resetForm() {
  document.getElementById('expenseForm').reset();
  document.getElementById('editTransactionId').value = '';
  document.getElementById('inlineInput').value = '';
  document.getElementById('expenseModalLabel').textContent = 'Add Transaction';
  document.getElementById('inputSubcategory').innerHTML = '<option value="" disabled selected>Select Subcategory</option>';
  
  const btnDelete = document.getElementById('btnDeleteTransactionModal');
  if (btnDelete) btnDelete.classList.add('d-none');
}

function renderHomeSection() {
  const homeMetricDelta = document.getElementById('homeMetricDelta');
  const homeRecentTbody = document.getElementById('homeRecentTbody');
  
  // Calculate Net Delta
  let totalIncome = 0;
  let totalExpenses = 0;
  state.transactions.forEach(t => {
    if (t.Amount >= 0) totalIncome += t.Amount;
    else totalExpenses += Math.abs(t.Amount);
  });
  const netDelta = totalIncome - totalExpenses;
  
  // Update Delta Display
  if (homeMetricDelta) {
    homeMetricDelta.textContent = `${netDelta >= 0 ? '+' : '-'}€${Math.abs(netDelta).toFixed(2)}`;
    homeMetricDelta.className = netDelta >= 0 ? 'fw-bold my-3 text-success' : 'fw-bold my-3 text-danger';
  }
  
  // Render first 5 transactions
  if (homeRecentTbody) {
    homeRecentTbody.innerHTML = '';
    const recent = [...state.transactions]
      .sort((a, b) => new Date(b.Date) - new Date(a.Date))
      .slice(0, 5);
    
    recent.forEach((t) => {
      const tr = document.createElement('tr');
      const isIncome = t.Amount >= 0;
      const amountStr = isIncome ? `+${t.Amount.toFixed(2)} €` : `${t.Amount.toFixed(2)} €`;
      const amountClass = isIncome ? 'text-success fw-bold' : 'text-danger fw-bold';
      const meta = getCategoryMeta(t.Category);
      
      tr.className = 'mobile-row-click';
      tr.setAttribute('data-id', t.id);
      
      tr.innerHTML = `
        <!-- Desktop Layout -->
        <td class="d-none d-md-table-cell"><small class="text-muted">${formatDate(t.Date)}</small></td>
        <td class="d-none d-md-table-cell">${t.Description}</td>
        <td class="text-end d-none d-md-table-cell ${amountClass}">${amountStr}</td>
        
        <!-- Mobile Layout -->
        <td class="d-md-none mobile-visible w-100 p-0 border-0">
          <div class="d-flex align-items-center w-100 p-3">
            <div style="width: 50px;">
              <div class="category-icon shadow-sm ${meta.color} position-relative">
                <i class="bi ${meta.icon}"></i>
                <span class="position-absolute bottom-0 end-0 bg-success border border-white rounded-circle p-1" style="width: 14px; height: 14px; transform: translate(25%, 25%);">
                   <i class="bi bi-check text-white d-flex align-items-center justify-content-center" style="font-size: 8px; line-height: 1;"></i>
                </span>
              </div>
            </div>
            <div class="flex-grow-1 ms-3">
              <div class="fw-bold" style="font-size: 1.05rem;">${t.Description}</div>
              <div class="text-muted small">${t.Category}${t.Subcategory ? ' / ' + t.Subcategory : ''}</div>
              ${t.Notes ? `<div class="text-muted small">${t.Notes}</div>` : ''}
            </div>
            <div class="text-end">
              <div class="${amountClass}" style="font-size: 1.1rem;">${amountStr}</div>
              <div class="text-muted small mt-1">${formatDate(t.Date)}</div>
            </div>
          </div>
        </td>
      `;
      homeRecentTbody.appendChild(tr);
    });
    
    // Attach click listeners
    homeRecentTbody.querySelectorAll('.mobile-row-click').forEach(row => {
      row.addEventListener('click', () => editTransaction(row.getAttribute('data-id')));
    });
    
    if (recent.length === 0) {
      homeRecentTbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3 mobile-visible">No transactions yet</td></tr>';
    }
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Renders the transactions table in sorted order.
 */
export function renderTransactions() {
  const tbody = document.getElementById('transactionsTbody');
  const emptyState = document.getElementById('emptyState');
  const tableContainer = document.getElementById('transactionsTable').parentElement;
  
  let filteredTransactions = state.transactions;
  if (state.searchQuery) {
    filteredTransactions = state.transactions.filter(t => 
      t.Description.toLowerCase().includes(state.searchQuery)
    );
  }

  if (filteredTransactions.length === 0) {
    tableContainer.classList.add('d-none');
    emptyState.classList.remove('d-none');
  } else {
    tableContainer.classList.remove('d-none');
    emptyState.classList.add('d-none');
  }
  
  // Copy and sort the data based on current state parameters
  const sorted = [...filteredTransactions].sort((a, b) => {
    const col = state.sort.column;
    const dir = state.sort.direction === 'asc' ? 1 : -1;
    
    if (col === 'Amount') {
      return (a.Amount - b.Amount) * dir;
    } else if (col === 'Date') {
      const dateA = new Date(a.Date).getTime() || 0;
      const dateB = new Date(b.Date).getTime() || 0;
      return (dateA - dateB) * dir;
    } else {
      return (a[col] || '').localeCompare(b[col] || '') * dir;
    }
  });

  tbody.innerHTML = '';
  
  let lastDate = null;
  const isDateSorted = state.sort.column === 'Date';
  
  // Build and insert DOM rows
  sorted.forEach((t) => {
    if (isDateSorted && t.Date !== lastDate) {
      const headerTr = document.createElement('tr');
      headerTr.className = 'date-header-row d-md-none bg-transparent';
      headerTr.innerHTML = `
        <td colspan="8" class="p-3 pb-1 text-muted fw-bold small text-uppercase w-100 border-0" style="background: transparent;">
          ${formatDate(t.Date)}
        </td>
      `;
      tbody.appendChild(headerTr);
      lastDate = t.Date;
    }

    const tr = document.createElement('tr');
    tr.className = 'mobile-row-click';
    tr.setAttribute('data-id', t.id);
    
    const isIncome = t.Amount >= 0;
    const amountStr = isIncome ? `+${t.Amount.toFixed(2)} €` : `${t.Amount.toFixed(2)} €`;
    const amountClass = isIncome ? 'text-success fw-bold' : 'text-danger fw-bold';
    const meta = getCategoryMeta(t.Category);
    
    tr.innerHTML = `
      <!-- Desktop Layout -->
      <td class="d-none d-md-table-cell">${formatDate(t.Date)}</td>
      <td class="d-none d-md-table-cell ${amountClass}">${amountStr}</td>
      <td class="d-none d-md-table-cell">${t.Description}</td>
      <td class="d-none d-lg-table-cell"><span class="badge bg-secondary">${t.Category || 'Uncategorized'}</span></td>
      <td class="d-none d-lg-table-cell">${t.Subcategory}</td>
      <td class="d-none d-xl-table-cell">${t.Tags}</td>
      <td class="d-none d-xl-table-cell">${t.Notes}</td>
      <td class="text-end text-nowrap d-none d-md-table-cell">
        <button class="btn btn-sm btn-outline-primary me-1 btn-edit" data-id="${t.id}">Edit</button>
        <button class="btn btn-sm btn-outline-danger btn-del" data-id="${t.id}">Del</button>
      </td>
      
      <!-- Mobile Layout -->
      <td class="d-md-none mobile-visible w-100 p-0 border-0">
        <div class="d-flex align-items-center w-100 p-3">
          <div style="width: 50px;">
            <div class="category-icon shadow-sm ${meta.color} position-relative">
              <i class="bi ${meta.icon}"></i>
              <span class="position-absolute bottom-0 end-0 bg-success border border-white rounded-circle p-1" style="width: 14px; height: 14px; transform: translate(25%, 25%);">
                 <i class="bi bi-check text-white d-flex align-items-center justify-content-center" style="font-size: 8px; line-height: 1;"></i>
              </span>
            </div>
          </div>
          <div class="flex-grow-1 ms-3">
            <div class="fw-bold" style="font-size: 1.05rem;">${t.Description}</div>
            <div class="text-muted small">${t.Category}${t.Subcategory ? ' / ' + t.Subcategory : ''}</div>
            ${t.Notes ? `<div class="text-muted small">${t.Notes}</div>` : ''}
          </div>
          <div class="text-end">
            <div class="${amountClass}" style="font-size: 1.1rem;">${amountStr}</div>
            <div class="text-muted small mt-1">18:00</div>
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  // Mobile row click
  tbody.querySelectorAll('.mobile-row-click').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('button')) return; // Ignore if clicking a button inside (like desktop edit/del)
      editTransaction(row.getAttribute('data-id'));
    });
  });
  
  // Attach inline edit/delete listeners dynamically safely
  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      editTransaction(btn.getAttribute('data-id'));
    });
  });
  tbody.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTransaction(btn.getAttribute('data-id'));
    });
  });
  
  // Cascade update to Analytics when data changes
  renderAnalytics();
}

/**
 * Pre-fills the modal form to modify an existing transaction.
 */
function editTransaction(id) {
  const t = state.transactions.find(tx => tx.id === id);
  if (!t) return;
  
  document.getElementById('editTransactionId').value = t.id;
  document.getElementById('inputDate').value = t.Date;
  document.getElementById('inputAmount').value = t.Amount;
  document.getElementById('inputDescription').value = t.Description;
  
  const catSelect = document.getElementById('inputCategory');
  catSelect.value = t.Category;
  catSelect.dispatchEvent(new Event('change')); // Trigger population of subcategory dropdown
  
  document.getElementById('inputSubcategory').value = t.Subcategory;
  document.getElementById('inputTags').value = t.Tags;
  document.getElementById('inputNotes').value = t.Notes;
  
  document.getElementById('expenseModalLabel').textContent = 'Edit Transaction';
  
  const btnDelete = document.getElementById('btnDeleteTransactionModal');
  if (btnDelete) btnDelete.classList.remove('d-none');
  
  if (expenseModalInstance) expenseModalInstance.show();
}

/**
 * Removes a transaction by ID.
 */
function deleteTransaction(id) {
  if (confirm('Are you sure you want to delete this transaction?')) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    markUnsavedChanges();
    renderTransactions();
  }
}

/**
 * Handles saving standard or edited form inputs back to the state.
 */
function handleTransactionSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('editTransactionId').value;
  const DateVal = document.getElementById('inputDate').value;
  const Amount = parseFloat(document.getElementById('inputAmount').value) || 0;
  const Description = document.getElementById('inputDescription').value;
  const Category = document.getElementById('inputCategory').value || 'Uncategorized';
  const Subcategory = document.getElementById('inputSubcategory').value || '';
  const Tags = document.getElementById('inputTags').value;
  const Notes = document.getElementById('inputNotes').value;
  
  if (id) {
    // Perform Edit
    const index = state.transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      state.transactions[index] = { id, Date: DateVal, Amount, Description, Category, Subcategory, Tags, Notes };
    }
  } else {
    // Perform Add
    state.transactions.push({
      id: crypto.randomUUID(),
      Date: DateVal,
      Amount,
      Description,
      Category,
      Subcategory,
      Tags,
      Notes
    });
  }
  
  markUnsavedChanges();
  if (expenseModalInstance) expenseModalInstance.hide();
  
  renderTransactions();
}
