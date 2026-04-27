import { state, markUnsavedChanges } from './app.js';
import { renderAnalytics } from './analytics.js';

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
}

/**
 * Toggles the main visibility between the landing screen and the app dashboard.
 */
export function renderApp() {
  const landingView = document.getElementById('landingView');
  const appView = document.getElementById('appView');
  const navActions = document.getElementById('navActions');
  const currentFileName = document.getElementById('currentFileName');
  
  if (state.fileHandle) {
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
  document.getElementById('expenseModalLabel').textContent = 'Add Transaction';
  document.getElementById('inputSubcategory').innerHTML = '<option value="" disabled selected>Select Subcategory</option>';
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
    const recent = state.transactions.slice(0, 5);
    
    recent.forEach(t => {
      const tr = document.createElement('tr');
      const isIncome = t.Amount >= 0;
      const amountStr = isIncome ? `+€${t.Amount.toFixed(2)}` : `-€${Math.abs(t.Amount).toFixed(2)}`;
      
      tr.innerHTML = `
        <td><small class="text-muted">${formatDate(t.Date)}</small></td>
        <td>${t.Description}</td>
        <td class="text-end ${isIncome ? 'text-success' : 'text-danger'}">${amountStr}</td>
      `;
      homeRecentTbody.appendChild(tr);
    });
    
    if (recent.length === 0) {
      homeRecentTbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3">No transactions yet</td></tr>';
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
  
  if (state.transactions.length === 0) {
    tableContainer.classList.add('d-none');
    emptyState.classList.remove('d-none');
  } else {
    tableContainer.classList.remove('d-none');
    emptyState.classList.add('d-none');
  }
  
  // Copy and sort the data based on current state parameters
  const sorted = [...state.transactions].sort((a, b) => {
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
  
  // Build and insert DOM rows
  sorted.forEach(t => {
    const tr = document.createElement('tr');
    
    const isIncome = t.Amount >= 0;
    const amountStr = isIncome ? `+€${t.Amount.toFixed(2)}` : `-€${Math.abs(t.Amount).toFixed(2)}`;
    const amountClass = isIncome ? 'text-success fw-bold' : 'text-danger fw-bold';
    
    tr.innerHTML = `
      <td>${formatDate(t.Date)}</td>
      <td class="${amountClass}">${amountStr}</td>
      <td>${t.Description}</td>
      <td><span class="badge bg-secondary">${t.Category}</span></td>
      <td>${t.Subcategory}</td>
      <td>${t.Tags}</td>
      <td>${t.Notes}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary me-1 btn-edit" data-id="${t.id}">Edit</button>
        <button class="btn btn-sm btn-outline-danger btn-del" data-id="${t.id}">Del</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  // Attach inline edit/delete listeners dynamically safely
  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => editTransaction(btn.getAttribute('data-id')));
  });
  tbody.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', () => deleteTransaction(btn.getAttribute('data-id')));
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
  const Category = document.getElementById('inputCategory').value;
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
