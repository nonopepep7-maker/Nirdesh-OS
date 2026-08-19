

let currentVal = '0', previousVal = '', pendingOp = null, shouldResetDisplay = false;

function updateScreen() {
    document.getElementById('calcDisplay').textContent = currentVal;
    const history = document.getElementById('calcHistroy');
    if (pendingOp && previousVal !== '') {
        const symbol = pendingOp === '*' ? '×' : pendingOp === '/' ? '÷' : pendingOp;
        history.textContent = `${previousVal} ${symbol}`;
    } else {
        history.textContent = '';
    }
}

function calcNum(digit) {
    if (currentVal === '0' || shouldResetDisplay) {
        currentVal = digit;
        shouldResetDisplay = false;
    } else if (currentVal.length < 10) {
        currentVal += digit;
    }
    updateScreen();
}

function calcDecimal() {
    if (shouldResetDisplay) {
        currentVal = '0';
        shouldResetDisplay = false;
    } else if (!currentVal.includes('.')) {
        currentVal += '.';
    }
    updateScreen();
}

function calcOp(op) {
    if (pendingOp && !shouldResetDisplay) calcEquals();
    previousVal = currentVal;
    pendingOp = op;
    shouldResetDisplay = true;
    updateScreen();
}

function calcEquals() {
    if (!pendingOp || previousVal === '') return;
    let n1 = parseFloat(previousVal), n2 = parseFloat(currentVal), res = 0;
    switch (pendingOp) {
        case '+': res = n1 + n2; break;
        case '-': res = n1 - n2; break;
        case '*': res = n1 * n2; break;
        case '/': res = n1 / n2; break;
    }
    if (typeof res === 'number') res = Math.round(res * 1000000000) / 1000000000;
    currentVal = String(res);
    pendingOp = null;
    previousVal = '';
    shouldResetDisplay = true;
    updateScreen();
}

function calcClear() {
    currentVal = '0';
    previousVal = '';
    pendingOp = null;
    shouldResetDisplay = false;
    updateScreen();
}

function calcToggleSign() {
    if (currentVal !== '0' && currentVal !== 'Error') {
        currentVal = String(parseFloat(currentVal) * -1);
        updateScreen();
    }
}

function calcPercent() {
    if (currentVal !== 'Error') {
        currentVal = String(parseFloat(currentVal) / 100);
        updateScreen();
    }
}


