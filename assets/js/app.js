export const state = {
  fileHandle: null,
  fileName: '',
  transactions: [],
  originalTransactions: [], // To support Undo
  hasUnsavedChanges: false,
  categories: {},
  sort: { column: 'Date', direction: 'desc' },
  searchQuery: '',
  allTags: [],
  isSelectionMode: false,
  selectedIds: []
};

export function markUnsavedChanges() {
  state.hasUnsavedChanges = true;
  const warning = document.getElementById('unsavedWarning');
  if (warning) warning.classList.remove('d-none');
  const btnUndo = document.getElementById('btnUndoChanges');
  if (btnUndo) btnUndo.disabled = false;
}

export function clearUnsavedChanges() {
  state.hasUnsavedChanges = false;
  const warning = document.getElementById('unsavedWarning');
  if (warning) warning.classList.add('d-none');
  const btnUndo = document.getElementById('btnUndoChanges');
  if (btnUndo) btnUndo.disabled = true;
}

import { loadCategories, setupFileSystemEvents } from './fileSystem.js';
import { setupUIEvents } from './ui.js';

// Initialize the application once DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Load the hierarchical category structure
  await loadCategories();
  
  // Set up event listeners for file operations and UI interactions
  setupFileSystemEvents();
  setupUIEvents();

  // Prevent user from losing unsaved data on page close/refresh
  window.addEventListener('beforeunload', (e) => {
    if (state.hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = ''; // Standard way to trigger browser's close prompt
    }
  });
});
