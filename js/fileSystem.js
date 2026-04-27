import { state, clearUnsavedChanges } from './app.js';
import { renderApp } from './ui.js';

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

  // Set up Drag & Drop events for the landing view
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.items) {
        const item = e.dataTransfer.items[0];
        if (item.kind === 'file') {
          const fileHandle = await item.getAsFileSystemHandle();
          if (fileHandle && fileHandle.kind === 'file') {
            await openFileFromHandle(fileHandle);
          }
        }
      }
    });
  }
}

/**
 * Creates a new file using the File System Access API.
 */
async function handleCreateNewFile() {
  try {
    const opts = {
      types: [{
        description: 'CSV Files',
        accept: {'text/csv': ['.csv']},
      }],
    };
    // Prompt the user to select where to create the new CSV
    const fileHandle = await window.showSaveFilePicker(opts);
    state.fileHandle = fileHandle;
    state.fileName = fileHandle.name;
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
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{
        description: 'CSV Files',
        accept: {'text/csv': ['.csv']},
      }],
    });
    await openFileFromHandle(fileHandle);
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
  
  parseCSV(text);
  // parseCSV is async because PapaParse might be, but here it's sync. 
  // Let's ensure originalTransactions is set after parsing.
  state.originalTransactions = JSON.parse(JSON.stringify(state.transactions));
  
  clearUnsavedChanges();
  renderApp();
}

/**
 * Parses the raw CSV text using PapaParse.
 */
function parseCSV(csvText) {
  // Columns expected: Date, Amount, Description, Category, Subcategory, Tags, Notes
  Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      state.transactions = results.data.map(row => ({
        id: crypto.randomUUID(), // Assign unique runtime ID
        Date: row.Date || '',
        Amount: parseFloat(row.Amount) || 0,
        Description: row.Description || '',
        Category: row.Category || '',
        Subcategory: row.Subcategory || '',
        Tags: row.Tags || '',
        Notes: row.Notes || ''
      }));
    }
  });
}

/**
 * Writes the current state.transactions array back to the local file.
 */
export async function saveFile() {
  if (!state.fileHandle) {
    alert("No file handle available to save.");
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
      columns: ["Date", "Amount", "Description", "Category", "Subcategory", "Tags", "Notes"]
    });
    
    const writable = await state.fileHandle.createWritable();
    await writable.write(csvContent);
    await writable.close();
    
    // Commit changes to original state
    state.originalTransactions = JSON.parse(JSON.stringify(state.transactions));
    
    clearUnsavedChanges();
    alert("Changes saved successfully!");
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
