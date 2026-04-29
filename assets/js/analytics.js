import { state } from './app.js';

let pieChartInstance = null;
let barChartInstance = null;

let periodListenerAttached = false;

/**
 * Reads application transactions, computes analytics, and updates charts and text summaries.
 */
export function renderAnalytics() {
  if (!periodListenerAttached) {
    const periodSelect = document.getElementById('analyticsTimePeriod');
    const monthSelect = document.getElementById('analyticsSpecificMonth');
    if (periodSelect) {
      periodSelect.addEventListener('change', () => {
        handlePeriodChange();
        renderAnalytics();
      });
      periodListenerAttached = true;
    }
    if (monthSelect) {
      monthSelect.addEventListener('change', renderAnalytics);
    }
  }

  const periodSelect = document.getElementById('analyticsTimePeriod');
  const period = periodSelect ? periodSelect.value : 'overall';
  const monthSelect = document.getElementById('analyticsSpecificMonth');
  
  let transactions = state.transactions;
  let periodLabel = 'Overall';

  // Filter based on period
  if (period !== 'overall') {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    transactions = state.transactions.filter(t => {
      const tDate = new Date(t.DateTime);
      if (isNaN(tDate)) return false;

      if (period === 'current_month') {
        periodLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });
        return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      } else if (period === 'specific_month') {
        const selectedVal = monthSelect.value; // format "YYYY-MM"
        if (!selectedVal) return true;
        const [y, m] = selectedVal.split('-').map(Number);
        periodLabel = new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
        return tDate.getFullYear() === y && (tDate.getMonth() + 1) === m;
      } else {
        let monthsBack = 0;
        if (period === 'last_3_months') monthsBack = 3;
        else if (period === 'last_6_months') monthsBack = 6;
        else if (period === 'last_12_months') monthsBack = 12;
        
        periodLabel = `Last ${monthsBack} Months`;
        const cutoffDate = new Date();
        cutoffDate.setMonth(now.getMonth() - monthsBack);
        return tDate >= cutoffDate;
      }
    });
  }
  
  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryExpenses = {};
  
  // Aggregate calculations
  transactions.forEach(t => {
    if (t.Amount >= 0) {
      totalIncome += t.Amount;
    } else {
      const absAmt = Math.abs(t.Amount);
      totalExpenses += absAmt;
      
      // Categorize for pie chart - skip if category is empty
      if (t.Category && t.Category.trim()) {
        if (categoryExpenses[t.Category]) {
          categoryExpenses[t.Category] += absAmt;
        } else {
          categoryExpenses[t.Category] = absAmt;
        }
      }
    }
  });
  
  const netDelta = totalIncome - totalExpenses;
  
  // Update numerical metrics on the dashboard
  document.getElementById('metricIncome').textContent = `€${totalIncome.toFixed(2)}`;
  document.getElementById('metricExpenses').textContent = `€${totalExpenses.toFixed(2)}`;
  
  const metricDelta = document.getElementById('metricDelta');
  metricDelta.textContent = `${netDelta >= 0 ? '+' : '-'}€${Math.abs(netDelta).toFixed(2)}`;
  
  // Style delta based on positive or negative standing
  if (netDelta >= 0) {
    metricDelta.className = 'card-text fw-bold text-success';
  } else {
    metricDelta.className = 'card-text fw-bold text-danger';
  }
  
  // Redraw charts with updated metrics
  const categoryTitle = document.querySelector('#categoryPieChart').closest('.card').querySelector('.card-title');
  if (categoryTitle) {
    categoryTitle.textContent = `Expenses by Category (${periodLabel})`;
  }

  updatePieChart(categoryExpenses);
  updateBarChart(totalIncome, totalExpenses, periodLabel);
}

/**
 * Creates or updates the breakdown of expenses by category (Pie Chart).
 */
function updatePieChart(categoryExpenses) {
  const ctx = document.getElementById('categoryPieChart').getContext('2d');
  
  // Sort categories by amount descending and take the top 5
  const topCategories = Object.entries(categoryExpenses)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
    
  const labels = topCategories.map(([cat]) => cat);
  const data = topCategories.map(([, amt]) => amt);
  
  if (pieChartInstance) {
    pieChartInstance.destroy();
  }
  
  // Aesthetically pleasing dynamic color generation via the golden angle
  const backgroundColors = labels.map((_, i) => {
    const hue = (i * 137.508) % 360; 
    return `hsl(${hue}, 60%, 50%)`;
  });
  
  pieChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors,
        borderWidth: 1,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return ` ${label}: €${value.toFixed(2)} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

/**
 * Creates or updates the overview bar chart displaying Total Income vs Total Expenses.
 */
function updateBarChart(totalIncome, totalExpenses, periodLabel) {
  const ctx = document.getElementById('incomeVsExpenseChart').getContext('2d');
  
  if (barChartInstance) {
    barChartInstance.destroy();
  }
  
  // Determine standard Bootstrap CSS variables or fallback strings for charts
  const greenAcc = '#28a745';
  const redAcc = '#dc3545';
  
  barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [periodLabel],
      datasets: [
        {
          label: 'Total Income',
          data: [totalIncome],
          backgroundColor: greenAcc,
          borderRadius: 4
        },
        {
          label: 'Total Expenses',
          data: [totalExpenses],
          backgroundColor: redAcc,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0,0,0,0.05)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

/**
 * Handles showing/hiding additional controls when the time period changes.
 */
function handlePeriodChange() {
  const period = document.getElementById('analyticsTimePeriod').value;
  const monthContainer = document.getElementById('monthSelectContainer');
  
  if (period === 'specific_month') {
    populateAvailableMonths();
    monthContainer.classList.remove('d-none');
  } else {
    monthContainer.classList.add('d-none');
  }
}

/**
 * Scans transactions to find all unique months and populates the specific month dropdown.
 */
function populateAvailableMonths() {
  const monthSelect = document.getElementById('analyticsSpecificMonth');
  if (!monthSelect) return;
  
  // Find unique months
  const months = new Set();
  state.transactions.forEach(t => {
    if (t.DateTime) {
      const date = new Date(t.DateTime);
      if (!isNaN(date)) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(key);
      }
    }
  });
  
  // Sort descending
  const sortedMonths = Array.from(months).sort().reverse();
  
  const currentSelection = monthSelect.value;
  monthSelect.innerHTML = '';
  
  sortedMonths.forEach(m => {
    const [year, month] = m.split('-');
    const date = new Date(year, month - 1);
    const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = label;
    monthSelect.appendChild(opt);
  });
  
  // Try to restore selection or default to first
  if (currentSelection && sortedMonths.includes(currentSelection)) {
    monthSelect.value = currentSelection;
  }
}
