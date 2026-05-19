// --- Balance tracking config ---
const BALANCE_START        = 20.00;   // Your starting API credit in USD
const ALERT_THRESHOLD      =  2.00;   // Send alert when balance drops below this
const PRICE_INPUT_PER_TOK  = 3.00  / 1_000_000;  // claude-sonnet-4-6 input
const PRICE_OUTPUT_PER_TOK = 15.00 / 1_000_000;  // claude-sonnet-4-6 output

function checkBalance(inputTokens, outputTokens) {
    const cost = inputTokens * PRICE_INPUT_PER_TOK + outputTokens * PRICE_OUTPUT_PER_TOK;
    const stored = localStorage.getItem('api_balance');
    const balance = (stored !== null ? parseFloat(stored) : BALANCE_START) - cost;
    localStorage.setItem('api_balance', balance.toFixed(6));

    if (balance < ALERT_THRESHOLD && localStorage.getItem('alert_sent') !== 'true') {
        fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ 'form-name': 'balance-alert', balance: balance.toFixed(2) }),
        }).then(() => {
            localStorage.setItem('alert_sent', 'true');
        }).catch(err => console.error('Balance alert error:', err));
    }
}
// --------------------------------

let phrases = {};
const source = new URLSearchParams(window.location.search).get('source') || '';
const state = { lang: 'en', name: '', sex: '', priest: '', religion: '' };

async function loadPhrases() {
    const res = await fetch(`phrases.${state.lang}.json`);
    phrases = await res.json();
    initUI();
}

function setLanguage(lang) {
    state.lang = lang;
    loadPhrases();
}

function t(path) {
    const keys = path.split('.');
    let val = phrases;
    for (const k of keys) val = val?.[k];
    return val ?? path;
}

function interp(str, vars) {
    return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

const SCREEN_NAMES = {
    'screen-name':       'NameInput',
    'screen-sex':        'SexSelection',
    'screen-religion':   'ReligionSelection',
    'screen-priest':     'ConfessorSelection',
    'screen-confession': 'ConfessionInput',
    'screen-response':   'ConfessionDone',
};

let currentScreen = 'screen-name';

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    currentScreen = id;
}

window.addEventListener('beforeunload', () => {
    if (currentScreen === 'screen-response') return;
    navigator.sendBeacon(
        '/.netlify/functions/abandon',
        new Blob([JSON.stringify({
            name:        state.name    || 'N/A',
            sex:         state.sex     || 'N/A',
            religion:    state.religion|| 'N/A',
            priest:      state.priest  || 'N/A',
            source:      source        || 'N/A',
            finalScreen: SCREEN_NAMES[currentScreen] || currentScreen,
        })], { type: 'application/json' })
    );
});

function initUI() {
    document.getElementById('app-title').textContent = t('ui.title');
    document.getElementById('app-subtitle').textContent = t('ui.subtitle');

    // Language selector
    const btnRu = document.getElementById('lang-ru');
    const btnEn = document.getElementById('lang-en');
    btnRu.classList.toggle('active', state.lang === 'ru');
    btnEn.classList.toggle('active', state.lang === 'en');
    btnRu.onclick = () => setLanguage('ru');
    btnEn.onclick = () => setLanguage('en');

    // Screen 1: Name
    document.getElementById('prompt-name').textContent = t('ui.step_name');
    const inputName = document.getElementById('input-name');
    inputName.placeholder = t('ui.step_name_placeholder');
    const btnNext = document.getElementById('btn-name-next');
    btnNext.textContent = t('ui.step_name_button');

    btnNext.onclick = () => {
        const name = inputName.value.trim();
        if (!name) { inputName.focus(); return; }
        state.name = name;
        setupSexScreen();
        showScreen('screen-sex');
    };

    inputName.onkeydown = e => {
        if (e.key === 'Enter') btnNext.click();
    };

    showScreen('screen-name');
}

function setupSexScreen() {
    document.getElementById('prompt-sex').textContent = t('ui.step_sex_title');
    const btnMale = document.getElementById('btn-male');
    const btnFemale = document.getElementById('btn-female');
    btnMale.textContent = t('ui.step_sex_male');
    btnFemale.textContent = t('ui.step_sex_female');

    btnMale.onclick = () => { state.sex = 'male'; state.religion = ''; setupReligionScreen(); showScreen('screen-religion'); };
    btnFemale.onclick = () => { state.sex = 'female'; state.religion = ''; setupReligionScreen(); showScreen('screen-religion'); };
}

function setupPriestScreen() {
    document.getElementById('prompt-priest').textContent = t('ui.step_priest_title');

    const list = document.getElementById('priest-list');
    list.innerHTML = '';

    for (const [key, val] of Object.entries(t('priests'))) {
        const btn = document.createElement('button');
        btn.className = 'priest-btn';
        btn.dataset.priest = key;
        btn.innerHTML = `<span class="priest-symbol">${val.symbol}</span><span class="priest-name">${val.name}</span><span class="priest-tagline">${val.tagline}</span>`;
        btn.addEventListener('click', () => {
            state.priest = key;
            setupConfessionScreen();
            showScreen('screen-confession');
        });
        list.appendChild(btn);
    }
}

function setupReligionScreen() {
    document.getElementById('prompt-religion').textContent = t('ui.step_religion_title');

    const grid = document.getElementById('religion-grid');
    grid.innerHTML = '';

    for (const [key, val] of Object.entries(t('religions'))) {
        const btn = document.createElement('button');
        btn.className = 'religion-btn';
        btn.dataset.religion = key;
        btn.innerHTML = `<span class="religion-symbol">${val.symbol}</span><span class="religion-name">${val.name}</span>`;
        btn.addEventListener('click', () => handleReligion(key));
        grid.appendChild(btn);
    }
}

function handleReligion(religion) {
    state.religion = religion;
    if (religion === 'christianity') {
        setupPriestScreen();
        showScreen('screen-priest');
    } else {
        document.getElementById('excuse-text').textContent = t(`excuses.${religion}`);
        const btnBack = document.getElementById('btn-excuse-back');
        btnBack.textContent = t('ui.back_button');
        btnBack.onclick = () => showScreen('screen-religion');
        showScreen('screen-excuse');
    }
}

function setupConfessionScreen() {
    document.getElementById('prompt-confession').textContent =
        interp(t('ui.confession_title'), { name: state.name });
    const inputConfession = document.getElementById('input-confession');
    inputConfession.placeholder = t('ui.confession_placeholder');
    inputConfession.value = '';
    const btnConfess = document.getElementById('btn-confess');
    btnConfess.textContent = t('ui.confession_button');
    btnConfess.onclick = submitConfession;
}

function setupInviteSection(recordId) {
    const section = document.getElementById('invite-section');
    const confirm = document.getElementById('invite-confirm');
    const inputEmails = document.getElementById('input-emails');
    const btnInvite = document.getElementById('btn-invite');

    section.classList.remove('visible');
    confirm.classList.add('hidden');
    inputEmails.value = '';

    document.getElementById('invite-prompt').textContent = t('ui.invite_prompt');
    inputEmails.placeholder = t('ui.invite_placeholder');
    btnInvite.textContent = t('ui.invite_button');
    document.getElementById('invite-confirm').textContent = t('ui.invite_confirm');

    setTimeout(() => section.classList.add('visible'), 2000);

    btnInvite.onclick = async () => {
        const emails = inputEmails.value.split(',').map(e => e.trim()).filter(Boolean).join(', ');
        if (!emails) { inputEmails.focus(); return; }

        btnInvite.disabled = true;

        if (recordId) {
            await fetch('/.netlify/functions/log-emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recordId, emails }),
            }).catch(err => console.error('log-emails error:', err));
        }

        inputEmails.style.display = 'none';
        btnInvite.style.display = 'none';
        confirm.classList.remove('hidden');
    };
}

async function submitConfession() {
    const confession = document.getElementById('input-confession').value.trim();
    if (!confession) { document.getElementById('input-confession').focus(); return; }

    const loading = document.getElementById('loading');
    document.getElementById('loading-text').textContent = t('ui.confession_loading');
    loading.classList.remove('hidden');

    try {
        const res = await fetch('/.netlify/functions/confess', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                confession,
                name: state.name,
                sex: state.sex,
                religion: state.religion,
                priest: state.priest,
                source,
                systemPrompt: t(`priests.${state.priest}.system_prompt`)
            })
        });

        const data = await res.json();
        loading.classList.add('hidden');

        if (data.usage) checkBalance(data.usage.input_tokens, data.usage.output_tokens);

        document.getElementById('response-text').textContent =
            data.absolution || data.error || 'ОШИБКА СИСТЕМЫ';

        const btnAgain = document.getElementById('btn-again');
        btnAgain.textContent = t('ui.confess_again');
        btnAgain.onclick = () => { setupConfessionScreen(); showScreen('screen-confession'); };

        setupInviteSection(data.recordId || null);
        showScreen('screen-response');
    } catch {
        loading.classList.add('hidden');
        alert('ОШИБКА СОЕДИНЕНИЯ С НЕБЕСАМИ');
    }
}

loadPhrases();
