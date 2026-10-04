let transactions = [
    { id: 1, date: "2025-01-15", amount: -440, status: "Success", type: 'expense' },
    { id: 2, date: "2025-01-10", amount: -440, status: "Success", type: 'expense' },
    { id: 3, date: "2025-01-18", amount: -440, status: "Success", type: 'expense' }
];

let monthlyIncome = 2645;
let monthlyExpenses = 189;

const today = new Date().toISOString().split('T')[0];

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('incomeDate').value = today;
    document.getElementById('expenseDate').value = today;
    updateTransactionsTable();
});

function openIncomeModel() {
    document.getElementById('incomeModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function openExpenseModel() {
    document.getElementById('expenseModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModel(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = 'auto';

    if (modalId === 'incomeModal') {
        document.getElementById('incomeForm').reset();
        document.getElementById('incomeDate').value = today;
    } else if (modalId === 'expenseModal') {
        document.getElementById('expenseForm').reset();
        document.getElementById('expenseDate').value = today;
    }
}

window.onclick = function (event) {
    const incomeModal = document.getElementById('incomeModal');
    const expenseModal = document.getElementById('expenseModal');

    if (event.target === incomeModal) {
        closeModel('incomeModal');
    }
    if (event.target === expenseModal) {
        closeModel('expenseModal');
    }
}

function addIncome() {
    const amount = parseFloat(document.getElementById('incomeAmount').value);
    const category = document.getElementById('incomeCategory').value;
    const description = document.getElementById('incomeDescription').value;
    const date = document.getElementById('incomeDate').value;

    if (!amount || !category || !date) {
        alert('Please fill in all required fields');
        return;
    }

    const newTransaction = {
        id: transactions.length + 1,
        date: date,
        category: category.charAt(0).toUpperCase() + category.slice(1),
        amount: amount,
        status: 'success',
        type: 'income',
        description: description,
    };
    transactions.unshift(newTransaction);

    monthlyIncome += amount;
    updateDashboard();
    updateTransactionsTable();

    closeModel('incomeModal');
    showNotification('Income added successfully', 'success');
}

function addExpense() {
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const category = document.getElementById('expenseCategory').value;
    const description = document.getElementById('expenseDescription').value;
    const date = document.getElementById('expenseDate').value;

    if (!amount || !category || !date) {
        alert('Please fill in all required fields');
        return;
    }

    const newTransaction = {
        id: transactions.length + 1,
        date: date,
        category: category.charAt(0).toUpperCase() + category.slice(1),
        amount: -amount,
        status: 'success',
        type: 'expense',
        description: description,
    };
    transactions.unshift(newTransaction);

    monthlyExpenses += amount;
    updateDashboard();
    updateTransactionsTable();

    closeModel('expenseModal');
    showNotification('Expense added successfully', 'success');
}

function updateDashboard() {
    document.querySelector('.income-amount').textContent = `$${monthlyIncome.toLocaleString()}.00`;
    document.querySelector('.expense-amount').textContent = `$${monthlyExpenses.toLocaleString()}.00`;

    let spendingLimit = 12645;
    const percentage = (monthlyExpenses / spendingLimit) * 100;

    document.querySelector('.spending-limit').textContent = `$${(spendingLimit - monthlyExpenses).toLocaleString()}.00`;
    document.querySelector('.progress-fill').style.width = `${Math.min(percentage, 100)}%`;
}

function updateTransactionsTable() {
    const tbody = document.querySelector('.transactions-table tbody');
    tbody.innerHTML = '';

    transactions.slice(0, 10).forEach((t) => {
        const row = document.createElement('tr');
        const formattedDate = new Date(t.date).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });

        const amountDisplay = t.amount > 0
            ? `+$${t.amount.toLocaleString()}.00`
            : `-$${Math.abs(t.amount).toLocaleString()}.00`;

        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${t.category}</td>
            <td style="color: ${t.amount > 0 ? '#10b981' : '#ef4444'}">${amountDisplay}</td> 
            <td><span class="status-success">${t.status}</span></td>
            <td><button class="action-btn"><i class="fas fa-ellipsis-h"></i></button></td>
        `;
        tbody.appendChild(row);
    });
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1001;
        animation: slideInRight 0.3s ease;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => { document.body.removeChild(notification); }, 300);
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight{ from{transform: translateX(100%); opacity: 0;} to {transform: translateX(0); opacity: 1;} }
    @keyframes slideOutRight{ from{transform: translateX(0); opacity: 1;} to {transform: translateX(100%); opacity: 0;} }
`;
document.head.appendChild(style);

// ─── PDF EXPORT — paste this into your script.js, or include as a separate <script> ───
// Also add this to your <head> in index.html:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>

function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const W = 210;
    const gold = [201, 168, 76];
    const goldDim = [138, 111, 46];
    const goldLight = [240, 208, 128];
    const bgDark = [9, 9, 11];
    const bgCard = [17, 17, 20];
    const bgRaised = [24, 24, 28];
    const textMain = [240, 237, 232];
    const textMuted = [138, 136, 128];
    const greenCol = [34, 197, 94];
    const redCol = [239, 68, 68];
    const white = [255, 255, 255];

    // ── COVER BACKGROUND ──
    doc.setFillColor(...bgDark);
    doc.rect(0, 0, W, 297, 'F');

    // ── HEADER GOLD BAR ──
    doc.setFillColor(...bgCard);
    doc.rect(0, 0, W, 52, 'F');

    // Gold accent line
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);
    doc.line(0, 52, W, 52);

    // Decorative gold corner squares
    doc.setFillColor(...gold);
    doc.rect(0, 0, 3, 3, 'F');
    doc.rect(W - 3, 0, 3, 3, 'F');

    // Left gold bar accent
    doc.setFillColor(...goldDim);
    doc.rect(0, 0, 1.5, 52, 'F');

    // ── LOGO / TITLE ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...goldLight);
    doc.text('VAULT', 14, 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text('FINANCIAL REPORT', 14, 29);

    // Gold diamond icon (◈) before title
    doc.setFontSize(16);
    doc.setTextColor(...gold);
    doc.text('◈', 37, 22);

    // ── DATE INFO (right side of header) ──
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text('GENERATED', W - 14, 17, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...goldLight);
    doc.text(dateStr, W - 14, 23, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text(timeStr, W - 14, 29, { align: 'right' });

    // ── REPORT TITLE BELOW HEADER ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...textMain);
    doc.text('Transaction Statement', 14, 64);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text('Complete record of all income and expenses', 14, 70);

    // ── SUMMARY CARDS ROW ──
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
    const netBalance = totalIncome - totalExpenses;

    const cards = [
        { label: 'TOTAL INCOME', value: `$${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: greenCol },
        { label: 'TOTAL EXPENSES', value: `$${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: redCol },
        { label: 'NET BALANCE', value: `$${netBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: netBalance >= 0 ? goldLight : redCol },
    ];

    const cardW = 56;
    const cardGap = 7;
    const cardStartX = 14;
    const cardY = 78;

    cards.forEach((card, i) => {
        const x = cardStartX + i * (cardW + cardGap);

        // Card bg
        doc.setFillColor(...bgCard);
        doc.roundedRect(x, cardY, cardW, 24, 2, 2, 'F');

        // Gold left accent line
        doc.setFillColor(...goldDim);
        doc.rect(x, cardY, 1.5, 24, 'F');

        // Top border
        doc.setDrawColor(...gold);
        doc.setLineWidth(0.3);
        doc.line(x, cardY, x + cardW, cardY);

        // Label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(...textMuted);
        doc.text(card.label, x + 5, cardY + 8);

        // Value
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...card.color);
        doc.text(card.value, x + 5, cardY + 18);
    });

    // Transaction count card (4th)
    const countX = cardStartX + 3 * (cardW + cardGap);
    doc.setFillColor(...bgCard);
    doc.roundedRect(countX, cardY, cardW, 24, 2, 2, 'F');
    doc.setFillColor(...goldDim);
    doc.rect(countX, cardY, 1.5, 24, 'F');
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.3);
    doc.line(countX, cardY, countX + cardW, cardY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...textMuted);
    doc.text('TRANSACTIONS', countX + 5, cardY + 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...gold);
    doc.text(`${transactions.length}`, countX + 5, cardY + 18);

    // ── SECTION DIVIDER ──
    const tableTop = cardY + 34;

    doc.setFillColor(...bgCard);
    doc.rect(0, tableTop - 4, W, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...gold);
    doc.text('● TRANSACTION HISTORY', 14, tableTop + 2);
    doc.setTextColor(...textMuted);
    doc.text(`${transactions.length} entries`, W - 14, tableTop + 2, { align: 'right' });
    doc.setDrawColor(...goldDim);
    doc.setLineWidth(0.3);
    doc.line(0, tableTop + 6, W, tableTop + 6);

    // ── TRANSACTIONS TABLE ──
    const rows = transactions.map(t => {
        const d = new Date(t.date);
        const dateFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const amtRaw = t.amount;
        const amtDisplay = amtRaw >= 0
            ? `+$${amtRaw.toFixed(2)}`
            : `-$${Math.abs(amtRaw).toFixed(2)}`;
        return [
            dateFormatted,
            t.category || '—',
            t.description || '—',
            t.type.charAt(0).toUpperCase() + t.type.slice(1),
            amtDisplay,
            t.status.charAt(0).toUpperCase() + t.status.slice(1),
        ];
    });

    doc.autoTable({
        startY: tableTop + 9,
        head: [['DATE', 'CATEGORY', 'DESCRIPTION', 'TYPE', 'AMOUNT', 'STATUS']],
        body: rows,
        theme: 'plain',
        styles: {
            font: 'helvetica',
            fontSize: 8,
            cellPadding: { top: 3.5, right: 4, bottom: 3.5, left: 4 },
            textColor: textMuted,
            lineColor: [30, 30, 34],
            lineWidth: 0.2,
            fillColor: bgDark,
        },
        headStyles: {
            fontSize: 6.5,
            fontStyle: 'bold',
            textColor: goldDim,
            fillColor: bgCard,
            lineColor: goldDim,
            lineWidth: 0.3,
        },
        alternateRowStyles: {
            fillColor: bgCard,
        },
        columnStyles: {
            0: { cellWidth: 26 },
            1: { cellWidth: 30 },
            2: { cellWidth: 55 },
            3: { cellWidth: 22 },
            4: { cellWidth: 30, fontStyle: 'bold' },
            5: { cellWidth: 22 },
        },
        didParseCell(data) {
            // Colour the Amount column
            if (data.column.index === 4 && data.section === 'body') {
                const val = data.cell.raw;
                data.cell.styles.textColor = val.startsWith('+') ? greenCol : redCol;
            }
            // Colour the Type column
            if (data.column.index === 3 && data.section === 'body') {
                data.cell.styles.textColor = data.cell.raw === 'Income' ? greenCol : [239, 100, 100];
            }
            // Status pill colour
            if (data.column.index === 5 && data.section === 'body') {
                data.cell.styles.textColor = greenCol;
            }
        },
        didDrawRow(data) {
            if (data.section !== 'body') return;
            // Left gold accent on every row
            doc.setFillColor(...goldDim);
            doc.rect(data.row.cells[0].x, data.row.cells[0].y, 0.8, data.row.height, 'F');
        },
        margin: { left: 14, right: 14 },
    });

    // ── FOOTER ──
    const pageCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        const pageH = doc.internal.pageSize.height;

        // Footer bg
        doc.setFillColor(...bgCard);
        doc.rect(0, pageH - 14, W, 14, 'F');
        doc.setDrawColor(...goldDim);
        doc.setLineWidth(0.3);
        doc.line(0, pageH - 14, W, pageH - 14);

        // Left: branding
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...goldDim);
        doc.text('VAULT — Financial Dashboard', 14, pageH - 5);

        // Center: confidential
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textMuted);
        doc.setFontSize(6.5);
        doc.text('CONFIDENTIAL DOCUMENT', W / 2, pageH - 5, { align: 'center' });

        // Right: page number
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...goldDim);
        doc.text(`Page ${p} of ${pageCount}`, W - 14, pageH - 5, { align: 'right' });
    }

    // ── SAVE ──
    const fileName = `vault-report-${now.toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);

    showNotification('PDF exported successfully', 'success');
}