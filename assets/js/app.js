export function isIOS() {
  return [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ].includes(navigator.platform) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
}

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
  selectedIds: [],
  viewOnlyMode: isIOS()
};

export function normalizeTags(tagsString) {
  if (!tagsString) return '';
  // Split by commas and/or any whitespace (covers both old and new formats)
  const parts = tagsString.split(/[\s,]+/);
  const cleanTags = [];
  parts.forEach(part => {
    // Remove all leading '#' characters to get the raw word
    let clean = part.replace(/^#+/, '').trim();
    if (clean) {
      // Ensure no spaces inside the tag name
      clean = clean.replace(/\s+/g, '');
      cleanTags.push('#' + clean);
    }
  });
  return [...new Set(cleanTags)].join(' ');
}


export function markUnsavedChanges() {
  state.hasUnsavedChanges = true;
  const warning = document.getElementById('unsavedWarning');
  if (warning) warning.classList.remove('d-none');
  
  const btnUndo = document.getElementById('btnUndoChanges');
  if (btnUndo) btnUndo.disabled = false;
  
  const btnSave = document.getElementById('btnSaveChanges');
  if (btnSave) btnSave.disabled = false;
}

export function clearUnsavedChanges() {
  state.hasUnsavedChanges = false;
  const warning = document.getElementById('unsavedWarning');
  if (warning) warning.classList.add('d-none');
  
  const btnUndo = document.getElementById('btnUndoChanges');
  if (btnUndo) btnUndo.disabled = true;
  
  const btnSave = document.getElementById('btnSaveChanges');
  if (btnSave) btnSave.disabled = true;
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

  // Prevent user from losing unsaved data or their active file session on page close/refresh
  window.addEventListener('beforeunload', (e) => {
    if (state.fileName || state.hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = ''; // Standard way to trigger browser's close prompt
    }
  });
});
