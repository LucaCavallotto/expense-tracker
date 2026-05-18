# Personal Expense Tracker

A modular, browser-based personal finance manager that works directly with your local CSV files. This application puts you in control of your data—no cloud required, no sign-ups, just privacy-focused financial tracking.

## Key Features

- **Direct File Access:** Uses the modern File System Access API to open and save CSV files directly to your device.
- **View Only Mode:** Automatically protects data on mobile devices (iOS/iPadOS) where file saving is restrictive, with a manual lock toggle for desktop users.
- **Bulk Entry:** Smart "Quick Inline Entry" supports pasting multiple transactions at once (e.g., from bank statements).
- **Responsive Dashboard:** View your current net delta and monthly spend comparisons at a glance.
- **Comprehensive Analytics:** Detailed hierarchical breakdowns for Spending, Income, and Tags with interactive "Show More" functionality.
- **Advanced Search & Sorting:** Quickly find transactions by description or sort by any column.
- **Dark Mode Support:** Automatically syncs with your system's light/dark preference.

## Project Structure

```text
├── assets/
│   ├── css/        # Custom styling
│   └── js/         # Application logic (App, UI, File System, Analytics)
├── data/           # Categorization configuration
└── index.html      # Main application entry point
```

## How to Use

### 1. Getting Started
Simply open the `index.html` file in any modern web browser.
- **New Users:** Click **"Create New File"** to generate a fresh expense CSV on your computer.
- **Trial:** You can also use the included `demo.csv` to explore the app's features immediately.
- **Existing Users:** Click **"Browse Files"** or simply **Drag & Drop** your existing CSV anywhere on the screen.

### 2. Adding Transactions
There are two ways to add expenses:
- **Manual Form:** Click **"+ Add Expense"** to fill out a detailed form including Category, Subcategory, Tags, and Notes.
- **Quick Inline Entry:** Located at the top of the Add Expense modal. You can paste one or many lines using the format:
  `YYYY-MM-DD, Amount, Description`
  *Example:* `2026-04-28, -25.50, Groceries`
  *(ISO timestamps with time/date are also supported).*

### 3. Managing Data
- **Saving:** Changes are kept in memory until you click **"Save Changes"** in the top navbar. This updates your local file.
- **Undo:** If you made a mistake before saving, use the **"Undo Changes"** button to revert to the last saved state.
- **Searching:** Use the search bar in the Transactions tab to filter by description.

### 4. Categorization
Categories and subcategories are loaded from `data/categories.json`. You can customize this file to match your personal spending habits.

The application expects a CSV file with the following header and column order:

`DateTime, Amount, Description, Category, Subcategory, Tags, Notes`

- **DateTime:** (Required) ISO 8601 format (e.g., `2026-04-29T13:00:00+02:00`).
- **Amount:** (Required) Numeric value. Use negative for expenses and positive for income.
- **Description:** (Required) A brief text about the transaction.
- **Category / Subcategory:** Used for organization and filtering.
- **Tags:** Space-separated labels starting with `#` (e.g., `#holiday #travel`).
- **Notes:** Additional multi-line text details.

When you use **"Create New File"**, the app automatically generates a file with these headers for you.

This application is entirely client-side. Your financial data never leaves your computer and is never uploaded to any server. All processing happens locally in your browser.

**Privacy Note:** The project includes a `.gitignore` rule that prevents any CSV files (except the provided `demo.csv`) from being uploaded to Git repositories, providing an extra layer of protection for your personal data.

---
*"Cash Rules Everything Around Me"*
