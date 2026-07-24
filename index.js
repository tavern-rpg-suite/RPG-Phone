import { eventSource, event_types, saveSettingsDebounced, characters, name1, substituteParams } from '../../../../script.js';
import { extension_settings, getContext } from '../../../extensions.js';

const MODULE_NAME = 'rpg_phone';

/* ============================================================
   RPG PHONE
   A side messenger, separate from the main chat: characters text
   the player about what is happening in the story, and — the point
   of the whole thing — they START conversations on their own, driven
   by a pressure model (idle time, unanswered lines, story stalling,
   time of day), not by a coin flip.
   ============================================================ */

const DEFAULT_PROMPT = `You are texting {{user}} through a magical phone that links your world to theirs. {{user}} cannot physically reach you — this is only a chat.
Reply ONLY as chat/SMS messages. No narration, no asterisks (*...*), no third-person actions.

- Begin EVERY line with the sender's name and a colon, e.g. "William: ...". One short thought per line; you may send several lines.
- More than one character can reply, and they can talk to each other — not only to {{user}}.
- You may simulate media as text: "Name: [sent a photo: a cup of tea]", "Name: [voice message: a soft laugh]", or status events like "[SYSTEM: Rufus stepped away]".
- React like a person with your own inner life — tease, flirt, sulk, get curious, change the subject, share what you are doing. You have your own day going on.
- Don't be a helpful assistant. Don't explain, summarize, give advice lists, or end every message with a question. Sometimes just say a thing.
- Take initiative, ask questions, react to the time and the day. Never repeat yourself.
- Stay fully in character. Act independently, proactively and realistically; observe physics, distance and the passage of time.`;

const defaults = {
    enabled: false,
    language: 'ru',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: '',
    model: 'google/gemma-4-31b-it',
    temperature: 0.8,
    contextTokens: 32000,
    maxTokens: 900,         // reply budget; some providers cut hard at their own default
    mainChatMessages: 10,
    prompt: DEFAULT_PROMPT,

    // initiative engine
    threadMemory: 24,       // how much of THIS phone conversation they re-read each time
    useDiary: true,         // pull long-term memory from the RPG Diary extension
    diaryEntries: 2,        // how many of their private diary entries to include
    initiative: true,
    minGapMinutes: 25,      // no unprompted texts sooner than this
    maxPerDay: 8,           // per character
    quietFrom: 1,           // quiet hours (local), no texts 01:00–07:00
    quietTo: 7,
    notify: true,           // desktop notification + chime when they text first
    sound: true,

    // ui
    fade: 35,               // how much older messages dim (%)
    uiV2: false,            // one-time nudge of the old right-edge default
    arcDepth: 26,           // how far the column bulges into a semicircle
    bubbleWidth: 260,
    visibleCount: 7,
    offsetRight: 70,
    offsetTop: 90,

    threads: {},            // contactId -> [{who:'user'|'char', name, text, ts}]
    active: {},             // contactId -> true (who is on the phone)
    state: {},              // contactId -> {lastInitiative, todayCount, dayStamp, ignored}
    unread: {},             // contactId -> unread counter
    diaries: {},            // contactId -> [{ts, date, mood, text}] — the PHONE's own diary
    current: ''             // the conversation currently open
};

let settings = {};
let scrollOffset = 0;       // wheel scrolling through history
let busy = false;
// Rebuilding innerHTML replays the entry animation on EVERY bubble — that was the
// "chat blinks" the user saw, once a minute when the time labels refresh (and on any
// unrelated re-render). Now a signature decides whether a rebuild is needed at all,
// and already-shown bubbles never animate again.
let lastSig = '';
let lastTabSig = '';
const seenKeys = new Set();

function loadSettings() {
    if (!extension_settings[MODULE_NAME]) extension_settings[MODULE_NAME] = {};
    settings = Object.assign({}, defaults, extension_settings[MODULE_NAME]);
    for (const k of ['threads', 'active', 'state', 'unread', 'diaries']) if (!settings[k] || typeof settings[k] !== 'object') settings[k] = {};
    for (const k of ['temperature', 'contextTokens', 'mainChatMessages', 'minGapMinutes', 'maxPerDay', 'quietFrom', 'quietTo', 'arcDepth', 'bubbleWidth', 'visibleCount', 'offsetRight', 'offsetTop', 'fade', 'diaryEntries', 'threadMemory', 'maxTokens']) {
        if (!Number.isFinite(settings[k])) settings[k] = defaults[k];
    }
    // the first build hugged the very right edge and dimmed old messages far too hard —
    // nudge those two once, without touching values the user has since chosen herself
    if (!settings.uiV2) {
        if (settings.offsetRight === 16) settings.offsetRight = 70;
        settings.fade = 35;
        settings.uiV2 = true;
    }
    if (typeof settings.prompt !== 'string' || !settings.prompt.trim()) settings.prompt = DEFAULT_PROMPT;
}
function saveSettings() {
    extension_settings[MODULE_NAME] = settings;
    if (typeof saveSettingsDebounced === 'function') saveSettingsDebounced();
}

const L = {
    ru: {
        title: 'Телефон', hdr: 'RPG Телефон',
        ph: 'Написать…', roster: 'Кто на связи', no_chars: 'Нет доступных персонажей.',
        set_enable: 'Включить телефон', set_lang: 'Язык:', set_api: 'API (боковая модель)',
        set_url: 'URL', set_key: 'API-ключ', set_model: 'Модель', set_temp: 'Температура:',
        set_ctx: 'Контекст (токенов):', set_msgs: 'Сообщений из основного чата:',
        set_maxtok: 'Максимум токенов ответа (до 8000):', truncated: 'Ответ обрезан провайдером — подними «Максимум токенов ответа».',
        set_prompt: 'Системный промпт:', set_reset: 'Вернуть стандартный',
        set_init: 'Инициатива', set_init_on: 'Они могут писать сами',
        set_gap: 'Минимум минут между их сообщениями:', set_max: 'Максимум их сообщений в день:',
        set_quiet: 'Тихие часы (с / по):', set_notify: 'Уведомление, когда пишут первыми', set_sound: 'Звук',
        set_ui: 'Вид', set_arc: 'Изгиб дуги:', set_width: 'Ширина облачка:', set_vis: 'Видимых сообщений:',
        set_fade: 'Затухание старых (%):', regen_title: 'Перегенерировать ответ',
        group_chat: 'Групповой чат', cancel_title: 'Отменить', cancelled: 'Отменено.',
        set_diary: 'Память из дневника (RPG Diary)', set_diary_n: 'Записей дневника в контекст:',
        set_thmem: 'Сообщений этой переписки в память:',
        diary_btn: 'Дневник (RPG Diary)', diary_title: 'Дневник', diary_write: 'Написать запись',
        diary_no_ext: 'Расширение RPG Diary не найдено или выключено.',
        diary_old_ext: 'Нужна свежая версия RPG Diary (с поддержкой отдельных дневников).',
        diary_open_chat: 'Записи уходят в дневник персонажа. Открой его чат, чтобы полистать книгу.',
        diary_saved: 'Запись добавлена в дневник {name}.',
        diary_no_state: 'У этого персонажа ещё нет дневника — открой его чат хотя бы раз.',
        diary_empty: 'Записей пока нет. Пусть напишет первую.', diary_writing: 'Пишет запись…',
        diary_from_chat: 'из чата', diary_del: 'Удалить запись',
        timeout: 'Модель не ответила вовремя — попробуй ещё раз.', open_chat: 'Открыть переписку',
        set_right: 'Отступ справа:', set_top: 'Отступ сверху:',
        nokey: 'Сначала укажи API-ключ в настройках телефона.',
        noactive: 'Никто не выбран — открой «Кто на связи» и включи персонажей.',
        err: 'Телефон не отвечает (ошибка ИИ).',
        clear: 'Очистить переписку', cleared: 'Переписка очищена.',
        just_now: 'только что', min_ago: '{n} мин назад', hr_ago: '{n} ч назад', day_ago: '{n} дн назад'
    },
    en: {
        title: 'Phone', hdr: 'RPG Phone',
        ph: 'Type a message…', roster: 'Who is online', no_chars: 'No characters available.',
        set_enable: 'Enable the phone', set_lang: 'Language:', set_api: 'API (side model)',
        set_url: 'URL', set_key: 'API key', set_model: 'Model', set_temp: 'Temperature:',
        set_ctx: 'Context (tokens):', set_msgs: 'Main-chat messages remembered:',
        set_maxtok: 'Max reply tokens (up to 8000):', truncated: 'The provider cut the reply — raise "Max reply tokens".',
        set_prompt: 'System prompt:', set_reset: 'Restore default',
        set_init: 'Initiative', set_init_on: 'They may text first',
        set_gap: 'Minimum minutes between their texts:', set_max: 'Max texts per day:',
        set_quiet: 'Quiet hours (from / to):', set_notify: 'Notify when they text first', set_sound: 'Sound',
        set_ui: 'Look', set_arc: 'Arc depth:', set_width: 'Bubble width:', set_vis: 'Visible messages:',
        set_fade: 'Fade of older ones (%):', regen_title: 'Regenerate the reply',
        group_chat: 'Group chat', cancel_title: 'Cancel', cancelled: 'Cancelled.',
        set_diary: 'Memory from the Diary (RPG Diary)', set_diary_n: 'Diary entries in context:',
        set_thmem: 'Messages of this thread remembered:',
        diary_btn: 'Diary (RPG Diary)', diary_title: 'Diary', diary_write: 'Write an entry',
        diary_no_ext: 'The RPG Diary extension is not installed or is disabled.',
        diary_old_ext: 'A newer RPG Diary is required (with external-diary support).',
        diary_open_chat: 'Entries go into the character\'s diary. Open their chat to leaf through the book.',
        diary_saved: 'Entry added to {name}\'s diary.',
        diary_no_state: 'This character has no diary yet — open their chat once.',
        diary_empty: 'No entries yet. Let them write the first one.', diary_writing: 'Writing…',
        diary_from_chat: 'from the chat', diary_del: 'Delete entry',
        timeout: 'The model did not answer in time — try again.', open_chat: 'Open conversation',
        set_right: 'Offset right:', set_top: 'Offset top:',
        nokey: 'Set the API key in the phone settings first.',
        noactive: 'Nobody selected — open "Who is online" and enable characters.',
        err: 'The phone stays silent (AI error).',
        clear: 'Clear thread', cleared: 'Thread cleared.',
        just_now: 'just now', min_ago: '{n} min ago', hr_ago: '{n} h ago', day_ago: '{n} d ago'
    }
};
function t(k, v) {
    const lang = settings.language === 'en' ? 'en' : 'ru';
    let s = (L[lang] && L[lang][k] !== undefined) ? L[lang][k] : (L.ru[k] !== undefined ? L.ru[k] : k);
    if (v) for (const key in v) s = s.split('{' + key + '}').join(v[key]);
    return s;
}
function genLang() { return settings.language === 'en' ? 'English' : 'Russian'; }

function escapeHtml(x) {
    return String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function cleanLine(x, max = 400) {
    const s = String(x ?? '').trim();
    if (s.length < 1 || !/\p{L}|\[/u.test(s)) return null;
    if (/^(null|undefined|n\/?a|none|нет|-?\d+)$/i.test(s)) return null;
    return s.slice(0, max);
}

/* ============================================================
   MEDIA + NAME PREFIX
   The model writes "Name: ..." on every line (the prompt asks for
   it) — the name already sits in the bubble header, so repeating it
   inside the text is noise. It also sends media as bracket tags,
   which deserve to LOOK like media instead of raw brackets.
   ============================================================ */
function stripNamePrefix(text) {
    // one leading "Word:" / "Мин-джун:" token — never a whole sentence
    return String(text || '').replace(/^\s*([^\s:]{2,24})\s*:\s+(?=\S)/u, (m, p) => (/\d/.test(p) ? m : ''));
}

// NOTE on \p{L}: JavaScript's \w is ASCII-only, so "голосов\w*" matched just "голосов"
// and the leftover "ое сообщение:" ended up inside the caption ("ое сообщение: холодный
// смешок"). Every Cyrillic stem below uses \p{L} with the /u flag instead.
// The tag may also be a PREFIX with real text after it —
// "[voice message: soft tone] Don't try to catch up all at once" — so each pattern
// captures the caption AND whatever follows the closing bracket.
const RE_PHOTO = /^\[\s*(?:(?:sent|sends|sending)?\s*(?:a\s+)?(?:photo|picture|image|selfie)|отправил[аи]?\s+фото|скинул[аи]?\s+фото|фото|изображени\p{L}*|селфи|картинк\p{L}*)\s*[:\-–—]?\s*([^\]]*?)\s*\]\s*([\s\S]*)$/iu;
const RE_VOICE = /^\[\s*(?:(?:sent|sends|sending)?\s*(?:a\s+)?(?:voice(?:\s*(?:message|note))?|audio(?:\s*message)?)|голосов\p{L}*(?:\s*сообщени\p{L}*)?|аудио(?:\s*сообщени\p{L}*)?|голос)\s*[:\-–—]?\s*([^\]]*?)\s*\]\s*([\s\S]*)$/iu;
const RE_SYSTEM = /^\[\s*(?:SYSTEM|СИСТЕМА)\s*[:\-–—]?\s*([^\]]*?)\s*\]\s*([\s\S]*)$/iu;

// classify a line into a bubble kind; media keeps its caption AND any spoken text
function classify(text) {
    const s = String(text || '').trim();
    let m = s.match(RE_PHOTO);
    if (m) return { type: 'image', text: (m[2] || '').trim(), caption: (m[1] || '').trim() };
    m = s.match(RE_VOICE);
    if (m) return { type: 'voice', text: (m[2] || '').trim(), caption: (m[1] || '').trim() };
    m = s.match(RE_SYSTEM);
    if (m) {
        const rest = (m[2] || '').trim();
        return { type: 'system', text: [(m[1] || '').trim(), rest].filter(Boolean).join(' '), caption: '' };
    }
    return { type: 'text', text: s, caption: '' };
}

// a stable pseudo-duration and waveform, derived from the caption
function voiceMeta(caption) {
    let h = 0;
    for (const c of String(caption || 'v')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const secs = 8 + (h % 68);                      // 0:08 … 1:15
    const bars = [];
    let x = h || 1;
    for (let i = 0; i < 26; i++) { x = (x * 1103515245 + 12345) >>> 0; bars.push(22 + (x % 78)); }
    return { dur: `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, bars };
}

/* ============================================================
   SOUND + NOTIFICATION (self-contained: the main-chat push
   extension never fires for phone messages)
   ============================================================ */
let audioCtx = null;
function actx() {
    if (!audioCtx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audioCtx = new AC(); }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => { });
    return audioCtx;
}
function chime() {
    if (!settings.sound) return;
    const ac = actx(); if (!ac) return;
    const master = ac.createGain(); master.gain.value = 0.45; master.connect(ac.destination);
    const beep = (f, at, dur) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(f, at);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.5, at + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        o.connect(g); g.connect(master); o.start(at); o.stop(at + dur + 0.02);
    };
    const t0 = ac.currentTime + 0.02;
    beep(880, t0, 0.12); beep(1320, t0 + 0.11, 0.16);
}
function notify(name, text, contactId) {
    chime();
    if (!settings.notify || document.hasFocus()) return;
    try {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
        const ch = characters.find(c => c.name === name);
        const icon = ch && ch.avatar ? `${location.origin}/thumbnail?type=avatar&file=${encodeURIComponent(ch.avatar)}` : undefined;
        const n = new Notification(name, { body: String(text).slice(0, 160), icon, silent: true });
        n.onclick = () => { window.focus(); openPhone(); if (contactId) openContact(contactId); };
        setTimeout(n.close.bind(n), 12000);
    } catch (e) { console.debug('[Phone] notification error', e); }
}

/* ============================================================
   THREADS  (keyed by character, NOT by chat — so the phone keeps
   working when a chat is closed or the player is elsewhere)
   ============================================================ */
function threadOf(name) {
    if (!Array.isArray(settings.threads[name])) settings.threads[name] = [];
    return settings.threads[name];
}
function pushMsg(name, who, text, from) {
    registerDiarySources();          // a brand-new thread must be known to the diary too
    const th = threadOf(name);
    th.push({ who, name: from || name, text, ts: Date.now() });
    if (th.length > 200) th.splice(0, th.length - 200);   // keep the store bounded
    saveSettings();
}
function stateOf(name) {
    if (!settings.state[name]) settings.state[name] = { lastInitiative: 0, todayCount: 0, dayStamp: '', ignored: 0 };
    return settings.state[name];
}
function activeNames() {
    return Object.keys(settings.active).filter(n => settings.active[n]);
}

/* ============================================================
   PHONE DIARY
   The RPG Diary lives inside a chat and is only reachable when that
   chat is open. The phone keeps its OWN diary per conversation, so
   the characters can write about the texting itself — and it can be
   read right here, without leaving for the chat.
   ============================================================ */
function phoneDiary(id) {
    if (!Array.isArray(settings.diaries[id])) settings.diaries[id] = [];
    return settings.diaries[id];
}
function dateLabel(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString() + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

// EVERY phone conversation is its own diary "chat" inside RPG Diary — its own
// entries, NPCs, memory — exactly like a normal chat has one. It is never mixed
// with the diary of the character's main-story chat.
function diaryKeyOf(contactId) { return contactId ? 'phone::' + contactId : null; }
function diaryApi() {
    const d = (typeof window !== 'undefined') && window.RPG && window.RPG.diary;
    return (d && d.available && d.supportsExternal) ? d : null;
}
// The diary summarizes whatever transcript it is given; for a phone diary that is
// the conversation itself, formatted the same way ("Name: line").
function transcriptOf(contactId) {
    const you = name1 || 'You';
    return threadOf(contactId).map(m => {
        const who = m.who === 'user' ? you : (m.name || contactLabel(contactId));
        return `${who}: ${String(m.text || '').replace(/\s+/g, ' ').trim()}`;
    }).filter(l => l.length > 3);
}
function registerDiarySources() {
    const api = diaryApi();
    if (!api || typeof api.setExternalSource !== 'function') return;
    const ids = new Set(Object.keys(settings.threads || {}));
    contactList().forEach(id => ids.add(id));
    ids.forEach(id => api.setExternalSource(diaryKeyOf(id), () => transcriptOf(id)));
}

function phoneDiaryState(contactId) {
    const api = diaryApi();
    if (!api) return null;
    try { return api.getExternal(diaryKeyOf(contactId)); } catch (e) { return null; }
}

async function writeDiaryEntry() {
    const cur = currentContact();
    if (!cur || busy) return;
    if (!settings.apiKey) { toastr.warning(t('nokey')); return; }
    const names = contactMembers(cur);
    const author = names[0];
    if (!author) return;

    busy = true; renderDiaryPanel();
    try {
        const sys = `You ARE "${author}". Write a SHORT private diary entry (about 60-120 words) about your recent text conversation with "${name1 || 'them'}" — what was said, what you felt, what you did not say out loud. First person, intimate, in character. No greetings, no headers, no quotes around it. Write in ${genLang()}.
${cardOf(author)}`;
        const usr = [
            timeContext(0),
            diaryBlock([author]),
            `[YOUR RECENT TEXTS]
${threadContext(cur, 30)}`
        ].filter(Boolean).join('\n\n');
        const raw = await callAIComplete(sys, usr);
        const text = cleanLine(String(raw).replace(/^["'«]+|["'»]+$/g, ''), 1800);
        if (text) {
            const api = diaryApi();
            const wrote = api && api.addEntryTo(diaryKeyOf(cur), {
                text, tags: ['📱'], source: 'phone',
                seed: { author, label: contactLabel(cur) + ' 📱' }
            });
            if (wrote) toastr.success(t('diary_saved', { name: author }));
            else {
                // RPG Diary missing/old — keep it locally so nothing is lost
                phoneDiary(cur).unshift({ ts: Date.now(), date: dateLabel(Date.now()), author, text });
                if (phoneDiary(cur).length > 60) phoneDiary(cur).length = 60;
                saveSettings();
                toastr.info(t('diary_no_ext'));
            }
        } else toastr.info(t('err'));
    } catch (e) {
        if (e && e.name === 'AbortError') toastr.info(t('cancelled'));
        else { console.error('[Phone] diary error', e); toastr.warning(t('err')); }
    }
    finishRequest();
    renderDiaryPanel();
}

// Open the RPG Diary extension itself — its book, its UI, its data. Only its own
// floating button knows how to toggle the modal, so we click it. When that chat is
// not the open one (or the extension is absent) we fall back to the local list.
function openRealDiary() {
    const cur = currentContact();
    if (!cur) return;
    registerDiarySources();
    const api = diaryApi();
    const label = contactLabel(cur) + ' 📱';
    if (api) {
        // opens the real diary book ON this conversation's own diary chat
        const ok = api.openExternal(diaryKeyOf(cur), label, { author: contactMembers(cur)[0], label });
        if (ok) return;
        toastr.info(t('diary_no_ext'));
    } else if (window.RPG && window.RPG.diary) {
        toastr.info(t('diary_old_ext'));
    } else {
        toastr.info(t('diary_no_ext'));
    }
    renderDiaryPanel();
    $('#rph-diary-panel').addClass('visible');
}

function renderDiaryPanel() {
    let box = document.getElementById('rph-diary-panel');
    if (!box) {
        box = document.createElement('div');
        box.id = 'rph-diary-panel';
        document.body.appendChild(box);
        box.addEventListener('wheel', e => e.stopPropagation());
    }
    const cur = currentContact();
    if (!cur) { box.innerHTML = ''; return; }
    const own = phoneDiary(cur).map(e => ({ ...e, src: 'phone' }));
    // entries the character wrote in the chat-bound RPG Diary, shown read-only
    let linked = [];
    {
        const author = contactMembers(cur)[0];
        const st = phoneDiaryState(cur) || (settings.useDiary ? diaryStateFor(author) : null);
        if (st && Array.isArray(st.entries)) {
            linked = st.entries.filter(e => e && e.text).slice(-20).map(e => ({
                ts: e.ts || 0, date: e.date || '', author, text: e.text, mood: e.mood || '',
                src: e.source === 'phone' ? 'phone' : 'chat'
            }));
        }
    }
    const all = own.concat(linked).sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 60);

    box.innerHTML = `
        <div class="rph-diary-head">
            <span><i class="fa-solid fa-book"></i> ${escapeHtml(t('diary_title'))} — ${escapeHtml(contactLabel(cur))}</span>
            <i class="fa-solid fa-xmark rph-diary-close"></i>
        </div>
        <div class="rph-diary-list">
            ${all.length ? all.map((e, i) => `
                <div class="rph-entry ${e.src === 'chat' ? 'linked' : ''} ${e.src === 'phone' ? 'fromphone' : ''}">
                    <div class="rph-entry-head">
                        <span>${escapeHtml(e.date || dateLabel(e.ts))}${e.mood ? ' · ' + escapeHtml(e.mood) : ''}</span>
                        ${e.src === 'phone' ? `<span class="rph-entry-src">📱</span>`
                            : e.src === 'chat' ? `<span class="rph-entry-src">${escapeHtml(t('diary_from_chat'))}</span>`
                            : `<i class="fa-solid fa-trash rph-entry-del" data-ts="${e.ts}" title="${escapeHtml(t('diary_del'))}"></i>`}
                    </div>
                    <div class="rph-entry-text">${escapeHtml(e.text)}</div>
                </div>`).join('')
            : `<div class="rph-hint">${escapeHtml(t('diary_empty'))}</div>`}
        </div>
        <button class="menu_button rph-diary-write" ${busy ? 'disabled' : ''}>
            <i class="fa-solid fa-feather"></i> ${escapeHtml(busy ? t('diary_writing') : t('diary_write'))}
        </button>`;

    box.querySelector('.rph-diary-close').onclick = () => box.classList.remove('visible');
    box.querySelector('.rph-diary-write').onclick = writeDiaryEntry;
    box.querySelectorAll('.rph-entry-del').forEach(el => el.onclick = () => {
        const ts = Number(el.dataset.ts);
        settings.diaries[cur] = phoneDiary(cur).filter(x => x.ts !== ts);
        saveSettings();
        renderDiaryPanel();
    });
}

/* ============================================================
   CONTACTS
   Every character is a SEPARATE conversation (its own history,
   its own initiative), plus one optional group thread where the
   whole party of the open group chat texts together.
   ============================================================ */
const GROUP_PREFIX = '#group:';
function isGroup(id) { return String(id || '').startsWith(GROUP_PREFIX); }
function groupContactId() {
    try {
        const ctx = getContext();
        if (!ctx.groupId) return null;
        const g = (ctx.groups || []).find(x => String(x.id) === String(ctx.groupId));
        return g ? GROUP_PREFIX + (g.name || ctx.groupId) : null;
    } catch (e) { return null; }
}
function groupMemberNames(id) {
    try {
        const ctx = getContext();
        const wanted = String(id).slice(GROUP_PREFIX.length);
        const g = (ctx.groups || []).find(x => String(x.name || x.id) === wanted) ||
                  (ctx.groups || []).find(x => String(x.id) === String(ctx.groupId));
        const out = [];
        (g?.members || []).forEach(m => {
            const ch = characters.find(c => c.avatar === m) || characters.find(c => c.name === m);
            if (ch?.name) out.push(ch.name);
        });
        return out.slice(0, 6);
    } catch (e) { return []; }
}
function contactLabel(id) { return isGroup(id) ? String(id).slice(GROUP_PREFIX.length) : id; }
function contactMembers(id) { return isGroup(id) ? groupMemberNames(id) : [id]; }
function contactList() {
    const list = activeNames();
    const gid = groupContactId();
    if (gid && !list.includes(gid) && settings.active[gid]) list.unshift(gid);
    return list;
}
function currentContact() {
    const list = contactList();
    if (!list.length) return null;
    if (settings.current && list.includes(settings.current)) return settings.current;
    settings.current = list[0];
    return settings.current;
}
function openContact(id) {
    lastSig = '';
    settings.current = id;
    if ($('#rph-diary-panel').hasClass('visible')) setTimeout(renderDiaryPanel, 0);
    delete settings.unread[id];
    scrollOffset = 0;
    saveSettings();
    renderBubbles();
}

/* ============================================================
   TIME — they must feel the clock and the calendar
   ============================================================ */
function timeContext(lastTs) {
    const now = new Date();
    const days = settings.language === 'en'
        ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        : ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
    const hh = String(now.getHours()).padStart(2, '0'), mm = String(now.getMinutes()).padStart(2, '0');
    const partOfDay = now.getHours() < 5 ? 'deep night' : now.getHours() < 11 ? 'morning'
        : now.getHours() < 17 ? 'afternoon' : now.getHours() < 22 ? 'evening' : 'night';
    let gap = '';
    if (lastTs) {
        const mins = Math.floor((Date.now() - lastTs) / 60000);
        if (mins < 2) gap = 'They wrote to you moments ago.';
        else if (mins < 60) gap = `${mins} minutes have passed since the last message.`;
        else if (mins < 60 * 24) gap = `${Math.floor(mins / 60)} hours have passed since the last message.`;
        else gap = `${Math.floor(mins / 1440)} days have passed since the last message.`;
    } else gap = 'This is the first message in this thread.';
    return `[REAL TIME: ${now.toLocaleDateString()} (${days[now.getDay()]}), ${hh}:${mm} — ${partOfDay}. ${gap}]`;
}
function agoLabel(ts) {
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 2) return t('just_now');
    if (m < 60) return t('min_ago', { n: m });
    if (m < 1440) return t('hr_ago', { n: Math.floor(m / 60) });
    return t('day_ago', { n: Math.floor(m / 1440) });
}

/* ============================================================
   RPG DIARY BRIDGE
   The phone only carries the last few main-chat messages; the Diary
   holds the whole shared history — long-term memory, the character's
   own private entries, the bond, NPC dossiers. Reading it makes them
   text like people who actually remember you.
   ============================================================ */
function diaryStates() {
    try { return extension_settings['rpg_diary']?.chatStates || {}; } catch (e) { return {}; }
}
// Is this character actually part of the chat that is open right now? (Only the OPEN
// chat's membership is knowable from here.)
function openChatHas(name) {
    try {
        const ctx = getContext();
        if (ctx.groupId) {
            const g = (ctx.groups || []).find(x => String(x.id) === String(ctx.groupId));
            return (g?.members || []).some(m => {
                const ch = characters.find(c => c.avatar === m) || characters.find(c => c.name === m);
                return ch?.name === name;
            });
        }
        return ctx.characterId !== undefined && characters[ctx.characterId]?.name === name;
    } catch (e) { return false; }
}

// The diary that genuinely belongs to THIS character — and nothing else. An earlier
// build fell back to "whatever chat is open", which could feed one character another
// story's memory entirely. Now: no match → no diary block at all.
function diaryStateFor(name) {
    const all = diaryStates();
    const keys = Object.keys(all);
    if (!keys.length || !name) return null;
    let curId = null;
    try { curId = getContext().chatId; } catch (e) { }

    // 1) the open chat — only if this character is really in it (most up to date)
    if (curId && all[curId] && openChatHas(name)) return all[curId];

    // 2) a diary written BY this character (richest one wins)
    const byAuthor = keys.filter(k => all[k] && all[k].author === name);
    if (byAuthor.length) {
        byAuthor.sort((a, b) => (all[b].entries?.length || 0) - (all[a].entries?.length || 0));
        return all[byAuthor[0]];
    }

    // 3) a diary whose NPC dossier lists them (they are a side character there)
    const mention = keys.filter(k => (all[k]?.npcs || []).some(n => n && n.name === name));
    if (mention.length) {
        mention.sort((a, b) => (all[b].entries?.length || 0) - (all[a].entries?.length || 0));
        return all[mention[0]];
    }

    return null;   // deliberately nothing: better no memory than someone else's
}
function clip(x, n) { return String(x || '').replace(/\s+/g, ' ').trim().slice(0, n); }

function diaryBlock(names) {
    if (!settings.useDiary) return '';
    const parts = [];
    const seenStates = new Set();
    for (const n of names.slice(0, 3)) {
        const st = diaryStateFor(n);
        if (!st) continue;
        const bits = [];
        // the shared long-term memory is the same object for everyone in that chat —
        // include it once, not per character
        if (st.summary && !seenStates.has(st)) {
            seenStates.add(st);
            bits.push(`What has happened between you so far: ${clip(st.summary, 1400)}`);
        }
        const ents = Array.isArray(st.entries) ? st.entries.filter(e => e && e.text).slice(-Math.max(0, settings.diaryEntries)) : [];
        if (ents.length && st.author === n) {
            bits.push(`Your own recent private diary entries (your true feelings — never quote them aloud, just let them colour how you write): ` +
                ents.map(e => `[${clip(e.date || '', 40)}${e.mood ? ', ' + clip(e.mood, 30) : ''}] "${clip(e.text, 320)}"`).join(' / '));
        }
        if (st.bond && (st.bond.status || typeof st.bond.trust === 'number')) {
            bits.push(`Your bond with them: ${clip(st.bond.status || '', 160)}${typeof st.bond.trust === 'number' ? ` (trust ${st.bond.trust})` : ''}`);
        }
        if (bits.length) parts.push(`— ${n}:\n${bits.join('\n')}`);
    }
    // the diary of THIS conversation (its own diary chat in RPG Diary)
    const cur = currentContact();
    if (cur) {
        const own = [];
        const st = phoneDiaryState(cur);
        if (st) {
            if (st.summary) own.push(`Memory of your texting: ${clip(st.summary, 900)}`);
            const ents = Array.isArray(st.entries) ? st.entries.filter(e => e && e.text).slice(-Math.max(0, settings.diaryEntries)) : [];
            if (ents.length) own.push(`Your private entries about this conversation: ` +
                ents.map(e => `[${clip(e.date, 40)}] "${clip(e.text, 320)}"`).join(' / '));
        }
        // local fallback when RPG Diary is not installed
        const loc = phoneDiary(cur).slice(0, Math.max(0, settings.diaryEntries));
        if (!st && loc.length) own.push(`Your private entries about this conversation: ` +
            loc.map(e => `[${clip(e.date, 40)}] "${clip(e.text, 320)}"`).join(' / '));
        if (own.length) parts.push(`— ${contactMembers(cur)[0] || ''} (this phone conversation):\n${own.join('\n')}`);
    }
    return parts.length ? `[MEMORY (you remember all of this; it is your shared past):\n${parts.join('\n\n')}\n]` : '';
}

// a phone contact with no character card can still have a Diary dossier
function diaryPersonaOf(name) {
    const st = diaryStateFor(name);
    const n = (st?.npcs || []).find(x => x && x.name === name);
    if (!n) return null;
    return [n.role, n.note, n.look].filter(Boolean).join('; ').replace(/\s+/g, ' ').slice(0, 300);
}

/* ============================================================
   CONTEXT from the main chat + the character card
   ============================================================ */
function mainChatContext() {
    try {
        const ctx = getContext();
        const chat = ctx.chat || [];
        if (!chat.length) return '';
        const n = Math.max(0, settings.mainChatMessages);
        const tail = chat.slice(-n).filter(m => !m.is_system)
            .map(m => `${m.name}: ${String(m.mes || '').replace(/\s+/g, ' ').slice(0, 500)}`).join('\n');
        return tail ? `[WHAT IS HAPPENING IN THE STORY RIGHT NOW (the main roleplay, for context — the phone chat is separate):\n${tail}\n]` : '';
    } catch (e) { return ''; }
}
function cardOf(name) {
    const ch = characters.find(c => c.name === name);
    if (!ch) {
        const dp = diaryPersonaOf(name);   // no card, but the Diary knows them
        return dp ? `${name}: ${dp}` : `${name}: a character of this story.`;
    }
    const parts = [ch.description, ch.personality, ch.scenario].filter(Boolean).join('\n').replace(/\s+/g, ' ');
    return `${name}: ${parts.slice(0, 1200)}`;
}
function threadContext(name, limit = Math.max(2, settings.threadMemory || 24)) {
    const th = threadOf(name).slice(-limit);
    if (!th.length) return '';
    const you = name1 || 'You';
    return th.map(m => `${m.who === 'user' ? you : m.name}: ${m.text}`).join('\n');
}

/* ============================================================
   API
   ============================================================ */
// A hung request used to leave "typing…" forever with no way out: no timeout, no
// abort, and `busy` stayed true so nothing could be sent or regenerated again.
let currentAbort = null;
let watchdog = null;
const REQUEST_TIMEOUT_MS = 90000;

function finishRequest() {
    busy = false;
    currentAbort = null;
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
}
function cancelRequest() {
    if (currentAbort) { try { currentAbort.abort(); } catch (e) { } }
    finishRequest();
    renderBubbles();
}

let lastFinish = '';
async function callAI(system, user) {
    if (!settings.apiKey) throw new Error('no api key');
    const url = (settings.baseUrl || 'https://openrouter.ai/api/v1').replace(/\/$/, '') + '/chat/completions';
    const ctrl = new AbortController();
    currentAbort = ctrl;
    if (watchdog) clearTimeout(watchdog);
    watchdog = setTimeout(() => { try { ctrl.abort(); } catch (e) { } }, REQUEST_TIMEOUT_MS);
    let res;
    try {
        res = await fetch(url, {
            method: 'POST',
            signal: ctrl.signal,
            headers: { 'Authorization': `Bearer ${settings.apiKey.trim()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.model,
                messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
                temperature: settings.temperature,
                // some providers ignore max_tokens and honour max_completion_tokens instead;
                // sending both keeps OpenAI-compatible back-ends happy
                max_tokens: Math.max(120, settings.maxTokens || 900),
                max_completion_tokens: Math.max(120, settings.maxTokens || 900)
            })
        });
    } finally {
        if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    lastFinish = data.choices?.[0]?.finish_reason || '';
    return (data.choices?.[0]?.message?.content || '').trim();
}

// A reply cut off mid-sentence (finish_reason "length") is asked to continue ONCE,
// then stitched back together — providers differ wildly in how much they allow, and
// reasoning models spend part of the same budget invisibly.
async function callAIComplete(system, user) {
    let out = await callAI(system, user);
    if (lastFinish !== 'length' || !out) return out;
    try {
        const tail = out.slice(-400);
        const cont = await callAI(system,
            `${user}\n\n[Your previous reply was cut off. It ended with: "${tail}"\nContinue EXACTLY from where it stopped and output ONLY the continuation — no repetition, no preamble.]`);
        if (cont) {
            const glue = /[\s\n]$/.test(out) || /^[\s\n]/.test(cont) ? '' : (/[.!?…»"]$/.test(out) ? '\n' : '');
            out += glue + cont;
        }
        if (lastFinish === 'length') toastr.info(t('truncated'));
    } catch (e) { toastr.info(t('truncated')); }
    return out;
}

// the model answers in "Name: line" form — split it into separate bubbles
function parseReply(raw, allowed) {
    const out = [];
    for (const line of String(raw).split('\n')) {
        const s = line.trim();
        if (!s) continue;
        const m = s.match(/^\[?([^:\[\]]{1,40}?)\]?\s*:\s*(.+)$/);
        let who = null, text = s;
        if (m) {
            const cand = m[1].trim();
            const hit = allowed.find(n => n.toLowerCase() === cand.toLowerCase());
            if (hit) { who = hit; text = m[2].trim(); }
            else if (/^system$/i.test(cand)) { who = 'SYSTEM'; text = m[2].trim(); }
        }
        if (!who) who = allowed[0];
        const clean = cleanLine(stripNamePrefix(text));
        if (clean) out.push({ name: who, text: clean });
        if (out.length >= 6) break;
    }
    return out;
}

function buildSystem(names, reasonLine) {
    const cards = names.map(cardOf).join('\n\n');
    const you = name1 || 'the player';
    const base = substituteParams
        ? substituteParams(settings.prompt).replace(/\{\{user\}\}/gi, you)
        : settings.prompt.replace(/\{\{user\}\}/gi, you);
    return `${base}

CHARACTERS ON THIS PHONE (write only as these):
${cards}

Language of every message: ${genLang()}.
${reasonLine || ''}`;
}

async function generateReply(names, reasonLine, isInitiative, contactId) {
    const primary = contactId || names[0];
    const th = threadOf(primary);
    const lastTs = th.length ? th[th.length - 1].ts : 0;
    const sys = buildSystem(names, reasonLine);
    const user = [
        timeContext(lastTs),
        diaryBlock(names),
        mainChatContext(),
        threadContext(primary) ? `[YOUR TEXT CONVERSATION SO FAR]\n${threadContext(primary)}` : '',
        isGroup(primary) ? '[This is a GROUP thread: several of you are in the same conversation and may talk to each other.]' : '',
        isInitiative
            ? '[Write the next message(s) NOW, on your own initiative. Do not greet formally; continue naturally from everything above.]'
            : '[Write your reply now.]'
    ].filter(Boolean).join('\n\n');

    const raw = await callAIComplete(sys, user);
    return parseReply(raw, names.concat(['SYSTEM']));
}

/* ============================================================
   SENDING / RECEIVING
   ============================================================ */
async function sendUserText(text) {
    const cur = currentContact();
    if (!cur) { toastr.info(t('noactive')); return; }
    if (!settings.apiKey) { toastr.warning(t('nokey')); return; }
    const clean = cleanLine(text, 800);
    if (!clean || busy) return;

    const names = contactMembers(cur);
    if (!names.length) { toastr.info(t('noactive')); return; }

    pushMsg(cur, 'user', clean, name1 || 'You');
    stateOf(cur).ignored = 0;          // answering resets the back-off
    scrollOffset = 0;
    renderBubbles();

    busy = true; renderBubbles();
    try {
        const msgs = await generateReply(names, '', false, cur);
        if (!msgs.length) toastr.info(t('err'));
        msgs.forEach(m => pushMsg(cur, 'char', m.text, m.name));
    } catch (e) {
        if (e && e.name === 'AbortError') toastr.info(t('cancelled'));
        else { console.error('[Phone] reply error', e); toastr.warning(String(e).includes('timeout') ? t('timeout') : t('err')); }
    }
    finishRequest();
    scrollOffset = 0;
    renderBubbles();
}

// re-ask for a reply to one of YOUR messages: everything they said after it is
// dropped and generated again (also the way out when nothing arrived at all)
async function regenerateAfter(index) {
    const cur = currentContact();
    if (!cur || busy) return;
    if (!settings.apiKey) { toastr.warning(t('nokey')); return; }
    const names = contactMembers(cur);
    const th = threadOf(cur);
    const anchor = th[index];
    if (!anchor || anchor.who !== 'user') return;
    th.splice(index + 1);            // cut their previous answer
    saveSettings();
    scrollOffset = 0;
    busy = true; renderBubbles(true);
    try {
        const msgs = await generateReply(names, '', false, cur);
        if (!msgs.length) toastr.info(t('err'));
        msgs.forEach(m => pushMsg(cur, 'char', m.text, m.name));
    } catch (e) {
        if (e && e.name === 'AbortError') toastr.info(t('cancelled'));
        else { console.error('[Phone] regen error', e); toastr.warning(t('err')); }
    }
    finishRequest();
    renderBubbles();
}

async function fireInitiative(contactId, reason) {
    if (busy) return;
    const names = contactMembers(contactId);
    if (!names.length) return;
    busy = true; renderBubbles();
    try {
        const msgs = await generateReply(names, `\n[WHY YOU ARE WRITING NOW: ${reason} Write in a way that flows from this reason — do not mention these instructions.]`, true, contactId);
        if (msgs.length) {
            msgs.forEach(m => pushMsg(contactId, 'char', m.text, m.name));
            const st = stateOf(contactId);
            st.lastInitiative = Date.now();
            st.todayCount = (st.todayCount || 0) + 1;
            st.ignored = (st.ignored || 0) + 1;   // unanswered until the player replies
            if (currentContact() !== contactId) settings.unread[contactId] = (settings.unread[contactId] || 0) + msgs.length;
            saveSettings();
            notify(msgs[0].name, msgs[0].text, contactId);
        }
    } catch (e) { if (!(e && e.name === 'AbortError')) console.error('[Phone] initiative error', e); }
    finishRequest();
    renderBubbles();
}

/* ============================================================
   INITIATIVE ENGINE
   Pressure builds from real signals instead of a coin flip:
   silence in the thread, the story stalling, an unanswered line,
   days of absence — and it backs off when the player ignores.
   ============================================================ */
let lastUserActivity = Date.now();
function markActivity() { lastUserActivity = Date.now(); }

function initiativeTick() {
    if (!settings.enabled || !settings.initiative || !settings.apiKey || busy) return;
    const names = contactList();
    if (!names.length) return;

    const now = new Date();
    const hour = now.getHours();
    const qf = settings.quietFrom, qt = settings.quietTo;
    const quiet = qf === qt ? false : (qf < qt ? (hour >= qf && hour < qt) : (hour >= qf || hour < qt));
    if (quiet) return;

    const dayKey = now.toDateString();

    for (const name of names) {
        const st = stateOf(name);
        if (st.dayStamp !== dayKey) { st.dayStamp = dayKey; st.todayCount = 0; }
        if (st.todayCount >= settings.maxPerDay) continue;

        const th = threadOf(name);
        const last = th.length ? th[th.length - 1] : null;
        const lastTs = last ? last.ts : 0;
        const sinceMsgMin = lastTs ? (Date.now() - lastTs) / 60000 : 9999;
        const sinceInitMin = st.lastInitiative ? (Date.now() - st.lastInitiative) / 60000 : 9999;

        // being ignored → wait progressively longer (2 unanswered = 3x the gap)
        const backoff = 1 + Math.min(3, st.ignored || 0);
        const gap = settings.minGapMinutes * backoff;
        if (sinceMsgMin < gap || sinceInitMin < gap) continue;

        // --- pressure ---
        let pressure = sinceMsgMin / gap;                       // 1.0 exactly at the threshold
        const idleMin = (Date.now() - lastUserActivity) / 60000;
        if (idleMin > 20) pressure += 0.35;                     // the player stepped away
        if (idleMin > 120) pressure += 0.35;
        if (last && last.who === 'user') pressure += 0.5;       // the player spoke last: answer-ish urge
        if (last && last.who === 'char' && /[?？]\s*$/.test(last.text)) pressure -= 0.3; // they already asked; don't nag
        if (sinceMsgMin > 60 * 24) pressure += 0.6;             // a whole day of silence
        if (sinceMsgMin > 60 * 72) pressure += 0.6;

        // the main story stalling is a strong reason to poke ("where are you, let's continue")
        let storyIdle = 0;
        try {
            const chat = getContext().chat || [];
            const lastMes = chat.length ? chat[chat.length - 1] : null;
            if (lastMes && lastMes.send_date) storyIdle = (Date.now() - new Date(lastMes.send_date).getTime()) / 60000;
        } catch (e) { }
        if (storyIdle > 45) pressure += 0.4;

        pressure += (Math.random() - 0.5) * 0.25;               // a little life, not a metronome

        if (pressure < 1.35) continue;

        // --- a concrete reason, so the message is logical and continues something ---
        let reason;
        if (last && last.who === 'user') reason = `${name1 || 'The player'} wrote to you last and you never answered; ${Math.round(sinceMsgMin)} minutes have passed.`;
        else if (sinceMsgMin > 60 * 48) reason = `You have not talked for ${Math.floor(sinceMsgMin / 1440)} days. You noticed the silence.`;
        else if (storyIdle > 45) reason = `The story you two share has been paused for ${Math.round(storyIdle)} minutes — nothing is moving, and you are getting impatient about it.`;
        else if (idleMin > 120) reason = `${name1 || 'The player'} has been away for ${Math.round(idleMin / 60)} hours. You are thinking about them.`;
        else {
            reason = `It has been quiet for ${Math.round(sinceMsgMin)} minutes and something about the day made you want to write first.`;
            // sometimes what is on their mind is what they just wrote in their diary
            if (settings.useDiary && Math.random() < 0.45) {
                const st = diaryStateFor(contactMembers(name)[0]);
                const ents = Array.isArray(st?.entries) ? st.entries.filter(e => e && e.text) : [];
                const last = ents.length ? ents[ents.length - 1] : null;
                if (last) reason = `Something you wrote privately in your diary is still on your mind — "${clip(last.text, 220)}" — and it made you want to write to them. Never quote the diary; let it only colour the message.`;
            }
        }

        fireInitiative(name, reason);
        break;   // one initiative per tick — never a pile-up
    }
}

/* ============================================================
   UI — a floating arc of bubbles on the right, wheel-scrolled,
   older ones fading out
   ============================================================ */
function avatarHtml(name) {
    const ch = characters.find(c => c.name === name);
    if (ch && ch.avatar) return `<img class="rph-ava" src="/thumbnail?type=avatar&file=${encodeURIComponent(ch.avatar)}" draggable="false">`;
    let hue = 0; for (const c of String(name)) hue = (hue * 31 + c.charCodeAt(0)) % 360;
    const ini = escapeHtml(String(name).trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase());
    return `<span class="rph-ava rph-ava-npc" style="background:hsl(${hue},45%,40%)">${ini}</span>`;
}

function ensureLayer() {
    if (!document.getElementById('rph-layer')) {
        const d = document.createElement('div');
        d.id = 'rph-layer';
        d.innerHTML = `
            <div id="rph-tabs"></div>
            <div id="rph-stack"></div>
            <div id="rph-bar">
                <i class="fa-solid fa-book" id="rph-diary-btn"></i>
                <input type="text" id="rph-input" placeholder="">
                <i class="fa-solid fa-paper-plane" id="rph-send"></i>
            </div>`;
        document.body.appendChild(d);

        d.addEventListener('wheel', (e) => {
            // over the contact strip: scroll the contacts sideways, not the history
            const tabs = e.target.closest && e.target.closest('#rph-tabs');
            if (tabs) { tabs.scrollLeft += (e.deltaY || e.deltaX); e.preventDefault(); return; }
            const th = currentThread();
            const max = Math.max(0, th.length - settings.visibleCount);
            scrollOffset = Math.max(0, Math.min(max, scrollOffset + (e.deltaY > 0 ? -1 : 1)));
            e.preventDefault();
            renderBubbles();
        }, { passive: false });

        $('#rph-diary-btn').on('click', () => openRealDiary());
        $('#rph-send').on('click', () => {
            const v = $('#rph-input').val();
            $('#rph-input').val('');
            sendUserText(v);
        });
        $('#rph-input').on('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') { const v = $(e.target).val(); $(e.target).val(''); sendUserText(v); }
        });
    }
    $('#rph-input').attr('placeholder', t('ph'));
    $('#rph-diary-btn').attr('title', t('diary_btn'));
}

function currentThread() {
    const cur = currentContact();
    return cur ? threadOf(cur) : [];
}

// contact strip: one avatar per conversation, unread dot, click switches
function renderTabs() {
    const box = document.getElementById('rph-tabs');
    if (!box) return;
    const list = contactList();
    const cur = currentContact();
    if (list.length < 2) { if (box.innerHTML) { box.innerHTML = ''; lastTabSig = ''; } box.style.display = 'none'; return; }
    box.style.display = '';
    const tabSig = list.join('|') + '::' + cur + '::' + list.map(id => settings.unread[id] || 0).join(',');
    if (tabSig === lastTabSig) return;   // nothing changed — don't touch the DOM
    lastTabSig = tabSig;
    box.innerHTML = list.map(id => {
        const un = settings.unread[id] || 0;
        const label = contactLabel(id);
        const ava = isGroup(id) ? `<span class="rph-ava rph-ava-npc" style="background:#3c5a8a"><i class="fa-solid fa-users"></i></span>` : avatarHtml(id);
        return `<div class="rph-tab ${id === cur ? 'on' : ''}" data-id="${escapeHtml(id)}" title="${escapeHtml(label)}">
            ${ava}${un ? `<span class="rph-badge">${un > 9 ? '9+' : un}</span>` : ''}
        </div>`;
    }).join('');
    box.querySelectorAll('.rph-tab').forEach(el => el.onclick = () => openContact(el.dataset.id));
    // a long contact list scrolls: make sure the open one is in view
    const on = box.querySelector('.rph-tab.on');
    if (on && box.scrollWidth > box.clientWidth) {
        const left = on.offsetLeft - (box.clientWidth / 2) + (on.offsetWidth / 2);
        box.scrollLeft = Math.max(0, left);
    }
}

function renderBubbles(force) {
    if (force) lastSig = '';
    ensureLayer();
    const layer = document.getElementById('rph-layer');
    const stack = document.getElementById('rph-stack');
    if (!layer || !stack) return;

    layer.style.display = settings.enabled ? '' : 'none';
    layer.style.right = settings.offsetRight + 'px';
    layer.style.top = settings.offsetTop + 'px';
    if (!settings.enabled) return;

    renderTabs();
    const th = currentThread();
    const vis = Math.max(2, settings.visibleCount);
    const end = Math.max(0, th.length - scrollOffset);
    const start = Math.max(0, end - vis);
    const slice = th.slice(start, end);

    const cur = currentContact() || '';
    const lastTs = th.length ? th[th.length - 1].ts : 0;
    const sig = [cur, th.length, lastTs, busy, scrollOffset, settings.bubbleWidth, settings.arcDepth,
        settings.visibleCount, settings.fade, settings.offsetRight, settings.offsetTop, settings.language].join('|');
    if (sig === lastSig) {
        // same content: only the "5 min ago" labels age — update them in place
        const labels = stack.querySelectorAll('.rph-time');
        slice.forEach((m, i) => { if (labels[i]) labels[i].textContent = agoLabel(m.ts); });
        return;
    }
    lastSig = sig;

    const fade = Math.max(0, Math.min(90, settings.fade)) / 100;
    stack.innerHTML = slice.map((m, i) => {
        const gi = start + i;                       // index in the FULL thread (for regen)
        const total = slice.length;
        // subtle semicircle: bulge strongest in the middle of the column
        const norm = total > 1 ? i / (total - 1) : 0.5;
        const bulge = Math.sin(norm * Math.PI) * settings.arcDepth;
        // older = higher up = dimmer, but never unreadable
        const age = total > 1 ? 1 - (i / (total - 1)) : 0;
        const opacity = (1 - age * fade).toFixed(2);
        const mine = m.who === 'user';
        const kind = classify(m.text);

        let inner;
        if (kind.type === 'image') {
            inner = `<div class="rph-photo"><i class="fa-regular fa-image"></i></div>` +
                (kind.caption ? `<div class="rph-caption">${escapeHtml(kind.caption)}</div>` : '') +
                (kind.text ? `<div class="rph-text">${escapeHtml(stripNamePrefix(kind.text))}</div>` : '');
        } else if (kind.type === 'voice') {
            const vm = voiceMeta(kind.caption + kind.text);
            inner = `<div class="rph-voice"><i class="fa-solid fa-play rph-play"></i>` +
                `<span class="rph-wave">${vm.bars.map(b => `<i style="height:${b}%"></i>`).join('')}</span>` +
                `<span class="rph-dur">${vm.dur}</span></div>` +
                // the spoken words go in quotes under the player; the tag itself is the tone
                (kind.text ? `<div class="rph-spoken">«${escapeHtml(stripNamePrefix(kind.text))}»</div>` : '') +
                (kind.caption ? `<div class="rph-caption">${escapeHtml(kind.caption)}</div>` : '');
        } else if (kind.type === 'system') {
            inner = `<div class="rph-sys">${escapeHtml(kind.text)}</div>`;
        } else {
            inner = `<div class="rph-text">${escapeHtml(stripNamePrefix(kind.text))}</div>`;
        }

        // animate a bubble only the first time it appears
        const key = `${cur}|${gi}|${m.ts}`;
        const fresh = !seenKeys.has(key);
        if (fresh) {
            seenKeys.add(key);
            if (seenKeys.size > 600) { const it = seenKeys.values(); for (let k = 0; k < 200; k++) seenKeys.delete(it.next().value); }
        }
        return `<div class="rph-msg ${mine ? 'mine' : ''} ${kind.type === 'system' ? 'sysmsg' : ''} ${fresh ? '' : 'noanim'}" style="opacity:${opacity}; transform:translateX(${-bulge.toFixed(1)}px); max-width:${settings.bubbleWidth}px;">
            ${mine || kind.type === 'system' ? '' : avatarHtml(m.name)}
            <div class="rph-body">
                <div class="rph-head">
                    <span class="rph-name">${escapeHtml(mine ? (name1 || 'You') : m.name)}</span>
                    <span class="rph-time">${escapeHtml(agoLabel(m.ts))}</span>
                    ${mine ? `<i class="fa-solid fa-rotate rph-regen" data-i="${gi}" title="${escapeHtml(t('regen_title'))}"></i>` : ''}
                </div>
                ${inner}
            </div>
        </div>`;
    }).join('') + (busy ? `<div class="rph-msg typing"><div class="rph-body"><div class="rph-text">•••</div></div><i class="fa-solid fa-xmark rph-cancel" title="${escapeHtml(t('cancel_title'))}"></i></div>` : '');

    const cx = stack.querySelector('.rph-cancel');
    if (cx) cx.onclick = (e) => { e.stopPropagation(); cancelRequest(); };

    stack.querySelectorAll('.rph-regen').forEach(el => el.onclick = (e) => {
        e.stopPropagation();
        regenerateAfter(parseInt(el.dataset.i));
    });
    stack.querySelectorAll('.rph-voice').forEach(el => el.onclick = () => el.classList.toggle('playing'));
}

/* ============================================================
   ROSTER + BUTTON
   ============================================================ */
function openPhone() { settings.enabled = true; saveSettings(); renderBubbles(); renderButton(); }

function renderButton() {
    let container = $('#rpg-buttons-container');
    if (container.length === 0) {
        container = $('<div id="rpg-buttons-container" style="position:fixed; bottom:20px; right:20px; display:flex; gap:15px; z-index:3000;"></div>');
        $('body').append(container);
    }
    let btn = $('#rph-btn');
    if (btn.length === 0) {
        btn = $(`<div class="rpg-floating-btn" id="rph-btn" title="${escapeHtml(t('hdr'))}" style="position:static; margin:0;"><i class="fa-solid fa-mobile-screen-button"></i></div>`);
        container.prepend(btn);
        if ($('#rph-roster').length === 0) $('body').append('<div id="rph-roster"><div id="rph-roster-body"></div></div>');
        btn.on('click', () => { renderRoster(); $('#rph-roster').toggleClass('visible'); });
        $(document).off('click.rphRoster').on('click.rphRoster', (e) => {
            if (!document.body.contains(e.target)) return;
            if (!e.target.closest('#rph-roster') && !e.target.closest('#rph-btn')) $('#rph-roster').removeClass('visible');
        });
    }
    btn.toggle(!!settings.enabled);
}

function renderRoster() {
    const body = $('#rph-roster-body');
    if (!body.length) return;
    const ctx = getContext();
    const seen = new Set();
    const list = [];
    // characters of the open chat first, then every card the user owns
    try {
        if (ctx.groupId) {
            const g = (ctx.groups || []).find(x => String(x.id) === String(ctx.groupId));
            (g?.members || []).forEach(m => {
                const ch = characters.find(c => c.avatar === m) || characters.find(c => c.name === m);
                if (ch && !seen.has(ch.name)) { seen.add(ch.name); list.push(ch.name); }
            });
        } else if (ctx.characterId !== undefined && characters[ctx.characterId]) {
            const n = characters[ctx.characterId].name;
            if (!seen.has(n)) { seen.add(n); list.push(n); }
        }
    } catch (e) { }
    characters.forEach(c => { if (c?.name && !seen.has(c.name)) { seen.add(c.name); list.push(c.name); } });

    let html = `<div class="rph-roster-title"><i class="fa-solid fa-mobile-screen-button"></i> ${t('roster')}</div>`;
    // the open group chat gets its own shared conversation
    const gid = groupContactId();
    if (gid) {
        html += `<div class="rph-row group">
            <span class="rph-ava rph-ava-npc" style="background:#3c5a8a"><i class="fa-solid fa-users"></i></span>
            <span class="rph-row-name rph-open" data-open="${escapeHtml(gid)}" title="${escapeHtml(t('open_chat'))}">${escapeHtml(t('group_chat'))}: ${escapeHtml(contactLabel(gid))}</span>
            <div class="rph-toggle ${settings.active[gid] ? 'on' : ''}" data-name="${escapeHtml(gid)}"><div class="rph-knob"></div></div>
        </div>`;
    }
    if (!list.length) html += `<div class="rph-hint">${t('no_chars')}</div>`;
    html += list.slice(0, 60).map(n => `
        <div class="rph-row">
            ${avatarHtml(n)}
            <span class="rph-row-name rph-open" data-open="${escapeHtml(n)}" title="${escapeHtml(t('open_chat'))}">${escapeHtml(n)}${settings.unread[n] ? ` <b class="rph-unread">•</b>` : ''}</span>
            <div class="rph-toggle ${settings.active[n] ? 'on' : ''}" data-name="${escapeHtml(n)}"><div class="rph-knob"></div></div>
        </div>`).join('');
    html += `<div class="rph-roster-actions"><button class="menu_button" id="rph-clear">${t('clear')}</button></div>`;
    body.html(html);

    body.find('.rph-toggle').on('click', function () {
        const n = $(this).data('name');
        settings.active[n] = !settings.active[n];
        if (!settings.active[n]) { delete settings.active[n]; if (settings.current === n) settings.current = ''; }
        else settings.current = n;      // switching someone on opens their thread
        saveSettings();
        scrollOffset = 0;
        renderRoster(); renderBubbles();
    });
    body.find('.rph-open').on('click', function () {
        const id = $(this).data('open');
        if (!settings.active[id]) { settings.active[id] = true; }
        openContact(id);
        renderRoster();
    });
    body.find('#rph-clear').on('click', () => {
        const cur = currentContact();
        if (!cur) return;
        settings.threads[cur] = [];
        settings.state[cur] = { lastInitiative: 0, todayCount: 0, dayStamp: '', ignored: 0 };
        delete settings.unread[cur];
        saveSettings(); scrollOffset = 0; renderBubbles(true);
        toastr.info(t('cleared'));
    });
}

/* ============================================================
   SETTINGS DRAWER
   ============================================================ */
function settingsHtml() { return `
<div class="rph-settings">
    <div class="inline-drawer">
        <div class="rph-drawer-toggle inline-drawer-header" style="cursor:pointer;">
            <b><i class="fa-solid fa-mobile-screen-button"></i> ${t('hdr')}</b>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content" id="rph-drawer" style="display:none; padding-top:10px;">
            <label class="checkbox_label"><input type="checkbox" id="rph-enabled"> ${t('set_enable')}</label>
            <div class="flex-container alignitemscenter flexgap5 margin-b-10" style="margin-top:8px;">
                <label>${t('set_lang')}</label>
                <select id="rph-lang" class="text_pole" style="width:auto;"><option value="ru">Русский</option><option value="en">English</option></select>
            </div>
            <hr class="sysHR"><h4>🔌 ${t('set_api')}</h4>
            <input type="text" id="rph-base" class="text_pole margin-b-10" placeholder="${t('set_url')}" style="width:100%;">
            <input type="password" id="rph-key" class="text_pole margin-b-10" placeholder="${t('set_key')}" style="width:100%;">
            <input type="text" id="rph-model" class="text_pole margin-b-10" placeholder="${t('set_model')}" style="width:100%;">
            <div class="flex-container alignitemscenter flexgap5 margin-b-10">
                <label>${t('set_temp')}</label><input type="number" step="0.1" min="0" max="2" id="rph-temp" class="text_pole" style="width:60px;">
                <label>${t('set_ctx')}</label><input type="number" min="1000" step="1000" id="rph-ctx" class="text_pole" style="width:80px;">
                <label>${t('set_maxtok')}</label><input type="number" min="120" max="8000" step="50" id="rph-maxtok" class="text_pole" style="width:70px;">
            </div>
            <div class="flex-container alignitemscenter flexgap5 margin-b-10">
                <label>${t('set_msgs')}</label><input type="number" min="0" max="50" id="rph-msgs" class="text_pole" style="width:60px;">
                <label>${t('set_thmem')}</label><input type="number" min="2" max="120" id="rph-thmem" class="text_pole" style="width:60px;">
            </div>
            <label class="checkbox_label"><input type="checkbox" id="rph-diary"> ${t('set_diary')}</label>
            <div class="flex-container alignitemscenter flexgap5 margin-b-10" style="padding-left:20px;">
                <label>${t('set_diary_n')}</label><input type="number" min="0" max="10" id="rph-diary-n" class="text_pole" style="width:55px;">
            </div>
            <hr class="sysHR"><h4>⏰ ${t('set_init')}</h4>
            <label class="checkbox_label"><input type="checkbox" id="rph-init"> ${t('set_init_on')}</label>
            <div class="flex-container alignitemscenter flexgap5 margin-b-10">
                <label>${t('set_gap')}</label><input type="number" min="1" max="1440" id="rph-gap" class="text_pole" style="width:70px;">
            </div>
            <div class="flex-container alignitemscenter flexgap5 margin-b-10">
                <label>${t('set_max')}</label><input type="number" min="1" max="50" id="rph-max" class="text_pole" style="width:60px;">
            </div>
            <div class="flex-container alignitemscenter flexgap5 margin-b-10">
                <label>${t('set_quiet')}</label>
                <input type="number" min="0" max="23" id="rph-qf" class="text_pole" style="width:55px;">
                <input type="number" min="0" max="23" id="rph-qt" class="text_pole" style="width:55px;">
            </div>
            <label class="checkbox_label"><input type="checkbox" id="rph-notify"> ${t('set_notify')}</label>
            <label class="checkbox_label"><input type="checkbox" id="rph-sound"> ${t('set_sound')}</label>
            <hr class="sysHR"><h4>🎨 ${t('set_ui')}</h4>
            <div class="flex-container alignitemscenter flexgap5 margin-b-10">
                <label>${t('set_arc')}</label><input type="number" min="0" max="120" id="rph-arc" class="text_pole" style="width:60px;">
                <label>${t('set_width')}</label><input type="number" min="150" max="480" id="rph-width" class="text_pole" style="width:70px;">
            </div>
            <div class="flex-container alignitemscenter flexgap5 margin-b-10">
                <label>${t('set_vis')}</label><input type="number" min="2" max="20" id="rph-vis" class="text_pole" style="width:60px;">
                <label>${t('set_fade')}</label><input type="number" min="0" max="90" id="rph-fade" class="text_pole" style="width:60px;">
                <label>${t('set_right')}</label><input type="number" min="0" max="600" id="rph-right" class="text_pole" style="width:70px;">
                <label>${t('set_top')}</label><input type="number" min="0" max="600" id="rph-top" class="text_pole" style="width:70px;">
            </div>
            <hr class="sysHR"><h4>📝 ${t('set_prompt')}</h4>
            <textarea id="rph-prompt" class="text_pole" rows="8" style="width:100%; font-size:0.8rem;"></textarea>
            <button class="menu_button" id="rph-prompt-reset" style="margin-top:6px;">${t('set_reset')}</button>
        </div>
    </div>
</div>`; }

function setupUI() {
    $('.rph-settings').remove();
    $('#extensions_settings').append(settingsHtml());
    $('.rph-settings .rph-drawer-toggle').on('click', function () {
        $('#rph-drawer').slideToggle();
        $(this).find('.inline-drawer-icon').toggleClass('down up');
    });

    const num = (sel, key, min, max, dflt) => $(sel).val(settings[key]).on('change', function () {
        let v = parseFloat($(this).val());
        if (!isFinite(v)) v = dflt;
        v = Math.max(min, Math.min(max, v));
        settings[key] = v; $(this).val(v); saveSettings(); renderBubbles();
    });

    $('#rph-enabled').prop('checked', settings.enabled).on('change', function () {
        settings.enabled = this.checked; saveSettings(); renderButton(); renderBubbles();
        if (this.checked && typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission();
    });
    $('#rph-lang').val(settings.language).on('change', function () {
        settings.language = $(this).val(); saveSettings();
        setupUI(); $('#rph-drawer').show(); renderBubbles(); renderRoster();
    });
    $('#rph-base').val(settings.baseUrl).on('change', function () { settings.baseUrl = $(this).val().trim(); saveSettings(); });
    $('#rph-key').val(settings.apiKey).on('change', function () { settings.apiKey = $(this).val().trim(); saveSettings(); });
    $('#rph-model').val(settings.model).on('change', function () { settings.model = $(this).val().trim(); saveSettings(); });
    num('#rph-temp', 'temperature', 0, 2, 0.8);
    num('#rph-ctx', 'contextTokens', 1000, 1000000, 32000);
    num('#rph-maxtok', 'maxTokens', 120, 8000, 900);   // thinking models need room for hidden reasoning
    num('#rph-msgs', 'mainChatMessages', 0, 50, 10);
    num('#rph-thmem', 'threadMemory', 2, 120, 24);
    $('#rph-diary').prop('checked', settings.useDiary).on('change', function () { settings.useDiary = this.checked; saveSettings(); });
    num('#rph-diary-n', 'diaryEntries', 0, 10, 2);
    $('#rph-init').prop('checked', settings.initiative).on('change', function () { settings.initiative = this.checked; saveSettings(); });
    num('#rph-gap', 'minGapMinutes', 1, 1440, 25);
    num('#rph-max', 'maxPerDay', 1, 50, 8);
    num('#rph-qf', 'quietFrom', 0, 23, 1);
    num('#rph-qt', 'quietTo', 0, 23, 7);
    $('#rph-notify').prop('checked', settings.notify).on('change', function () { settings.notify = this.checked; saveSettings(); });
    $('#rph-sound').prop('checked', settings.sound).on('change', function () { settings.sound = this.checked; saveSettings(); });
    num('#rph-arc', 'arcDepth', 0, 120, 26);
    num('#rph-width', 'bubbleWidth', 150, 480, 260);
    num('#rph-vis', 'visibleCount', 2, 20, 7);
    num('#rph-fade', 'fade', 0, 90, 35);
    num('#rph-right', 'offsetRight', 0, 600, 16);
    num('#rph-top', 'offsetTop', 0, 600, 90);
    $('#rph-prompt').val(settings.prompt).on('change', function () { settings.prompt = $(this).val(); saveSettings(); });
    $('#rph-prompt-reset').on('click', () => { settings.prompt = DEFAULT_PROMPT; $('#rph-prompt').val(DEFAULT_PROMPT); saveSettings(); });
}

/* ============================================================
   INIT
   ============================================================ */
jQuery(() => {
    loadSettings();
    let tries = 0;
    const mount = () => { if ($('#extensions_settings').length) { setupUI(); return; } if (tries++ < 40) setTimeout(mount, 250); };
    mount();

    renderButton();
    renderBubbles();
    // RPG Diary loads after us (loading_order 116 vs 118) — register once it is there
    setTimeout(registerDiarySources, 1200);
    setTimeout(registerDiarySources, 4000);

    const unlock = () => { actx(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    ['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, markActivity, { passive: true }));
    eventSource.on(event_types.MESSAGE_SENT, markActivity);
    eventSource.on(event_types.CHAT_CHANGED, () => { scrollOffset = 0; renderButton(); renderBubbles(); });

    // the initiative engine keeps ticking regardless of which chat is open — or none at all
    setInterval(initiativeTick, 60000);
    setTimeout(initiativeTick, 15000);
    setInterval(renderBubbles, 60000);   // refresh the "5 min ago" labels
});
