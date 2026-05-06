# Project Context: Expense Tracker

A modular, privacy-first, browser-based personal finance manager that interacts directly with local CSV files.

---

## Project Overview
**Expense Tracker** is a single-page application (SPA) designed to manage personal finances without cloud dependency. It leverages the **File System Access API** to read and write directly to the user's local disk, ensuring 100% data privacy. A `.gitignore` policy is in place to prevent accidental upload of any `.csv` files (except the provided `example_data.csv`).

**Core User Flow:**
1.  **Entry:** Create a new CSV or open/drag-and-drop an existing one.
2.  **Dashboard:** View net balance, recent activity, and categorical trends.
3.  **Operation:** Add transactions via manual form or **Quick Inline Entry** (bulk pasting).
4.  **Persistence:** Save changes back to the local CSV.

---

## Technical Stack

| Category | Technology | Usage |
| :--- | :--- | :--- |
| **Core** | HTML5 / JavaScript (ES6+) | Structure and Logic |
| **Styling** | Bootstrap 5.3.3 / CSS3 | Responsive UI and Design System |
| **Data Parsing** | [PapaParse 5.4.1](https://www.papaparse.com/) | CSV Reading and Writing |
| **Visualization** | [Chart.js 4.4.2](https://www.chartjs.org/) | Financial Analytics |
| **Icons** | Bootstrap Icons 1.11.3 | UI Component Decoration |
| **Native APIs** | File System Access API | Native Local File Management |

---

## Architecture
The project follows a modular ES6 design, separating concerns between state, UI rendering, and file I/O.

```text
├── assets/
│   ├── css/
│   │   └── style.css          # Design system, sticky footer, and layout overrides
│   └── js/
│       ├── app.js             # Central state management and lifecycle init
│       ├── ui.js              # DOM rendering logic and user event handlers
│       ├── fileSystem.js      # File System Access API abstraction & CSV logic
│       └── analytics.js       # Chart.js instances and data aggregation
├── data/
│   └── categories.json        # Hierarchical JSON for categories/subcategories
└── index.html                 # Main entry point and modal definitions
```

---

## Workflow & Rules

### 1. Local Development
- Open `index.html` via a local server (e.g., Live Server extension) or directly in a modern browser.
- Ensure the browser supports the **File System Access API** (Chrome/Edge/Safari 16.4+) for full functionality.

### 2. Coding Standards
- **Naming Conventions:**
    - JS: `camelCase` for variables/functions.
    - HTML: `kebab-case` for IDs and classes.
- **State Management:**
    - All shared data resides in the `state` object in `app.js`.
    - Always call `markUnsavedChanges()` after modifying `state.transactions`.
    - `viewOnlyMode` state controls UI visibility for editing elements and is auto-detected for mobile.
- **UI Logic:**
    - Separate pure data calculations from DOM manipulation where possible.
    - Use `renderApp()` as the main entry point to toggle visibility between Landing and App views.
    - `renderTransactions()` and `renderAnalytics()` handle the heavy lifting for data display.

### 3. Documentation & Commits
- Keep comments focused on "why" rather than "what."
- Commit messages should be concise and describe the functional change.

---

## Design System & UI
The app uses a **Premium Green** accent theme with a focus on rich aesthetics.

- **Typography:** Uses the `Inter` font family with system fallbacks.
- **Layout:** Sticky footer implemented via Flexbox (`html, body { height: 100% }`).
- **Styling:** 
    - Strictly **Vanilla CSS** + **Bootstrap 5 Utilities**. 
    - **Avoid Tailwind CSS** unless explicitly requested.
    - Custom variables are defined in `:root` for consistency.
- **Aesthetics:** Use subtle micro-animations and `box-shadow` on cards for a premium feel.

---

## CSV Data Schema
The program expects a specific column order for CSV compatibility:
`DateTime, Amount, Description, Category, Subcategory, Tags, Notes`

---

## Lessons Learned & Gotchas
- **File System API:** Requires a secure context (HTTPS or localhost) and explicit user activation (click event).
- **Sticky Footer:** Must wrap main content in a `<main>` tag with `flex: 1 0 auto` to work with the vertical flexbox body.
- **Bulk Parsing:** The `Quick Inline Entry` textarea uses `\n` splitting; ensure empty lines are filtered out to prevent parsing errors.
- **Date Handling:** `parseInlineDate` handles both standard `YYYY-MM-DD` and full ISO timestamps (detecting time automatically).
- **Mobile Compatibility:** File saving on iOS/iPadOS is restrictive; "View Only Mode" is used as a safety fallback to prevent confusing save prompts or accidental data loss on mobile devices.
- **Analytics Performance:** Hierarchical breakdowns use interactive "Show More" toggles to maintain performance and UI cleanliness when dealing with large numbers of categories or tags.
