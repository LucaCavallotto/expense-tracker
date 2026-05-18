import { state } from './app.js';

let pieChartInstance = null;
let lineChartInstance = null;
let detailedShowAll = false;
let detailedIncomeShowAll = false;
let detailedTagsShowAll = false;

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
    
    // Attach Show More listener once
    const btnShowMore = document.getElementById('btnShowMoreCategories');
    if (btnShowMore) {
      btnShowMore.addEventListener('click', () => {
        detailedShowAll = !detailedShowAll;
        renderAnalytics();
      });
    }

    const btnShowMoreIncome = document.getElementById('btnShowMoreIncome');
    if (btnShowMoreIncome) {
      btnShowMoreIncome.addEventListener('click', () => {
        detailedIncomeShowAll = !detailedIncomeShowAll;
        renderAnalytics();
      });
    }

    const btnShowMoreTags = document.getElementById('btnShowMoreTags');
    if (btnShowMoreTags) {
      btnShowMoreTags.addEventListener('click', () => {
        detailedTagsShowAll = !detailedTagsShowAll;
        renderAnalytics();
      });
    }

    // Attach Delegation for Category Toggles
    const toggleDelegation = (e) => {
      const item = e.target.closest('.category-item');
      if (item) {
        const subList = item.querySelector('.subcategory-list');
        if (subList) {
          const isExpanded = subList.classList.toggle('show');
          item.classList.toggle('expanded', isExpanded);
        }
      }
    };
    
    const detailedList = document.getElementById('detailedCategoryList');
    if (detailedList) detailedList.addEventListener('click', toggleDelegation);
    
    const detailedIncomeList = document.getElementById('detailedIncomeList');
    if (detailedIncomeList) detailedIncomeList.addEventListener('click', toggleDelegation);
    
    const detailedTagsList = document.getElementById('detailedTagsList');
    if (detailedTagsList) detailedTagsList.addEventListener('click', toggleDelegation);

    periodListenerAttached = true;
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
  updateLineChart(state.transactions, periodLabel);
  updateComparisonMetrics(state.transactions);
  renderDetailedCategoryBreakdown(transactions, periodLabel);
  renderDetailedIncomeBreakdown(transactions, periodLabel);
  renderDetailedTagsBreakdown(transactions, periodLabel);
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
 * Creates or updates the cash flow trend line chart.
 */
function updateLineChart(transactions, periodLabel) {
  const ctx = document.getElementById('cashFlowLineChart').getContext('2d');
  
  if (lineChartInstance) {
    lineChartInstance.destroy();
  }

  // Group data by month
  const months = {};
  const now = new Date();
  
  // Initialize last 12 months
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months[key] = { income: 0, expenses: 0, label: d.toLocaleString('default', { month: 'short' }).toUpperCase() };
  }

  transactions.forEach(t => {
    const d = new Date(t.DateTime);
    if (isNaN(d)) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (months[key]) {
      if (t.Amount >= 0) months[key].income += t.Amount;
      else months[key].expenses += Math.abs(t.Amount);
    }
  });

  const sortedKeys = Object.keys(months).sort();
  const labels = sortedKeys.map(k => months[k].label);
  const incomeData = sortedKeys.map(k => months[k].income);
  const expenseData = sortedKeys.map(k => months[k].expenses);

  lineChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Total Income',
          data: incomeData,
          borderColor: '#28a745',
          backgroundColor: 'rgba(40, 167, 69, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#28a745'
        },
        {
          label: 'Total Expenses',
          data: expenseData,
          borderColor: '#dc3545',
          backgroundColor: 'rgba(220, 53, 69, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#dc3545'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` ${context.dataset.label}: €${context.raw.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.05)' }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

/**
 * Calculates and updates the monthly comparison metrics.
 */
function updateComparisonMetrics(transactions) {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  let currentTotal = 0;
  let prevTotal = 0;

  transactions.forEach(t => {
    if (t.Amount < 0) {
      const d = new Date(t.DateTime);
      if (isNaN(d)) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key === currentMonthKey) currentTotal += Math.abs(t.Amount);
      else if (key === prevMonthKey) prevTotal += Math.abs(t.Amount);
    }
  });

  const diff = currentTotal - prevTotal;
  const percent = prevTotal > 0 ? (diff / prevTotal * 100) : (currentTotal > 0 ? 100 : 0);
  const percentStr = `${diff >= 0 ? '+' : ''}${percent.toFixed(1)}%`;

  document.getElementById('metricCurrentMonth').innerHTML = `€${currentTotal.toFixed(2)} <span id="metricComparisonPercent" class="small ${diff > 0 ? 'text-danger' : 'text-success'}">(${percentStr})</span>`;
  document.getElementById('metricPrevMonth').textContent = `€${prevTotal.toFixed(2)}`;
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

/**
 * Renders the hierarchical list of categories and subcategories.
 */
function renderDetailedCategoryBreakdown(transactions, periodLabel) {
  const container = document.getElementById('detailedCategoryList');
  const footer = document.getElementById('detailedBreakdownFooter');
  const periodBadge = document.getElementById('detailedBreakdownPeriod');
  const subtitle = document.getElementById('detailedBreakdownSubtitle');
  
  if (!container) return;
  
  if (periodBadge) periodBadge.textContent = periodLabel;
  if (subtitle) subtitle.textContent = `(${periodLabel})`;

  // Aggregate data
  const data = {}; // { Category: { total: 0, subcategories: { Sub: 0 } } }
  let grandTotal = 0;

  transactions.forEach(t => {
    if (t.Amount < 0) {
      const absAmt = Math.abs(t.Amount);
      const cat = t.Category || 'Uncategorized';
      const sub = t.Subcategory || '(No Subcategory)';
      
      grandTotal += absAmt;
      
      if (!data[cat]) {
        data[cat] = { total: 0, subcategories: {} };
      }
      data[cat].total += absAmt;
      
      if (!data[cat].subcategories[sub]) {
        data[cat].subcategories[sub] = 0;
      }
      data[cat].subcategories[sub] += absAmt;
    }
  });

  // Sort categories by total descending
  const sortedCategories = Object.entries(data)
    .sort(([, a], [, b]) => b.total - a.total);

  const totalCount = sortedCategories.length;
  const displayCount = detailedShowAll ? totalCount : 5;
  const visibleCategories = sortedCategories.slice(0, displayCount);

  // Update Footer (Show More button)
  if (footer) {
    footer.classList.toggle('d-none', totalCount <= 5);
    const btn = footer.querySelector('button');
    if (btn) {
      btn.innerHTML = detailedShowAll 
        ? 'Show Less <i class="bi bi-chevron-up"></i>' 
        : `Show More (${totalCount - 5} others) <i class="bi bi-chevron-down"></i>`;
    }
  }

  if (totalCount === 0) {
    container.innerHTML = '<div class="p-4 text-center text-muted">No expenses recorded for this period.</div>';
    return;
  }

  // Render
  container.innerHTML = visibleCategories.map(([catName, catData]) => {
    const percentage = grandTotal > 0 ? (catData.total / grandTotal * 100).toFixed(1) : 0;
    
    // Sort subcategories by amount descending
    const sortedSubcats = Object.entries(catData.subcategories)
      .sort(([, a], [, b]) => b - a);

    const subcatsHtml = sortedSubcats.map(([subName, subAmt]) => `
      <div class="subcategory-item d-flex justify-content-between align-items-center">
        <span class="text-muted">${subName}</span>
        <span class="fw-semibold">€${subAmt.toFixed(2)}</span>
      </div>
    `).join('');

    return `
      <div class="category-item list-group-item p-0 border-bottom">
        <div class="category-header d-flex align-items-center">
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-start mb-1">
              <div>
                <span class="fw-bold d-block" style="font-size: 1.1rem;">${catName}</span>
                <span class="text-muted small">Total for ${periodLabel}</span>
              </div>
              <div class="text-end">
                <span class="category-amount-badge text-success" style="font-size: 1.1rem; font-weight: 700;">€${catData.total.toFixed(2)}</span>
                <div class="text-muted small">${percentage}%</div>
              </div>
            </div>
            <div class="category-progress">
              <div class="category-progress-bar" style="width: ${percentage}%"></div>
            </div>
          </div>
          <div class="ms-3">
            <i class="bi bi-chevron-down chevron-icon text-muted"></i>
          </div>
        </div>
        <div class="subcategory-list">
          ${subcatsHtml}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Renders the hierarchical list of income sources (categories).
 */
function renderDetailedIncomeBreakdown(transactions, periodLabel) {
  const container = document.getElementById('detailedIncomeList');
  const footer = document.getElementById('detailedIncomeFooter');
  const periodBadge = document.getElementById('detailedIncomePeriod');
  const subtitle = document.getElementById('detailedIncomeSubtitle');
  
  if (!container) return;
  
  if (periodBadge) periodBadge.textContent = periodLabel;
  if (subtitle) subtitle.textContent = `(${periodLabel})`;

  const data = {};
  let grandTotal = 0;

  transactions.forEach(t => {
    if (t.Amount > 0) {
      const amt = t.Amount;
      const cat = t.Category || 'Uncategorized';
      const sub = t.Subcategory || '(No Subcategory)';
      
      grandTotal += amt;
      
      if (!data[cat]) data[cat] = { total: 0, subcategories: {} };
      data[cat].total += amt;
      
      if (!data[cat].subcategories[sub]) data[cat].subcategories[sub] = 0;
      data[cat].subcategories[sub] += amt;
    }
  });

  const sortedCategories = Object.entries(data).sort(([, a], [, b]) => b.total - a.total);
  const totalCount = sortedCategories.length;
  const displayCount = detailedIncomeShowAll ? totalCount : 5;
  const visibleCategories = sortedCategories.slice(0, displayCount);

  if (footer) {
    footer.classList.toggle('d-none', totalCount <= 5);
    const btn = footer.querySelector('button');
    if (btn) {
      btn.innerHTML = detailedIncomeShowAll 
        ? 'Show Less <i class="bi bi-chevron-up"></i>' 
        : `Show More (${totalCount - 5} others) <i class="bi bi-chevron-down"></i>`;
    }
  }

  if (totalCount === 0) {
    container.innerHTML = '<div class="p-4 text-center text-muted">No income recorded for this period.</div>';
    return;
  }

  container.innerHTML = visibleCategories.map(([catName, catData]) => {
    const percentage = grandTotal > 0 ? (catData.total / grandTotal * 100).toFixed(1) : 0;
    
    const sortedSubcats = Object.entries(catData.subcategories).sort(([, a], [, b]) => b - a);
    const subcatsHtml = sortedSubcats.map(([subName, subAmt]) => `
      <div class="subcategory-item d-flex justify-content-between align-items-center">
        <span class="text-muted">${subName}</span>
        <span class="fw-semibold text-success">+€${subAmt.toFixed(2)}</span>
      </div>
    `).join('');

    return `
      <div class="category-item list-group-item p-0 border-bottom">
        <div class="category-header d-flex align-items-center">
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-start mb-1">
              <div>
                <span class="fw-bold d-block" style="font-size: 1.1rem;">${catName}</span>
                <span class="text-muted small">Total for ${periodLabel}</span>
              </div>
              <div class="text-end">
                <span class="category-amount-badge text-success" style="font-size: 1.1rem; font-weight: 700;">+€${catData.total.toFixed(2)}</span>
                <div class="text-muted small">${percentage}%</div>
              </div>
            </div>
            <div class="category-progress">
              <div class="category-progress-bar bg-success" style="width: ${percentage}%"></div>
            </div>
          </div>
          <div class="ms-3">
            <i class="bi bi-chevron-down chevron-icon text-muted"></i>
          </div>
        </div>
        <div class="subcategory-list">
          ${subcatsHtml}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Renders the list of tags and their total amounts.
 */
function renderDetailedTagsBreakdown(transactions, periodLabel) {
  const container = document.getElementById('detailedTagsList');
  const footer = document.getElementById('detailedTagsFooter');
  const periodBadge = document.getElementById('detailedTagsPeriod');
  const subtitle = document.getElementById('detailedTagsSubtitle');
  
  if (!container) return;
  
  if (periodBadge) periodBadge.textContent = periodLabel;
  if (subtitle) subtitle.textContent = `(${periodLabel})`;

  const data = {};
  let totalTaggedVolume = 0;

  transactions.forEach(t => {
    if (t.Tags && t.Tags.trim()) {
      const tags = t.Tags.split(/\s+/).map(tag => tag.trim()).filter(tag => tag);
      const absAmt = Math.abs(t.Amount);
      
      tags.forEach(tag => {
        if (!data[tag]) data[tag] = { net: 0, volume: 0, income: 0, expenses: 0 };
        data[tag].net += t.Amount;
        data[tag].volume += absAmt;
        if (t.Amount >= 0) data[tag].income += t.Amount;
        else data[tag].expenses += absAmt;
      });
    }
  });

  let sumOfAllTagVolumes = Object.values(data).reduce((acc, val) => acc + val.volume, 0);

  const sortedTags = Object.entries(data).sort(([, a], [, b]) => b.volume - a.volume);
  const totalCount = sortedTags.length;
  const displayCount = detailedTagsShowAll ? totalCount : 5;
  const visibleTags = sortedTags.slice(0, displayCount);

  if (footer) {
    footer.classList.toggle('d-none', totalCount <= 5);
    const btn = footer.querySelector('button');
    if (btn) {
      btn.innerHTML = detailedTagsShowAll 
        ? 'Show Less <i class="bi bi-chevron-up"></i>' 
        : `Show More (${totalCount - 5} others) <i class="bi bi-chevron-down"></i>`;
    }
  }

  if (totalCount === 0) {
    container.innerHTML = '<div class="p-4 text-center text-muted">No tags recorded for this period.</div>';
    return;
  }

  container.innerHTML = visibleTags.map(([tagName, tagData]) => {
    const percentage = sumOfAllTagVolumes > 0 ? (tagData.volume / sumOfAllTagVolumes * 100).toFixed(1) : 0;
    
    const subcatsHtml = `
      <div class="subcategory-item d-flex justify-content-between align-items-center">
        <span class="text-muted">Income</span>
        <span class="fw-semibold text-success">+€${tagData.income.toFixed(2)}</span>
      </div>
      <div class="subcategory-item d-flex justify-content-between align-items-center">
        <span class="text-muted">Expenses</span>
        <span class="fw-semibold text-danger">-€${tagData.expenses.toFixed(2)}</span>
      </div>
    `;

    const netClass = tagData.net >= 0 ? 'text-success' : 'text-danger';
    const netPrefix = tagData.net > 0 ? '+' : '';

    return `
      <div class="category-item list-group-item p-0 border-bottom">
        <div class="category-header d-flex align-items-center">
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-start mb-1">
              <div>
                <span class="fw-bold d-block" style="font-size: 1.1rem;"><i class="bi bi-tag-fill text-info me-1 small"></i>${tagName}</span>
                <span class="text-muted small">Net for ${periodLabel}</span>
              </div>
              <div class="text-end">
                <span class="category-amount-badge ${netClass}" style="font-size: 1.1rem; font-weight: 700;">${netPrefix}€${tagData.net.toFixed(2)}</span>
                <div class="text-muted small">${percentage}% of tagged vol</div>
              </div>
            </div>
            <div class="category-progress">
              <div class="category-progress-bar bg-info" style="width: ${percentage}%"></div>
            </div>
          </div>
          <div class="ms-3">
            <i class="bi bi-chevron-down chevron-icon text-muted"></i>
          </div>
        </div>
        <div class="subcategory-list">
          ${subcatsHtml}
        </div>
      </div>
    `;
  }).join('');
}
