import { state, clearUnsavedChanges } from './app.js';
import { renderApp, showStatusMessage } from './ui.js';

const REQUIRED_HEADERS = ["DateTime", "Amount", "Description", "Category", "Subcategory", "Tags", "Notes"];

/**
 * Loads the categories JSON asynchronously.
 */
export async function loadCategories() {
  try {
    const response = await fetch('data/categories.json');
    state.categories = await response.json();
  } catch (error) {
    console.error("Failed to load categories JSON:", error);
  }
}

/**
 * Connects file system related buttons and drop zone to their handlers.
 */
export function setupFileSystemEvents() {
  const btnCreateNewFile = document.getElementById('btnCreateNewFile');
  const btnOpenFile = document.getElementById('btnOpenFile');
  const dropZone = document.getElementById('dropZone');
  const btnSaveChanges = document.getElementById('btnSaveChanges');
  const btnCloseFile = document.getElementById('btnCloseFile');
  const btnUndoChanges = document.getElementById('btnUndoChanges');

  if (btnCreateNewFile) btnCreateNewFile.addEventListener('click', handleCreateNewFile);
  if (btnOpenFile) btnOpenFile.addEventListener('click', handleOpenFilePicker);
  if (btnSaveChanges) btnSaveChanges.addEventListener('click', saveFile);
  if (btnCloseFile) btnCloseFile.addEventListener('click', closeFile);
  if (btnUndoChanges) btnUndoChanges.addEventListener('click', undoChanges);

  // Global Drag & Drop events
  const globalOverlay = document.getElementById('globalDropOverlay');
  let dragCounter = 0;

  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    if (globalOverlay) globalOverlay.classList.remove('d-none');
  });

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      if (globalOverlay) globalOverlay.classList.add('d-none');
    }
  });

  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    dragCounter = 0;
    if (globalOverlay) globalOverlay.classList.add('d-none');

    if (state.hasUnsavedChanges) {
      if (!confirm("You have unsaved changes. Opening a new file will discard them. Continue?")) return;
    }

    if (e.dataTransfer.items) {
      const item = e.dataTransfer.items[0];
      if (item && item.kind === 'file') {
        if (item.getAsFileSystemHandle) {
          const fileHandle = await item.getAsFileSystemHandle();
          if (fileHandle && fileHandle.kind === 'file') {
            await openFileFromHandle(fileHandle);
          }
        } else {
          const file = item.getAsFile();
          if (file) {
            const text = await file.text();
            if (parseCSV(text)) {
              state.fileHandle = null;
              state.fileName = file.name;
              state.originalTransactions = JSON.parse(JSON.stringify(state.transactions));
              clearUnsavedChanges();
              renderApp();
            }
          }
        }
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const text = await file.text();
      if (parseCSV(text)) {
        state.fileHandle = null;
        state.fileName = file.name;
        state.originalTransactions = JSON.parse(JSON.stringify(state.transactions));
        clearUnsavedChanges();
        renderApp();
      }
    }
  });
}

/**
 * Creates a new file using the File System Access API.
 */
async function handleCreateNewFile() {
  try {
    if (window.showSaveFilePicker) {
      const opts = {
        types: [{
          description: 'CSV Files',
          accept: { 'text/csv': ['.csv'] },
        }],
      };
      // Prompt the user to select where to create the new CSV
      const fileHandle = await window.showSaveFilePicker(opts);
      state.fileHandle = fileHandle;
      state.fileName = fileHandle.name;
    } else {
      // Fallback for iOS / Unsupported browsers
      const fileName = prompt("Enter file name for your new CSV:", "expenses.csv");
      if (!fileName) return; // cancelled
      state.fileHandle = null;
      state.fileName = fileName.endsWith('.csv') ? fileName : fileName + '.csv';
    }
    state.transactions = []; // Empty since it's new
    state.originalTransactions = [];
    clearUnsavedChanges();
    renderApp();
  } catch (error) {
    console.error("File creation cancelled or failed", error);
  }
}

/**
 * Opens an existing file using the File System Access API.
 */
async function handleOpenFilePicker() {
  try {
    if (window.showOpenFilePicker) {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'CSV Files',
          accept: { 'text/csv': ['.csv'] },
        }],
      });
      await openFileFromHandle(fileHandle);
    } else {
      // Fallback for iOS / Unsupported browsers
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        if (parseCSV(text)) {
          state.fileHandle = null;
          state.fileName = file.name;
          state.originalTransactions = JSON.parse(JSON.stringify(state.transactions));
          clearUnsavedChanges();
          renderApp();
        }
      };
      input.click();
    }
  } catch (error) {
    console.error("File open cancelled or failed", error);
  }
}

/**
 * Core function to read file contents and parse them into state.
 */
async function openFileFromHandle(fileHandle) {
  state.fileHandle = fileHandle;
  state.fileName = fileHandle.name;

  const file = await fileHandle.getFile();
  const text = await file.text();

  if (parseCSV(text)) {
    state.originalTransactions = JSON.parse(JSON.stringify(state.transactions));
    clearUnsavedChanges();
    renderApp();
  }
}

/**
 * Parses the raw CSV text using PapaParse.
 */
function parseCSV(csvText) {
  // Remove BOM if present
  const cleanCsvText = csvText.replace(/^\uFEFF/, '');
  
  const results = Papa.parse(cleanCsvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(), // Trim headers to avoid hidden spaces
  });

  if (results.errors.length > 0) {
    console.error("PapaParse errors:", results.errors);
    alert("Error parsing CSV file. Please check the file format.");
    return false;
  }

  // Check headers
  const headers = results.meta.fields;
  const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
  
  if (missingHeaders.length > 0) {
    console.error("Missing headers:", missingHeaders);
    console.log("Found headers:", headers);
    alert(`Incompatible file! Missing required columns: ${missingHeaders.join(", ")}`);
    return false;
  }

  state.transactions = results.data.map((row, index) => {
    try {
      return {
        id: crypto.randomUUID(),
        DateTime: row.DateTime || '',
        Amount: parseFloat(row.Amount) || 0,
        Description: row.Description || '',
        Category: row.Category || '',
        Subcategory: row.Subcategory || '',
        Tags: row.Tags || '',
        Notes: row.Notes || ''
      };
    } catch (e) {
      console.error(`Error mapping row ${index}:`, e, row);
      return null;
    }
  }).filter(t => t !== null);

  console.log(`Successfully parsed ${state.transactions.length} transactions.`);
  return true;
}

/**
 * Writes the current state.transactions array back to the local file.
 */
export async function saveFile() {
  if (!state.fileHandle && !state.fileName) {
    alert("No file available to save.");
    return;
  }

  try {
    // Strip the internal 'id' before unparsing to CSV
    const dataToSave = state.transactions.map(t => {
      const { id, ...rest } = t;
      return rest;
    });

    // Explicitly order columns to match the required format
    const csvContent = Papa.unparse(dataToSave, {
      columns: ["DateTime", "Amount", "Description", "Category", "Subcategory", "Tags", "Notes"]
    });

    if (state.fileHandle && window.showSaveFilePicker) {
      const writable = await state.fileHandle.createWritable();
      await writable.write(csvContent);
      await writable.close();
      showStatusMessage("Changes saved successfully!");
    } else {
      // Fallback download for iOS / Unsupported browsers
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', state.fileName || 'expenses.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showStatusMessage("File downloaded!");
    }

    // Commit changes to original state
    state.originalTransactions = JSON.parse(JSON.stringify(state.transactions));

    clearUnsavedChanges();
    renderApp(); // Ensure UI is refreshed and remains in app view
  } catch (error) {
    console.error("Failed to save file", error);
    alert("Failed to save file. Ensure you have granted the necessary permissions.");
  }
}

/**
 * Clears the active file and resets the app state back to the landing view.
 */
function closeFile() {
  if (state.hasUnsavedChanges) {
    const confirmClose = confirm("You have unsaved changes. Are you sure you want to close the file?");
    if (!confirmClose) return;
  }

  state.fileHandle = null;
  state.fileName = '';
  state.transactions = [];
  state.originalTransactions = [];
  state.searchQuery = '';
  clearUnsavedChanges();
  renderApp();
}

/**
 * Restores the transactions to the original state when the file was opened or last saved.
 */
function undoChanges() {
  if (confirm("Are you sure you want to undo all unsaved changes?")) {
    state.transactions = JSON.parse(JSON.stringify(state.originalTransactions));
    clearUnsavedChanges();
    renderApp();
  }
}
