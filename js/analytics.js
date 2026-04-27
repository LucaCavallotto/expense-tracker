import { state } from './app.js';

let pieChartInstance = null;
let barChartInstance = null;

/**
 * Reads application transactions, computes analytics, and updates charts and text summaries.
 */
export function renderAnalytics() {
  const transactions = state.transactions;
  
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
      
      // Categorize for pie chart
      if (categoryExpenses[t.Category]) {
        categoryExpenses[t.Category] += absAmt;
      } else {
        categoryExpenses[t.Category] = absAmt;
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
  updatePieChart(categoryExpenses);
  updateBarChart(totalIncome, totalExpenses);
}

/**
 * Creates or updates the breakdown of expenses by category (Pie Chart).
 */
function updatePieChart(categoryExpenses) {
  const ctx = document.getElementById('categoryPieChart').getContext('2d');
  const labels = Object.keys(categoryExpenses);
  const data = Object.values(categoryExpenses);
  
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
        }
      }
    }
  });
}

/**
 * Creates or updates the overview bar chart displaying Total Income vs Total Expenses.
 */
function updateBarChart(totalIncome, totalExpenses) {
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
      labels: ['Overview'],
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
