const STORAGE_KEY = 'expense-tracker-data';
const THEME_KEY = 'expense-tracker-theme';
const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' });
const longDateFormatter = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

let appData = {
    profile: null,
    cards: [],
    transactions: [],
    activeCardId: null
};

function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function readSavedData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;
        const parsed = JSON.parse(saved);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Saved expense data has an invalid format.');
        }

        appData.profile = parsed.profile && typeof parsed.profile.name === 'string'
            ? { name: parsed.profile.name, age: Number(parsed.profile.age) || 0 }
            : null;
        appData.cards = Array.isArray(parsed.cards) ? parsed.cards.filter(card =>
            card && typeof card.id === 'string' && typeof card.bankName === 'string'
        ) : [];
        appData.transactions = Array.isArray(parsed.transactions) ? parsed.transactions.filter(transaction =>
            transaction && typeof transaction.id === 'string' &&
            Number.isFinite(Number(transaction.amount)) &&
            ['income', 'expense'].includes(transaction.type) &&
            typeof transaction.date === 'string'
        ) : [];
        appData.activeCardId = typeof parsed.activeCardId === 'string' ? parsed.activeCardId : null;

        if (appData.activeCardId && appData.activeCardId !== 'all' &&
            !appData.cards.some(card => card.id === appData.activeCardId)) {
            appData.activeCardId = appData.cards[0]?.id ?? null;
        }
        if (Number(appData.profile?.age) < 18) appData.activeCardId = null;
    } catch (error) {
        console.error('Could not read saved expense tracker data:', error);
        showNotification('Saved data could not be read. New changes will still be saved.', 'error');
    }
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
        return true;
    } catch (error) {
        console.error('Could not save expense tracker data:', error);
        showNotification('Could not save your changes in this browser. Check available storage.', 'error');
        return false;
    }
}

function setTheme(theme) {
    const currentTheme = theme === 'dark' ? 'dark' : 'light';
    const toggle = document.getElementById('themeToggle');
    document.documentElement.dataset.theme = currentTheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
        'content',
        currentTheme === 'dark' ? '#151514' : '#f5f5f3'
    );
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    toggle.setAttribute('aria-label', `Switch to ${nextTheme} theme`);
    toggle.setAttribute('title', `Switch to ${nextTheme} theme`);
    toggle.setAttribute('aria-pressed', String(currentTheme === 'dark'));
    toggle.querySelector('i').className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

    try {
        localStorage.setItem(THEME_KEY, currentTheme);
    } catch (error) {
        console.error('Could not save the selected theme:', error);
    }
}

function setCurrentDate() {
    const date = new Date();
    const dateElement = document.getElementById('currentDate');
    dateElement.dateTime = localDateString(date);
    dateElement.textContent = new Intl.DateTimeFormat(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(date);
    document.getElementById('incomeDate').value = localDateString(date);
    document.getElementById('expenseDate').value = localDateString(date);
}

function escapeText(value) {
    return String(value ?? '');
}

function selectedAccountTransactions() {
    if (!appData.activeCardId || appData.activeCardId === 'all') {
        return appData.transactions;
    }
    return appData.transactions.filter(transaction => transaction.cardId === appData.activeCardId);
}

function currentMonthTransactions(transactions = selectedAccountTransactions()) {
    const now = new Date();
    return transactions.filter(transaction => {
        const date = parseLocalDate(transaction.date);
        return date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    });
}

function parseLocalDate(value) {
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!parts) return null;
    const date = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
    return Number.isNaN(date.getTime()) ? null : date;
}

function getActiveCard() {
    return appData.cards.find(card => card.id === appData.activeCardId) ?? null;
}

function canManageCards() {
    return Number(appData.profile?.age) >= 18;
}

function formatMoney(value) {
    return currency.format(Number(value) || 0);
}

function setMoneyText(element, value, label, suffix = '') {
    const exactAmount = formatMoney(value);
    const displayText = `${exactAmount}${suffix ? ` ${suffix}` : ''}`;
    element.replaceChildren();
    const groups = displayText.split(',');
    groups.forEach((group, index) => {
        element.append(document.createTextNode(group));
        if (index < groups.length - 1) {
            element.append(document.createTextNode(','));
            if (displayText.length > 18) element.append(document.createElement('wbr'));
        }
    });
    element.style.setProperty('--amount-length', String(displayText.length));
    element.setAttribute('aria-label', `${label}: ${exactAmount}${suffix ? ` ${suffix}` : ''}`);
    element.title = `${label}: ${exactAmount}${suffix ? ` ${suffix}` : ''}`;
    element.classList.toggle('long-money', displayText.length > 18);
}

function initializeApp() {
    readSavedData();
    setCurrentDate();

    let savedTheme = 'light';
    try {
        savedTheme = localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
    } catch (error) {
        console.error('Could not read the selected theme:', error);
    }
    setTheme(savedTheme);

    document.getElementById('themeToggle').addEventListener('click', () => {
        setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });
    document.getElementById('settingsButton').addEventListener('click', openSettings);
    document.getElementById('closeSettings').addEventListener('click', closeSettings);
    document.getElementById('drawerBackdrop').addEventListener('click', closeSettings);
    document.getElementById('resetDataButton').addEventListener('click', resetAppData);
    document.getElementById('profileForm').addEventListener('submit', saveProfile);
    document.getElementById('setupForm').addEventListener('submit', saveInitialProfile);
    document.getElementById('cardForm').addEventListener('submit', addCard);
    document.getElementById('limitForm').addEventListener('submit', saveLimit);
    document.getElementById('incomeForm').addEventListener('submit', event => saveTransaction(event, 'income'));
    document.getElementById('expenseForm').addEventListener('submit', event => saveTransaction(event, 'expense'));
    document.getElementById('addCardButton').addEventListener('click', () => openModal('cardModal'));
    document.getElementById('activeCardSelect').addEventListener('change', event => {
        appData.activeCardId = event.target.value;
        saveData();
        renderDashboard();
    });
    document.getElementById('overviewRange').addEventListener('change', renderChart);
    document.getElementById('overviewType').addEventListener('change', renderChart);
    document.getElementById('expenseRange').addEventListener('change', renderBreakdown);
    document.getElementById('transactionType').addEventListener('change', renderTransactions);
    document.getElementById('transactionSort').addEventListener('change', renderTransactions);
    document.getElementById('transactionRows').addEventListener('click', handleTransactionAction);
    document.getElementById('cardNumberInput').addEventListener('input', formatCardNumberInput);
    document.getElementById('settingsCardList').addEventListener('click', handleSettingsCardAction);

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', event => {
            if (event.target === modal && modal.id !== 'setupModal') closeModal(modal.id);
        });
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            const visibleModal = document.querySelector('.modal.show');
            if (visibleModal) closeModal(visibleModal.id);
            else closeSettings();
        }
    });

    renderDashboard();
}

function openSettings() {
    const panel = document.getElementById('settingsPanel');
    panel.inert = false;
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('settings-open');
    document.getElementById('settingsButton').setAttribute('aria-expanded', 'true');
    document.getElementById('closeSettings').focus();
}

function closeSettings() {
    document.body.classList.remove('settings-open');
    const panel = document.getElementById('settingsPanel');
    panel.setAttribute('aria-hidden', 'true');
    panel.inert = true;
    document.getElementById('settingsButton').setAttribute('aria-expanded', 'false');
    document.getElementById('settingsButton').focus();
}

function openModal(modalId) {
    if ((modalId === 'cardModal' || modalId === 'limitModal') && !canManageCards()) {
        showNotification('Card features are available from age 18.', 'error');
        return;
    }
    if (modalId === 'cardModal' && !appData.profile) {
        showNotification('Add your name and age to your profile before adding a card.', 'error');
        openSettings();
        document.getElementById('profileName').focus();
        return;
    }
    if (modalId === 'cardModal') {
        document.getElementById('cardholderPreview').textContent = appData.profile?.name || 'Add your name in your profile first';
    }
    if (modalId === 'limitModal') {
        const card = getActiveCard();
        if (!card) {
            showNotification('Add a card before setting a spending limit.', 'error');
            return;
        }
        document.getElementById('limitInput').value = card.limit;
    }

    const modal = document.getElementById(modalId);
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    modal.querySelector('input, select, button')?.focus();
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (modalId === 'setupModal' && !appData.profile) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = document.querySelector('.modal.show') ? 'hidden' : '';

    const form = modal.querySelector('form');
    if (form) form.reset();
    if (modalId === 'incomeModal' || modalId === 'expenseModal') setCurrentDate();
}

function openIncomeModel() {
    refreshAccountSelects();
    openModal('incomeModal');
}

function openExpenseModel() {
    refreshAccountSelects();
    openModal('expenseModal');
}

function closeModel(modalId) {
    closeModal(modalId);
}

function saveProfile(event) {
    event.preventDefault();
    const name = document.getElementById('profileName').value.trim();
    const age = Number(document.getElementById('profileAge').value);
    if (!name || !Number.isInteger(age) || age < 1 || age > 120) {
        showNotification('Enter a name and an age from 1 to 120.', 'error');
        return;
    }

    saveProfileData(name, age);
    renderDashboard();
    showNotification('Profile saved.');
}

function resetAppData() {
    if (!window.confirm('Reset the tracker? This will permanently remove your profile, cards, and transactions from this browser.')) {
        return;
    }

    try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(THEME_KEY);
    } catch (error) {
        console.error('Could not reset saved expense tracker data:', error);
        showNotification('Could not reset your saved data in this browser.', 'error');
        return;
    }

    appData = {
        profile: null,
        cards: [],
        transactions: [],
        activeCardId: null
    };
    closeSettings();
    setTheme('light');
    renderDashboard();
    showNotification('Tracker reset. Add your details to get started again.');
}

function saveInitialProfile(event) {
    event.preventDefault();
    const name = document.getElementById('setupName').value.trim();
    const age = Number(document.getElementById('setupAge').value);
    if (!name || !Number.isInteger(age) || age < 1 || age > 120) {
        showNotification('Enter your name and an age from 1 to 120.', 'error');
        return;
    }
    saveProfileData(name, age);
    document.getElementById('setupModal').classList.remove('show');
    document.getElementById('setupModal').setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.getElementById('setupForm').reset();
    renderDashboard();
    showNotification('Profile saved. You can add income or expenses now.');
}

function saveProfileData(name, age) {
    appData.profile = { name, age };
    if (age < 18) appData.activeCardId = null;
    appData.cards.forEach(card => { card.holderName = name; });
    saveData();
}

function formatCardNumberInput(event) {
    const input = event.currentTarget;
    const digits = input.value.replace(/\D/g, '').slice(0, 19);
    input.value = digits.replace(/(.{4})/g, '$1 ').trim();
}

function detectCardNetwork(number) {
    if (/^4/.test(number)) return 'Visa';
    if (/^(5[1-5]|2(2(2[1-9]|[3-9]\d)|[3-6]\d{2}|7([01]\d|20)))/.test(number)) return 'Mastercard';
    if (/^3[47]/.test(number)) return 'American Express';
    if (/^6011/.test(number)) return 'Discover';
    if (/^60/.test(number)) return 'RuPay';
    if (/^(65|64[4-9]|622(12[6-9]|1[3-9]\d|[2-8]\d{2}|9([01]\d|2[0-5])))/.test(number)) return 'Discover';
    return 'Other';
}

function passesLuhn(number) {
    let total = 0;
    let doubleDigit = false;
    for (let index = number.length - 1; index >= 0; index -= 1) {
        let digit = Number(number[index]);
        if (doubleDigit) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        total += digit;
        doubleDigit = !doubleDigit;
    }
    return total % 10 === 0;
}

function addCard(event) {
    event.preventDefault();
    if (!canManageCards()) {
        showNotification('Card features are available from age 18.', 'error');
        return;
    }
    const bankName = document.getElementById('bankName').value.trim();
    const number = document.getElementById('cardNumberInput').value.replace(/\D/g, '');
    const limit = Number(document.getElementById('cardLimitInput').value);
    if (!bankName || number.length < 12 || number.length > 19 || !passesLuhn(number)) {
        showNotification('Enter a valid card number so its network can be identified.', 'error');
        return;
    }
    if (!Number.isFinite(limit) || limit < 0) {
        showNotification('The monthly limit must be zero or more.', 'error');
        return;
    }

    const card = {
        id: crypto.randomUUID(),
        bankName,
        lastFour: number.slice(-4),
        network: detectCardNetwork(number),
        holderName: appData.profile.name,
        limit
    };
    appData.cards.push(card);
    appData.activeCardId = card.id;
    saveData();
    closeModal('cardModal');
    renderDashboard();
    showNotification(`${card.network} card added. Only its last four digits were saved.`);
}

function saveLimit(event) {
    event.preventDefault();
    if (!canManageCards()) {
        showNotification('Card features are available from age 18.', 'error');
        return;
    }
    const card = getActiveCard();
    const limit = Number(document.getElementById('limitInput').value);
    if (!card || !Number.isFinite(limit) || limit < 0) {
        showNotification('Enter a valid monthly limit.', 'error');
        return;
    }
    card.limit = limit;
    saveData();
    closeModal('limitModal');
    renderDashboard();
    showNotification('Spending limit updated.');
}

function refreshAccountSelects() {
    const options = [
        '<option value="">Cash / no card</option>',
        ...(canManageCards() ? appData.cards.map(card =>
            `<option value="${escapeHtml(card.id)}">${escapeHtml(card.bankName)} ···· ${escapeHtml(card.lastFour)}</option>`
        ) : [])
    ].join('');
    document.querySelectorAll('.transaction-card-select').forEach(select => {
        select.innerHTML = options;
        select.value = appData.activeCardId && appData.activeCardId !== 'all' ? appData.activeCardId : '';
    });
}

function escapeHtml(value) {
    return escapeText(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function saveTransaction(event, type) {
    event.preventDefault();
    const prefix = type === 'income' ? 'income' : 'expense';
    const amount = Number(document.getElementById(`${prefix}Amount`).value);
    const date = document.getElementById(`${prefix}Date`).value;
    const category = document.getElementById(`${prefix}Category`).value;
    const description = document.getElementById(`${prefix}Description`).value.trim();
    const cardId = document.getElementById(`${prefix}Card`).value || null;
    if (cardId && !canManageCards()) {
        showNotification('Card features are available from age 18.', 'error');
        return;
    }
    if (!Number.isFinite(amount) || amount <= 0 || !parseLocalDate(date) || !category || !description) {
        showNotification('Check the amount, date, category, and description.', 'error');
        return;
    }

    appData.transactions.push({
        id: crypto.randomUUID(),
        date,
        category,
        description,
        amount: Math.round(amount * 100) / 100,
        status: 'Recorded',
        type,
        cardId
    });
    saveData();
    closeModal(`${prefix}Modal`);
    renderDashboard();
    showNotification(`${type === 'income' ? 'Income' : 'Expense'} saved.`);
}

function renderDashboard() {
    const isReady = Boolean(appData.profile);
    document.getElementById('dashboard').hidden = !isReady;
    document.getElementById('addButtons').hidden = !isReady;
    const setupModal = document.getElementById('setupModal');
    setupModal.classList.toggle('show', !isReady);
    setupModal.setAttribute('aria-hidden', String(isReady));
    if (!isReady) {
        document.body.style.overflow = 'hidden';
        document.getElementById('setupName').focus();
    } else if (!document.querySelector('.modal.show')) {
        document.body.style.overflow = '';
    }
    renderProfile();
    renderCard();
    renderSettingsCards();
    renderSummary();
    renderChart();
    renderBreakdown();
    renderTransactions();
}

function renderProfile() {
    const name = appData.profile?.name || '';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
    document.querySelector('.header h2').textContent = name ? `${greeting}, ${name}` : 'Expense Tracker';
    document.getElementById('profileName').value = name;
    document.getElementById('profileAge').value = appData.profile?.age || '';
}

function renderSettingsCards() {
    const list = document.getElementById('settingsCardList');
    list.replaceChildren();
    const cardsAvailable = canManageCards();
    document.getElementById('addCardButton').hidden = !cardsAvailable;
    document.getElementById('cardsSectionNote').textContent = cardsAvailable
        ? 'Only the last four digits are saved.'
        : 'Card features are available from age 18.';
    if (!cardsAvailable) {
        const message = document.createElement('p');
        message.className = 'settings-card-empty';
        message.textContent = 'You can keep tracking income and expenses without adding a card.';
        list.appendChild(message);
        return;
    }
    if (!appData.cards.length) {
        const message = document.createElement('p');
        message.className = 'settings-card-empty';
        message.textContent = 'No cards added yet.';
        list.appendChild(message);
        return;
    }

    appData.cards.forEach(card => {
        const row = document.createElement('div');
        row.className = 'settings-card-row';
        if (card.id === appData.activeCardId) row.classList.add('active');
        const selectButton = document.createElement('button');
        selectButton.className = 'settings-card-select';
        selectButton.type = 'button';
        selectButton.dataset.selectCard = card.id;
        selectButton.setAttribute('aria-pressed', String(card.id === appData.activeCardId));
        const name = document.createElement('span');
        name.className = 'settings-card-name';
        name.textContent = card.bankName;
        const meta = document.createElement('span');
        meta.className = 'settings-card-meta';
        meta.textContent = `${card.network} ···· ${card.lastFour} · ${formatMoney(card.limit)} limit`;
        meta.title = `${card.network} ···· ${card.lastFour} · ${formatMoney(card.limit)} limit`;
        selectButton.append(name, meta);
        row.appendChild(selectButton);
        list.appendChild(row);
    });
}

function handleSettingsCardAction(event) {
    if (!canManageCards()) return;
    const button = event.target.closest('button[data-select-card]');
    if (!button) return;
    appData.activeCardId = button.dataset.selectCard;
    saveData();
    renderDashboard();
}

function renderCard() {
    const cardsAvailable = canManageCards();
    if (cardsAvailable && !appData.activeCardId && appData.cards.length) {
        appData.activeCardId = appData.cards[0].id;
    }
    const activeCard = cardsAvailable ? getActiveCard() : null;
    const hasCards = cardsAvailable && appData.cards.length > 0;
    const showingAll = cardsAvailable && appData.activeCardId === 'all';
    const cardDetails = document.getElementById('cardDetails');
    const activeDetails = document.getElementById('activeCardDetails');
    const pickerWrap = document.getElementById('cardPickerWrap');
    cardDetails.hidden = hasCards;
    activeDetails.hidden = !activeCard && !showingAll;
    pickerWrap.hidden = !hasCards;

    if (activeCard || showingAll) {
        const face = document.querySelector('.card-face');
        face.dataset.network = activeCard?.network || '';
        document.getElementById('cardTitle').textContent = activeCard?.bankName || 'All cards';
        document.getElementById('cardNumber').textContent = activeCard
            ? `••••  ••••  ••••  ${activeCard.lastFour}`
            : 'Combined account view';
        document.getElementById('cardHolder').textContent = activeCard
            ? activeCard.holderName || appData.profile?.name || 'Cardholder'
            : `${appData.cards.length} saved cards`;
        document.getElementById('cardNetwork').textContent = activeCard?.network || 'Multiple';
        const cardTransactions = appData.transactions.filter(transaction =>
            showingAll || transaction.cardId === activeCard?.id
        );
        const spent = currentMonthTransactions(cardTransactions)
            .filter(transaction => transaction.type === 'expense')
            .reduce((total, transaction) => total + Number(transaction.amount), 0);
        const limit = activeCard?.limit ?? appData.cards.reduce((sum, card) => sum + Number(card.limit || 0), 0);
        const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
        const progressBar = document.querySelector('.progress-bar');
        setMoneyText(document.getElementById('spendingLimit'), limit, 'Spending limit', 'limit');
        setMoneyText(document.getElementById('spendingUsed'), spent, 'Spent', 'spent');
        document.getElementById('progressFill').style.width = `${percentage}%`;
        progressBar.setAttribute('aria-valuenow', String(Math.round(percentage)));
        document.querySelector('.spending-heading .text-button').hidden = showingAll;
        const limitCaption = document.getElementById('limitCaption');
        if (limit > 0) {
            const overLimit = spent > limit;
            setMoneyText(
                limitCaption,
                overLimit ? spent - limit : limit - spent,
                overLimit ? 'Over limit this month' : 'Remaining this month',
                overLimit ? 'over limit this month' : 'remaining this month'
            );
        } else {
            limitCaption.textContent = 'Set a limit to track monthly spending.';
            limitCaption.removeAttribute('aria-label');
            limitCaption.removeAttribute('title');
        }
    } else {
        document.querySelector('.card-face').removeAttribute('data-network');
        document.getElementById('cardTitle').textContent = 'My Card';
        document.getElementById('cardNumber').textContent = cardsAvailable
            ? 'Add a card in Settings'
            : 'Card features unavailable';
        document.getElementById('cardHolder').textContent = appData.profile?.name || 'Cardholder';
        document.getElementById('cardNetwork').textContent = '';
        cardDetails.querySelector('span').textContent = cardsAvailable
            ? 'Add a card from Settings to track its spending.'
            : 'Card features are available from age 18.';
    }

    const picker = document.getElementById('activeCardSelect');
    picker.innerHTML = [
        ...(cardsAvailable ? appData.cards.map(card =>
            `<option value="${escapeHtml(card.id)}">${escapeHtml(card.bankName)} ···· ${escapeHtml(card.lastFour)}</option>`
        ) : []),
        ...(cardsAvailable && appData.cards.length > 1 ? ['<option value="all">All accounts</option>'] : [])
    ].join('');
    picker.value = appData.activeCardId || appData.cards[0]?.id || '';
    refreshAccountSelects();
}

function renderSummary() {
    const transactions = currentMonthTransactions();
    const income = transactions
        .filter(transaction => transaction.type === 'income')
        .reduce((total, transaction) => total + Number(transaction.amount), 0);
    const expenses = transactions
        .filter(transaction => transaction.type === 'expense')
        .reduce((total, transaction) => total + Number(transaction.amount), 0);
    setMoneyText(document.getElementById('incomeTotal'), income, 'Total income');
    setMoneyText(document.getElementById('expenseTotal'), expenses, 'Monthly expenses');
}

function chartPeriods(range) {
    const now = new Date();
    if (range === 'month') {
        const year = now.getFullYear();
        const month = now.getMonth();
        return Array.from({ length: 5 }, (_, index) => ({
            key: `${year}-${String(month + 1).padStart(2, '0')}-w${index + 1}`,
            label: `Week ${index + 1}`
        }));
    }

    const startMonth = range === 'year' ? 0 : now.getMonth() - 11;
    const startYear = range === 'year' ? now.getFullYear() : now.getFullYear() + Math.floor(startMonth / 12);
    const normalizedStartMonth = range === 'year' ? 0 : (startMonth + 12) % 12;
    return Array.from({ length: 12 }, (_, index) => {
        const date = new Date(startYear, normalizedStartMonth + index, 1);
        return {
            key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
            label: monthFormatter.format(date)
        };
    });
}

function renderChart() {
    const range = document.getElementById('overviewRange').value;
    const type = document.getElementById('overviewType').value;
    const periods = chartPeriods(range);
    const transactions = selectedAccountTransactions().filter(transaction => {
        const date = parseLocalDate(transaction.date);
        if (!date) return false;
        const periodKey = getChartPeriodKey(date, range);
        const allowedType = type === 'both' || transaction.type === type;
        return periods.some(period => period.key === periodKey) && allowedType;
    });
    const values = periods.map(period => {
        const periodTransactions = transactions.filter(transaction =>
            getChartPeriodKey(parseLocalDate(transaction.date), range) === period.key
        );
        return {
            ...period,
            income: periodTransactions.filter(transaction => transaction.type === 'income')
                .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
            expense: periodTransactions.filter(transaction => transaction.type === 'expense')
                .reduce((sum, transaction) => sum + Number(transaction.amount), 0)
        };
    });
    const maxValue = Math.max(1, ...values.flatMap(value => [value.income, value.expense]));
    const axis = document.getElementById('chartAxis');
    axis.replaceChildren();
    for (let step = 4; step >= 0; step -= 1) {
        const label = document.createElement('span');
        setMoneyText(label, maxValue * step / 4, 'Chart scale');
        axis.appendChild(label);
    }
    const chart = document.getElementById('overviewChart');
    chart.replaceChildren();
    values.forEach((value, index) => {
        const group = document.createElement('div');
        group.className = 'chart-group';
        const bars = document.createElement('div');
        bars.className = 'chart-bars';

        if (type !== 'expense') {
            bars.appendChild(createChartBar(value.income, maxValue, 'income', value.label));
        }
        if (type !== 'income') {
            bars.appendChild(createChartBar(value.expense, maxValue, 'expense', value.label));
        }
        const label = document.createElement('span');
        label.className = 'chart-label';
        label.textContent = value.label;
        group.append(bars, label);
        chart.appendChild(group);
    });
    const hasTransactions = transactions.length > 0;
    document.getElementById('chartFrame').hidden = !hasTransactions;
    document.getElementById('chartEmpty').hidden = hasTransactions;
}

function getChartPeriodKey(date, range) {
    if (!date) return '';
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (range !== 'month') return yearMonth;
    const week = Math.min(Math.ceil(date.getDate() / 7), 5);
    return `${yearMonth}-w${week}`;
}

function createChartBar(value, maxValue, type, label) {
    const bar = document.createElement('div');
    bar.className = `chart-bar ${type}`;
    const height = value > 0 ? Math.max((value / maxValue) * 100, 2) : 0;
    bar.style.height = `${height}%`;
    bar.hidden = value <= 0;
    bar.title = `${label} ${type}: ${formatMoney(value)}`;
    bar.setAttribute('aria-label', `${label} ${type}: ${formatMoney(value)}`);
    return bar;
}

function transactionsForRange(range) {
    const transactions = selectedAccountTransactions();
    if (range === 'all') return transactions;
    const now = new Date();
    return transactions.filter(transaction => {
        const date = parseLocalDate(transaction.date);
        if (!date) return false;
        return date.getFullYear() === now.getFullYear() &&
            (range === 'year' || date.getMonth() === now.getMonth());
    });
}

function renderBreakdown() {
    const transactions = transactionsForRange(document.getElementById('expenseRange').value)
        .filter(transaction => transaction.type === 'expense');
    const total = transactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    setMoneyText(document.getElementById('breakdownTotal'), total, 'All expenses');
    const categories = new Map();
    transactions.forEach(transaction => {
        const category = transaction.category || 'Other';
        categories.set(category, (categories.get(category) || 0) + Number(transaction.amount));
    });
    const sorted = [...categories.entries()].sort((a, b) => b[1] - a[1]);
    const list = document.getElementById('categoryList');
    list.replaceChildren();
    sorted.forEach(([category, amount]) => {
        const row = document.createElement('div');
        row.className = 'category-row';
        const heading = document.createElement('div');
        heading.className = 'category-row-heading';
        const label = document.createElement('span');
        label.textContent = category;
        const value = document.createElement('strong');
        setMoneyText(value, amount, `${category} expenses`);
        const track = document.createElement('div');
        track.className = 'category-track';
        const fill = document.createElement('div');
        fill.className = 'category-fill';
        fill.style.width = `${total > 0 ? (amount / total) * 100 : 0}%`;
        track.appendChild(fill);
        heading.append(label, value);
        row.append(heading, track);
        list.appendChild(row);
    });
    document.getElementById('categoryEmpty').hidden = sorted.length > 0;
}

function renderTransactions() {
    const type = document.getElementById('transactionType').value;
    const sort = document.getElementById('transactionSort').value;
    const rows = selectedAccountTransactions()
        .filter(transaction => type === 'all' || transaction.type === type)
        .slice();

    rows.sort((first, second) => {
        if (sort === 'highest') return Number(second.amount) - Number(first.amount);
        if (sort === 'lowest') return Number(first.amount) - Number(second.amount);
        const dateDifference = (parseLocalDate(first.date)?.getTime() || 0) -
            (parseLocalDate(second.date)?.getTime() || 0);
        return sort === 'oldest' ? dateDifference : -dateDifference;
    });

    const tbody = document.getElementById('transactionRows');
    tbody.replaceChildren();
    rows.slice(0, 50).forEach(transaction => {
        const row = document.createElement('tr');
        const dateCell = document.createElement('td');
        dateCell.textContent = parseLocalDate(transaction.date)
            ? longDateFormatter.format(parseLocalDate(transaction.date))
            : transaction.date;
        const descriptionCell = document.createElement('td');
        descriptionCell.className = 'transaction-description';
        descriptionCell.textContent = transaction.description || transaction.category || 'Transaction';
        const categoryCell = document.createElement('td');
        categoryCell.textContent = transaction.category || 'Other';
        const accountCell = document.createElement('td');
        const card = appData.cards.find(item => item.id === transaction.cardId);
        accountCell.textContent = card
            ? canManageCards() ? `${card.bankName} ···· ${card.lastFour}` : 'Card account'
            : 'Cash / no card';
        const amountCell = document.createElement('td');
        amountCell.className = `transaction-amount ${transaction.type}`;
        amountCell.textContent = `${transaction.type === 'income' ? '+' : '−'}${formatMoney(transaction.amount)}`;
        const actionCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.className = 'action-btn';
        deleteButton.type = 'button';
        deleteButton.dataset.transactionId = transaction.id;
        deleteButton.setAttribute('aria-label', `Delete ${transaction.description || 'transaction'}`);
        deleteButton.title = 'Delete transaction';
        deleteButton.innerHTML = '<i class="fas fa-trash" aria-hidden="true"></i>';
        actionCell.appendChild(deleteButton);
        row.append(dateCell, descriptionCell, categoryCell, accountCell, amountCell, actionCell);
        tbody.appendChild(row);
    });
    document.getElementById('transactionsEmpty').hidden = rows.length > 0;
}

function handleTransactionAction(event) {
    const button = event.target.closest('button[data-transaction-id]');
    if (!button) return;
    const transaction = appData.transactions.find(item => item.id === button.dataset.transactionId);
    if (!transaction) {
        showNotification('That transaction is no longer available.', 'error');
        return;
    }
    if (!window.confirm(`Delete "${transaction.description || transaction.category}"?`)) return;
    appData.transactions = appData.transactions.filter(item => item.id !== transaction.id);
    saveData();
    renderDashboard();
    showNotification('Transaction deleted.');
}

function showNotification(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.textContent = message;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3500);
}

function exportPDF() {
    if (!window.jspdf?.jsPDF || typeof window.jspdf.jsPDF.API.autoTable !== 'function') {
        showNotification('The PDF export library did not load. Check your connection and try again.', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const colors = {
        page: [255, 255, 255],
        surface: [249, 249, 247],
        ink: [28, 28, 26],
        muted: [103, 103, 98],
        line: [227, 227, 223],
        income: [40, 114, 77],
        expense: [183, 76, 69]
    };
    const transactions = selectedAccountTransactions().slice().sort((a, b) =>
        (parseLocalDate(b.date)?.getTime() || 0) - (parseLocalDate(a.date)?.getTime() || 0)
    );
    const totalIncome = transactions.filter(item => item.type === 'income')
        .reduce((sum, item) => sum + Number(item.amount), 0);
    const totalExpenses = transactions.filter(item => item.type === 'expense')
        .reduce((sum, item) => sum + Number(item.amount), 0);
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(...colors.page);
    doc.rect(0, 0, pageWidth, 297, 'F');
    doc.setFillColor(...colors.surface);
    doc.roundedRect(12, 12, pageWidth - 24, 38, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...colors.ink);
    doc.text('Ledger', 20, 27);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...colors.muted);
    doc.text('Income and expense statement', 20, 35);
    doc.text(new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date()), pageWidth - 20, 29, { align: 'right' });
    const card = getActiveCard();
    const accountLabel = card
        ? canManageCards() ? `${card.bankName} ···· ${card.lastFour}` : 'All accounts'
        : appData.activeCardId === 'all' || !canManageCards() ? 'All accounts' : 'Cash / no card';
    doc.text(`Account: ${accountLabel}`, 20, 43);

    const boxY = 59;
    const boxWidth = (pageWidth - 32) / 3;
    [
        ['INCOME', totalIncome],
        ['EXPENSES', totalExpenses],
        ['BALANCE', totalIncome - totalExpenses]
    ].forEach(([label, value], index) => {
        const x = 12 + index * (boxWidth + 4);
        doc.setFillColor(...colors.surface);
        doc.roundedRect(x, boxY, boxWidth, 24, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...colors.muted);
        doc.text(label, x + 4, boxY + 8);
        doc.setFontSize(11);
        doc.setTextColor(...colors.ink);
        doc.text(formatMoney(value), x + 4, boxY + 18);
    });

    doc.autoTable({
        startY: 91,
        head: [['DATE', 'DESCRIPTION', 'CATEGORY', 'ACCOUNT', 'TYPE', 'AMOUNT']],
        body: transactions.map(transaction => {
            const account = appData.cards.find(item => item.id === transaction.cardId);
            return [
                parseLocalDate(transaction.date) ? longDateFormatter.format(parseLocalDate(transaction.date)) : transaction.date,
                transaction.description || '—',
                transaction.category || 'Other',
                account
                    ? canManageCards() ? `${account.bankName} ···· ${account.lastFour}` : 'Card account'
                    : 'Cash / no card',
                transaction.type === 'income' ? 'Income' : 'Expense',
                `${transaction.type === 'income' ? '+' : '−'}${formatMoney(transaction.amount)}`
            ];
        }),
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 7,
            cellPadding: 2,
            overflow: 'ellipsize',
            textColor: colors.ink,
            lineColor: colors.line,
            lineWidth: 0.2,
            fillColor: colors.surface
        },
        headStyles: {
            fillColor: colors.ink,
            textColor: colors.page,
            fontStyle: 'bold'
        },
        alternateRowStyles: { fillColor: colors.page },
        didParseCell(data) {
            if (data.column.index === 5) data.cell.styles.halign = 'right';
            if (data.section === 'body' && data.column.index === 5) {
                data.cell.styles.textColor = data.row.raw[4] === 'Income' ? colors.income : colors.expense;
            }
        },
        margin: { left: 12, right: 12 }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setDrawColor(...colors.line);
        doc.line(12, pageHeight - 13, pageWidth - 12, pageHeight - 13);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...colors.muted);
        doc.text('Made for your own records', 12, pageHeight - 7);
        doc.text(`${page} / ${pageCount}`, pageWidth - 12, pageHeight - 7, { align: 'right' });
    }

    doc.save(`ledger-statement-${localDateString()}.pdf`);
}

document.addEventListener('DOMContentLoaded', initializeApp);
