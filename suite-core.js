/* ============================================================================
   Tavern RPG Suite — shared core (suite-core.js)
   The SAME file ships inside every extension of the suite. Whichever copy loads
   first installs it; a newer copy loaded later takes over from an older one.
   An extension never depends on another being installed.

   Inside: DOCK (one seal for the floating buttons), QUEUE (requests to a second model
   one after another), PULSE (what runs in the background), WORLD (one "when and where").

   DOCK — the suite's floating buttons behind one seal.
   Every extension still makes its own button exactly as before (the shared row
   #rpg-buttons-container, or a button of its own on <body>). The dock only gathers
   them: the row becomes a column that unfolds from the seal, each button with its
   name next to it. Clicks, badges, show/hide — all stay the extensions' own.
   The seal can be carried anywhere (kept apart for a phone and a computer), put in
   one of three places, given one of four looks, and set to fold only by itself —
   its settings sit inside "Tavern RPG Suite" when that is installed (a fold like its
   "Connection"), otherwise as a block of their own among the extensions', next to the Menu's.
   Positioned with top/left from the window size: SillyTavern gives <html> a
   transform on narrow screens, and "bottom:" then measures from a 0-px-tall box.
   ============================================================================ */
const CORE_VERSION = 4;

const DOCK_I18N = {
    en: {
        open: 'Suite: open the buttons', close: 'Close the buttons',
        'rpg-map-btn': 'Map', 'rls-btn': 'Living Scene', 'rpg-quest-toggle-btn': 'Quests', 'rdg-btn': 'Rabbit Hole',
        'rpg-diary-btn': 'Diary', 'rpg-vit-btn': 'Vitals', 'rpg-eq-btn': 'Outfit', 'rpg-inventory-btn': 'Backpack',
        'rpg-vnd-btn': 'Vendors', 'tbe-btn': 'Bonds', 'codex-btn': 'Codex', 'rph-btn': 'Phone', 'rpg-game-btn': 'Games', 'rpg-hub-btn': 'Menu',
        news: 'new: {list}',
        set_title: 'Suite seal', set_close: 'Folding', c_auto: 'After a press or a tap outside', c_seal: 'Only by the seal',
        set_look: 'Style', l_wax: 'Neutral', l_det: 'Detective', l_cute: 'Cute', l_dark: 'Midnight', l_fan: 'Fantasy',
        set_desk: 'Place on a computer', set_phone: 'Place on a phone',
        s_right: 'Right, above the message box', s_left: 'Left, above the message box', s_top: 'Right, at the top', s_free: 'Where you left it',
        set_drag: 'Drag the seal with a finger or the mouse to put it anywhere — the place is kept separately for a phone and a computer.',
    },
    ru: {
        open: 'Комплект: открыть кнопки', close: 'Закрыть кнопки',
        'rpg-map-btn': 'Карта', 'rls-btn': 'Живая сцена', 'rpg-quest-toggle-btn': 'Задания', 'rdg-btn': 'Кроличья нора',
        'rpg-diary-btn': 'Дневник', 'rpg-vit-btn': 'Состояние', 'rpg-eq-btn': 'Экипировка', 'rpg-inventory-btn': 'Рюкзак',
        'rpg-vnd-btn': 'Вендоры', 'tbe-btn': 'Связи', 'codex-btn': 'Книга', 'rph-btn': 'Телефон', 'rpg-game-btn': 'Игры', 'rpg-hub-btn': 'Меню',
        news: 'новое: {list}',
        set_title: 'Печать комплекта', set_close: 'Закрытие', c_auto: 'После выбора или нажатия мимо', c_seal: 'Только по печати',
        set_look: 'Стиль', l_wax: 'Нейтральный', l_det: 'Детектив', l_cute: 'Милое', l_dark: 'Полночь', l_fan: 'Фэнтези',
        set_desk: 'Место на компьютере', set_phone: 'Место на телефоне',
        s_right: 'Справа над полем ввода', s_left: 'Слева над полем ввода', s_top: 'Справа сверху', s_free: 'Где оставили',
        set_drag: 'Печать можно перетащить пальцем или мышкой в любое место — оно запомнится отдельно для телефона и для компьютера.',
    },
};
/* order in the column (top → bottom) and the small colour dot each keeps from its old button */
const DOCK_ITEMS = [
    ['rpg-hub-btn', 'menu', '#c6a15b'],
    ['rpg-map-btn', 'world', '#4caf7a'], ['rls-btn', 'world', '#9a7bf0'], ['rpg-quest-toggle-btn', 'world', '#5a9be6'], ['rdg-btn', 'world', '#d0574f'],
    ['rpg-diary-btn', 'hero', '#c79a5a'], ['rpg-vit-btn', 'hero', '#e0705c'], ['rpg-eq-btn', 'hero', '#d39062'], ['rpg-inventory-btn', 'hero', '#c66bb0'], ['rpg-vnd-btn', 'hero', '#5c9cc9'], ['tbe-btn', 'hero', '#d0574f'], ['codex-btn', 'hero', '#9fb6d8'],
    ['rph-btn', 'fun', '#5b8fe0'], ['rpg-game-btn', 'fun', '#7480e8'],
];
const LOOSE = ['rpg-diary-btn', 'rpg-vit-btn', 'rpg-eq-btn', 'rpg-vnd-btn', 'codex-btn'];   // made on <body>, not in the row

function dockLang() {
    try {
        const ctx = window.SillyTavern?.getContext?.();
        const hub = ctx?.extensionSettings?.rpg_hub;
        if (hub && (hub.language === 'ru' || hub.language === 'en')) return hub.language;
        const loc = String((ctx?.getCurrentLocale && ctx.getCurrentLocale()) || localStorage.getItem('language') || navigator.language || '');
        return /^ru/i.test(loc) ? 'ru' : 'en';
    } catch (e) { return 'en'; }
}
const dt = k => (DOCK_I18N[dockLang()] || DOCK_I18N.en)[k] ?? DOCK_I18N.en[k] ?? '';
// inside "Tavern RPG Suite" the settings speak the Suite panel's language, so one panel is never two languages
function suiteLang() {
    try { const l = window.SillyTavern?.getContext?.()?.extensionSettings?.rpg_suite_hub?.language; return (l === 'ru' || l === 'en') ? l : ''; } catch (e) { return ''; }
}
const dockText = (k, lang) => (DOCK_I18N[lang] || DOCK_I18N.en)[k] ?? DOCK_I18N.en[k] ?? '';

/* the seal themes' fonts ship in fonts/seal/ next to this file (every extension carries the same copy) */
const SEAL_FONTS = (() => { try { return new URL('fonts/seal/', import.meta.url).href; } catch (e) { return ''; } })();
/* the drawn seal faces (an id-suffix @ keeps each copy's gradients its own) */
const SEAL_ART = {
    det: '<svg viewBox="0 0 56 56" class="rpgs-art"><defs><radialGradient id="rpgsWx@" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="#c0392b"/><stop offset=".55" stop-color="#8a2c23"/><stop offset="1" stop-color="#4a0f0a"/></radialGradient></defs><path d="M53.0 28.0 C53.1 32.4 51.8 38.1 49.2 41.6 C46.7 45.2 41.9 47.7 37.7 49.3 C33.6 51.0 28.9 52.2 24.6 51.7 C20.3 51.3 15.2 49.5 11.8 46.7 C8.3 43.9 5.0 39.3 4.0 35.1 C3.0 30.8 4.5 25.9 5.6 21.4 C6.7 16.9 7.5 11.0 10.6 8.0 C13.8 4.9 19.8 3.3 24.4 2.9 C29.0 2.5 34.3 3.6 38.2 5.6 C42.2 7.6 45.9 11.2 48.3 15.0 C50.8 18.7 52.8 23.6 53.0 28.0Z" fill="url(#rpgsWx@)"/><circle cx="28" cy="28" r="17" fill="none" stroke="#4a0f0a" stroke-opacity=".55" stroke-width="2.2"/><circle cx="28.6" cy="28.6" r="17" fill="none" stroke="#e07a6a" stroke-opacity=".35" stroke-width="1"/><g class="em"><g transform="translate(0 .6)"><circle cx="28" cy="24" r="4.6" fill="#e9a493" fill-opacity=".45"/><path d="M25.6 26.5h4.8l1.4 9h-7.6z" fill="#e9a493" fill-opacity=".45"/></g><g fill="#f1c9b8" stroke="#f1c9b8" stroke-width="2.4" stroke-linejoin="round" opacity=".9"><circle cx="28" cy="24" r="4.6"/><path d="M25.6 26.5h4.8l1.4 9h-7.6z"/></g><circle cx="28" cy="24" r="4.6" fill="#1f0503"/><path d="M25.6 26.5h4.8l1.4 9h-7.6z" fill="#1f0503"/></g></svg>',
    cute: '<svg viewBox="0 0 56 56" class="rpgs-art"><path d="M49.0 28.0 A7 7 0 0 1 45.0 40.3 A7 7 0 0 1 34.5 48.0 A7 7 0 0 1 21.5 48.0 A7 7 0 0 1 11.0 40.3 A7 7 0 0 1 7.0 28.0 A7 7 0 0 1 11.0 15.7 A7 7 0 0 1 21.5 8.0 A7 7 0 0 1 34.5 8.0 A7 7 0 0 1 45.0 15.7 A7 7 0 0 1 49.0 28.0Z" fill="#f7b6cf" stroke="#fff" stroke-width="4" paint-order="stroke"/><circle cx="28" cy="28" r="12.5" fill="#fde6ef"/><g class="em"><path d="M28.0 19.5L30.4 25.6L36.5 28.0L30.4 30.4L28.0 36.5L25.6 30.4L19.5 28.0L25.6 25.6Z" fill="#8a3d6b"/></g><path d="M45.0 4.0L46.5 7.9L50.7 8.1L47.5 10.8L48.5 14.9L45.0 12.6L41.5 14.9L42.5 10.8L39.3 8.1L43.5 7.9Z" fill="#fbe39a" stroke="#fff" stroke-width="2" paint-order="stroke"/></svg>',
    dark: '<svg viewBox="0 0 56 56" class="rpgs-art"><defs><radialGradient id="rpgsDk@" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#3b2f55"/><stop offset="1" stop-color="#140f1d"/></radialGradient><mask id="rpgsMn@"><rect width="56" height="56" fill="#fff"/><circle cx="33" cy="25" r="10.5" fill="#000"/></mask></defs><path d="M16 9 L19 2 L22.5 8.5 Z M33.5 8.5 L37 2 L40 9 Z" fill="#140f1d" stroke="#a593c9" stroke-width="1"/><circle cx="28" cy="29" r="23" fill="url(#rpgsDk@)" stroke="#a593c9" stroke-width="1.4"/><circle cx="28" cy="29" r="20" fill="none" stroke="#a593c9" stroke-opacity=".35" stroke-width=".8" stroke-dasharray="1.5 3"/><g class="em"><circle cx="27" cy="29" r="11" fill="#efe6ff" mask="url(#rpgsMn@)"/></g><circle cx="38" cy="38" r="1.1" fill="#efe6ff"/><circle cx="17" cy="20" r=".9" fill="#efe6ff"/><circle cx="40" cy="20" r=".7" fill="#efe6ff"/></svg>',
    fan: '<svg viewBox="0 0 56 56" class="rpgs-art"><defs><radialGradient id="rpgsBr@" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#fff1bf"/><stop offset=".3" stop-color="#e6cf86"/><stop offset=".72" stop-color="#b8902f"/><stop offset="1" stop-color="#6e521a"/></radialGradient></defs><circle cx="28" cy="28" r="25" fill="url(#rpgsBr@)" stroke="#5a4214" stroke-width="1.2"/><line x1="49.0" y1="28.0" x2="52.0" y2="28.0" stroke="#5a4214" stroke-width="1"/><line x1="48.3" y1="33.4" x2="49.8" y2="33.8" stroke="#5a4214" stroke-width="1"/><line x1="46.2" y1="38.5" x2="47.6" y2="39.3" stroke="#5a4214" stroke-width="1"/><line x1="42.8" y1="42.8" x2="45.0" y2="45.0" stroke="#5a4214" stroke-width="1"/><line x1="38.5" y1="46.2" x2="39.3" y2="47.6" stroke="#5a4214" stroke-width="1"/><line x1="33.4" y1="48.3" x2="33.8" y2="49.8" stroke="#5a4214" stroke-width="1"/><line x1="28.0" y1="49.0" x2="28.0" y2="52.0" stroke="#5a4214" stroke-width="1"/><line x1="22.6" y1="48.3" x2="22.2" y2="49.8" stroke="#5a4214" stroke-width="1"/><line x1="17.5" y1="46.2" x2="16.7" y2="47.6" stroke="#5a4214" stroke-width="1"/><line x1="13.2" y1="42.8" x2="11.0" y2="45.0" stroke="#5a4214" stroke-width="1"/><line x1="9.8" y1="38.5" x2="8.4" y2="39.3" stroke="#5a4214" stroke-width="1"/><line x1="7.7" y1="33.4" x2="6.2" y2="33.8" stroke="#5a4214" stroke-width="1"/><line x1="7.0" y1="28.0" x2="4.0" y2="28.0" stroke="#5a4214" stroke-width="1"/><line x1="7.7" y1="22.6" x2="6.2" y2="22.2" stroke="#5a4214" stroke-width="1"/><line x1="9.8" y1="17.5" x2="8.4" y2="16.7" stroke="#5a4214" stroke-width="1"/><line x1="13.2" y1="13.2" x2="11.0" y2="11.0" stroke="#5a4214" stroke-width="1"/><line x1="17.5" y1="9.8" x2="16.7" y2="8.4" stroke="#5a4214" stroke-width="1"/><line x1="22.6" y1="7.7" x2="22.2" y2="6.2" stroke="#5a4214" stroke-width="1"/><line x1="28.0" y1="7.0" x2="28.0" y2="4.0" stroke="#5a4214" stroke-width="1"/><line x1="33.4" y1="7.7" x2="33.8" y2="6.2" stroke="#5a4214" stroke-width="1"/><line x1="38.5" y1="9.8" x2="39.3" y2="8.4" stroke="#5a4214" stroke-width="1"/><line x1="42.8" y1="13.2" x2="45.0" y2="11.0" stroke="#5a4214" stroke-width="1"/><line x1="46.2" y1="17.5" x2="47.6" y2="16.7" stroke="#5a4214" stroke-width="1"/><line x1="48.3" y1="22.6" x2="49.8" y2="22.2" stroke="#5a4214" stroke-width="1"/><circle cx="28" cy="28" r="19" fill="none" stroke="#5a4214" stroke-opacity=".6"/><g class="em"><path d="M28.0 13.0L30.3 25.7L43.0 28.0L30.3 30.3L28.0 43.0L25.7 30.3L13.0 28.0L25.7 25.7Z" fill="#3a2c18"/><path d="M28.0 19.0L29.6 26.4L37.0 28.0L29.6 29.6L28.0 37.0L26.4 29.6L19.0 28.0L26.4 26.4Z" fill="#6e521a" transform="rotate(45 28 28)"/><circle cx="28" cy="28" r="2.6" fill="#e6cf86" stroke="#3a2c18"/></g></svg>'
};
const sealArt = (look, sfx) => (SEAL_ART[look] || '').split('@').join(sfx);
const DOCK_CSS = `
#rpg-dock-seal{position:fixed;top:var(--rpgs-top,-200px);left:var(--rpgs-left,-200px);width:var(--rpgs-size,52px);height:var(--rpgs-size,52px);z-index:3001;
 border-radius:50%;display:grid;place-items:center;cursor:pointer;font-size:calc(var(--rpgs-size,52px)*.4);padding:0;margin:0;touch-action:none;user-select:none;-webkit-user-select:none;
 transition:transform 80ms cubic-bezier(.2,.8,.2,1),box-shadow 80ms;-webkit-tap-highlight-color:transparent}
/* the four looks — the seal and the small samples in the settings share them */
.rpgs-face{box-sizing:border-box;position:relative}
/* ---------- the four themes: each its own shapes, papers and ornaments, not a colour swap ----------
   wax (neutral, as before) · det — detective: pinned parchment notes, typed strips taped on, a wax seal with a keyhole
   cute — die-cut grid stickers, washi tape · dark — midnight garden: moon orbs, lilac cards, a cat behind the moon
   fan — field journal: stitched leather bookmarks, torn parchment in a hand, a brass compass */
@font-face{font-family:'RPGS PT Mono';src:url(${SEAL_FONTS}pt-mono-cyrillic-400-normal.woff2) format('woff2');unicode-range:U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:'RPGS PT Mono';src:url(${SEAL_FONTS}pt-mono-latin-400-normal.woff2) format('woff2')}
@font-face{font-family:'RPGS Comfortaa';font-weight:700;src:url(${SEAL_FONTS}comfortaa-cyrillic-700-normal.woff2) format('woff2');unicode-range:U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:'RPGS Comfortaa';font-weight:700;src:url(${SEAL_FONTS}comfortaa-latin-700-normal.woff2) format('woff2')}
@font-face{font-family:'RPGS Cormorant';font-weight:700;src:url(${SEAL_FONTS}cormorant-garamond-cyrillic-700-normal.woff2) format('woff2');unicode-range:U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:'RPGS Cormorant';font-weight:700;src:url(${SEAL_FONTS}cormorant-garamond-latin-700-normal.woff2) format('woff2')}
@font-face{font-family:'RPGS Caveat';font-weight:700;src:url(${SEAL_FONTS}caveat-cyrillic-700-normal.woff2) format('woff2');unicode-range:U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:'RPGS Caveat';font-weight:700;src:url(${SEAL_FONTS}caveat-latin-700-normal.woff2) format('woff2')}
/* the seal: a drawn face for the themes; the compass/cross icon only for the neutral one (and the cross while open) */
#rpg-dock-seal .rpgs-art{position:absolute;inset:-2px;width:calc(100% + 4px);height:calc(100% + 4px);overflow:visible;pointer-events:none;transition:opacity 150ms}
#rpg-dock-seal .rpgs-art .em{transition:opacity 150ms}
.rpgs-face[data-look]:not([data-look="wax"]){background:none;border:0;box-shadow:none}
#rpg-dock-seal[data-look]:not([data-look="wax"]) i{opacity:0;transition:opacity 150ms}
body.rpg-dock-open #rpg-dock-seal[data-look]:not([data-look="wax"]) i{opacity:1}
body.rpg-dock-open #rpg-dock-seal .rpgs-art .em{opacity:0}
#rpg-dock-seal[data-look="det"]{color:#f4d9c8} #rpg-dock-seal[data-look="cute"]{color:#8a3d6b} #rpg-dock-seal[data-look="dark"]{color:#efe6ff} #rpg-dock-seal[data-look="fan"]{color:#3a2c18}
#rpg-dock-seal[data-look]:not([data-look="wax"]){filter:drop-shadow(0 4px 8px rgba(0,0,0,.5))}
#rpg-dock-seal[data-look]:not([data-look="wax"]):focus-visible{outline:1.5px solid rgba(230,207,134,.85);outline-offset:1px}
#rpg-dock-seal[data-look="det"] .rpgs-news{background:radial-gradient(circle at 35% 35%,#d0473a,#7a1a12);color:#fbe9df;border-color:#f4ecd6}
#rpg-dock-seal[data-look="cute"] .rpgs-news{background:#ff7aa8;color:#fff;border-color:#fff;font-family:'RPGS Comfortaa',sans-serif}
#rpg-dock-seal[data-look="dark"] .rpgs-news{background:#c3a8ff;color:#1d1729;border-color:#171221}
#rpg-dock-seal[data-look="fan"] .rpgs-news{background:#e6cf86;color:#3a2c18;border-color:#5a4214}

/* DETECTIVE */
html[data-rpgs-theme="det"] #rpg-buttons-container.rpg-dock > [data-rpgd]{border-radius:2px 3px 2px 4px!important;border:1px solid rgba(120,90,40,.35)!important;color:#3a2c18!important;padding-top:4px!important;
 background:radial-gradient(circle at 50% 5px,#c0392b 0 2.4px,#6f160d 2.8px 3.2px,transparent 3.6px),linear-gradient(225deg,transparent 0 6px,#c9b48a 6px 7.5px,transparent 7.5px),repeating-linear-gradient(8deg,rgba(90,60,20,.07) 0 2px,transparent 2px 5px),radial-gradient(circle at 75% 80%,rgba(140,100,40,.18),transparent 55%),linear-gradient(160deg,#f1e5c6,#dcc89c)!important;
 box-shadow:0 3px 6px rgba(0,0,0,.5)!important}
html[data-rpgs-theme="det"] #rpg-buttons-container.rpg-dock > [data-rpgd]:nth-child(odd){rotate:-4deg} html[data-rpgs-theme="det"] #rpg-buttons-container.rpg-dock > [data-rpgd]:nth-child(even){rotate:3deg}
html[data-rpgs-theme="det"] #rpg-buttons-container.rpg-dock > [data-rpgd] i,html[data-rpgs-theme="det"] #rpg-buttons-container.rpg-dock > [data-rpgd] svg{color:#3a2c18!important}
html[data-rpgs-theme="det"] #rpg-buttons-container.rpg-dock > [data-rpgd] > .rpg-dock-name{font:400 11px/1 'RPGS PT Mono','PT Mono',ui-monospace,monospace;letter-spacing:1.6px;text-transform:uppercase;color:#2b2014;padding:6px 10px 5px;border:0;border-radius:0;
 background:repeating-linear-gradient(0deg,rgba(80,60,30,.07) 0 1px,transparent 1px 4px),#f4ecd6;box-shadow:0 2px 5px rgba(0,0,0,.45)}
html[data-rpgs-theme="det"] #rpg-buttons-container.rpg-dock > [data-rpgd] > .rpg-dock-name::after{content:'';position:absolute;right:-7px;top:-5px;width:20px;height:9px;background:rgba(244,236,214,.6);border:1px solid rgba(255,255,255,.25);transform:rotate(28deg)}
html.rpgs-flip[data-rpgs-theme="det"] #rpg-buttons-container.rpg-dock > [data-rpgd] > .rpg-dock-name::after{right:auto;left:-7px;transform:rotate(-28deg)}
html[data-rpgs-theme="det"] #rpg-buttons-container.rpg-dock > .rpg-dock-sep{width:70px;height:10px;background:no-repeat center/contain url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 70 10%22%3E%3Cpath d=%22M2 5h26M42 5h26%22 stroke=%22%23b8902f%22 stroke-width=%221%22/%3E%3Cpath d=%22M35 1l4 4-4 4-4-4z%22 fill=%22%23b8902f%22/%3E%3Ccircle cx=%2227%22 cy=%225%22 r=%221.4%22 fill=%22%23b8902f%22/%3E%3Ccircle cx=%2243%22 cy=%225%22 r=%221.4%22 fill=%22%23b8902f%22/%3E%3C/svg%3E");margin:2px -14px 2px 0}

/* CUTE */
html[data-rpgs-theme="cute"] #rpg-buttons-container.rpg-dock > [data-rpgd]{border-radius:13px!important;border:2.5px solid #fff!important;color:#5b3d6e!important;
 background:linear-gradient(rgba(150,130,200,.22) 1px,transparent 1px) 0 0/7px 7px,linear-gradient(90deg,rgba(150,130,200,.22) 1px,transparent 1px) 0 0/7px 7px,color-mix(in srgb,var(--rpgs-c,#c6a15b) 26%,#fff)!important;
 box-shadow:0 3px 8px rgba(40,20,60,.4)!important}
html[data-rpgs-theme="cute"] #rpg-buttons-container.rpg-dock > [data-rpgd]:nth-child(odd){rotate:-3deg} html[data-rpgs-theme="cute"] #rpg-buttons-container.rpg-dock > [data-rpgd]:nth-child(even){rotate:2deg}
html[data-rpgs-theme="cute"] #rpg-buttons-container.rpg-dock > [data-rpgd] i,html[data-rpgs-theme="cute"] #rpg-buttons-container.rpg-dock > [data-rpgd] svg{color:#5b3d6e!important}
html[data-rpgs-theme="cute"] #rpg-buttons-container.rpg-dock > [data-rpgd] > .rpg-dock-name{font:700 11.5px/1 'RPGS Comfortaa',ui-rounded,sans-serif;letter-spacing:0;color:#5b3d6e;padding:7px 15px 6px;border:0;border-radius:0;box-shadow:none;
 background:repeating-linear-gradient(45deg,rgba(255,255,255,.35) 0 3px,transparent 3px 7px),#f9c9db;
 clip-path:polygon(0 0,6px 25%,0 50%,6px 75%,0 100%,100% 100%,calc(100% - 6px) 75%,100% 50%,calc(100% - 6px) 25%,100% 0)}
html[data-rpgs-theme="cute"] #rpg-buttons-container.rpg-dock > [data-rpgd="world"] > .rpg-dock-name{background-color:#d8cdf5}
html[data-rpgs-theme="cute"] #rpg-buttons-container.rpg-dock > [data-rpgd="hero"] > .rpg-dock-name{background-color:#fbe7a6}
html[data-rpgs-theme="cute"] #rpg-buttons-container.rpg-dock > [data-rpgd="fun"] > .rpg-dock-name{background-color:#c7ead9}
html[data-rpgs-theme="cute"] #rpg-buttons-container.rpg-dock > .rpg-dock-sep{width:54px;height:12px;background:no-repeat center/contain url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 54 12%22%3E%3Cpath d=%22M8 10 C1 5 4 1 8 4 C12 1 15 5 8 10Z%22 fill=%22%23f7b6cf%22/%3E%3Cpath d=%22M27.0 1.0L28.2 4.4L31.8 4.5L28.9 6.6L29.9 10.0L27.0 8.0L24.1 10.0L25.1 6.6L22.2 4.5L25.8 4.4Z%22 fill=%22%23fbe39a%22/%3E%3Cpath d=%22M46 10 C39 5 42 1 46 4 C50 1 53 5 46 10Z%22 fill=%22%23c9b8f0%22/%3E%3C/svg%3E");margin:2px -6px 2px 0}

/* DARK — midnight garden */
html[data-rpgs-theme="dark"] #rpg-buttons-container.rpg-dock > [data-rpgd]{border-radius:50%!important;border:1.3px solid #a593c9!important;color:#e2d8f5!important;
 background:radial-gradient(circle at 26% 70%,#efe6ff 0 .8px,transparent 1.3px),radial-gradient(circle at 74% 30%,#efe6ff 0 .6px,transparent 1.1px),radial-gradient(circle at 40% 35%,#3b2f55,#171221 75%)!important;
 box-shadow:inset 0 0 0 3px #171221,inset 0 0 0 3.8px rgba(165,147,201,.4),0 3px 8px rgba(0,0,0,.55)!important}
html[data-rpgs-theme="dark"] #rpg-buttons-container.rpg-dock > [data-rpgd] i,html[data-rpgs-theme="dark"] #rpg-buttons-container.rpg-dock > [data-rpgd] svg{color:#e2d8f5!important}
html[data-rpgs-theme="dark"] #rpg-buttons-container.rpg-dock > [data-rpgd] > .rpg-dock-name{font:700 14px/1 'RPGS Cormorant','Cormorant Garamond',Georgia,serif;letter-spacing:0;color:#2a2238;padding:5px 12px 5px 10px;border:1px solid #b8a8cf;border-radius:0;
 background:linear-gradient(180deg,#eee6f2,#d9cde4);box-shadow:0 2px 6px rgba(0,0,0,.5)}
html[data-rpgs-theme="dark"] #rpg-buttons-container.rpg-dock > [data-rpgd] > .rpg-dock-name::before{content:'☾';color:#5c4b80;margin-right:5px;font-size:12px}
html[data-rpgs-theme="dark"] #rpg-buttons-container.rpg-dock > [data-rpgd] > .rpg-dock-name::after{content:'';position:absolute;right:-1px;bottom:-1px;border-style:solid;border-width:0 0 8px 8px;border-color:transparent transparent #4b3d63 transparent}
html[data-rpgs-theme="dark"] #rpg-buttons-container.rpg-dock > .rpg-dock-sep{width:44px;height:14px;background:no-repeat center/contain url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 44 14%22%3E%3Cpath d=%22M22 5c-1.2-2-2.4-2-3 0-3-3-8-3-12 2 3-.5 5 .5 6 2 1-1.5 3-1.5 4 0 1.5-1 3.5-1 5 0 1.5-1 3.5-1 5 0 1-1.5 3-1.5 4 0 1-1.5 3-2.5 6-2-4-5-9-5-12-2-.6-2-1.8-2-3 0z%22 fill=%22%239d8bc0%22/%3E%3C/svg%3E");margin:1px -1px 1px 0}

/* FANTASY — field journal */
html[data-rpgs-theme="fan"] #rpg-buttons-container.rpg-dock > [data-rpgd]{width:46px!important;min-width:46px!important;height:36px!important;border-radius:18px 5px 5px 18px!important;border:0!important;color:#f4ecd6!important;padding-left:4px!important;
 background:repeating-linear-gradient(115deg,rgba(255,255,255,.05) 0 2px,transparent 2px 6px),color-mix(in srgb,var(--rpgs-c,#c6a15b) 50%,#2e2213)!important;
 outline:1px dashed rgba(244,236,214,.6);outline-offset:-4px;box-shadow:0 2px 4px rgba(0,0,0,.5)!important}
html[data-rpgs-theme="fan"] #rpg-buttons-container.rpg-dock > [data-rpgd]:focus-visible{outline:2px solid #e6cf86!important;outline-offset:3px!important}
html[data-rpgs-theme="fan"] #rpg-buttons-container.rpg-dock > [data-rpgd] i,html[data-rpgs-theme="fan"] #rpg-buttons-container.rpg-dock > [data-rpgd] svg{color:#f4ecd6!important}
html[data-rpgs-theme="fan"] #rpg-buttons-container.rpg-dock > [data-rpgd] > .rpg-dock-name{font:700 17px/1 'RPGS Caveat',Caveat,cursive;letter-spacing:0;color:#3a2c18;padding:3px 13px 4px;border:0;border-radius:0;box-shadow:none;
 background:radial-gradient(circle at 80% 30%,rgba(160,120,60,.18),transparent 60%),#f1e7cf;clip-path:polygon(0.0% 0.8px,7.1% 2.3px,14.3% 1.6px,21.4% 2.4px,28.6% 0.9px,35.7% 2.4px,42.9% 0.9px,50.0% 1.7px,57.1% 2.2px,64.3% 2.2px,71.4% 0.6px,78.6% 2.1px,85.7% 2.0px,92.9% 0.8px,100.0% 0.3px,100.0% calc(100% - 1.8px),92.9% calc(100% - 1.8px),85.7% calc(100% - 0.9px),78.6% calc(100% - 1.6px),71.4% calc(100% - 0.8px),64.3% calc(100% - 0.4px),57.1% calc(100% - 1.8px),50.0% calc(100% - 0.0px),42.9% calc(100% - 1.6px),35.7% calc(100% - 1.8px),28.6% calc(100% - 1.2px),21.4% calc(100% - 1.1px),14.3% calc(100% - 0.6px),7.1% calc(100% - 1.0px),0.0% calc(100% - 0.5px))}
html[data-rpgs-theme="fan"] #rpg-buttons-container.rpg-dock > .rpg-dock-sep{width:60px;height:14px;background:no-repeat center/contain url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 60 14%22%3E%3Cpath d=%22M4 9 C20 4 40 4 56 9%22 stroke=%22%234f7d3a%22 stroke-width=%221.3%22 fill=%22none%22/%3E%3Cpath d=%22M14 7 q4 -6 9 -5 q-3 5 -9 5z%22 fill=%22%234f7d3a%22/%3E%3Cpath d=%22M24 7 q4 -6 9 -5 q-3 5 -9 5z%22 fill=%22%236c9a52%22/%3E%3Cpath d=%22M34 7 q4 -6 9 -5 q-3 5 -9 5z%22 fill=%22%234f7d3a%22/%3E%3Cpath d=%22M44 7 q4 -6 9 -5 q-3 5 -9 5z%22 fill=%22%236c9a52%22/%3E%3C/svg%3E");margin:1px -8px 1px 0}
html.rpgs-flip[data-rpgs-theme] #rpg-buttons-container.rpg-dock > .rpg-dock-sep{margin-left:-8px;margin-right:0}
/* the colour dot stays only where the button itself does not carry its colour */
html[data-rpgs-theme="det"] #rpg-buttons-container.rpg-dock > [data-rpgd] > .rpg-dock-dot,html[data-rpgs-theme="cute"] #rpg-buttons-container.rpg-dock > [data-rpgd] > .rpg-dock-dot,html[data-rpgs-theme="fan"] #rpg-buttons-container.rpg-dock > [data-rpgd] > .rpg-dock-dot{display:none}
html[data-rpgs-theme="dark"] #rpg-buttons-container.rpg-dock > [data-rpgd] > .rpg-dock-dot{box-shadow:0 0 0 2px #171221}
@media (prefers-reduced-motion: reduce){#rpg-dock-seal .rpgs-art,#rpg-dock-seal .rpgs-art .em,#rpg-dock-seal[data-look] i{transition:none!important}}
.rpgs-face[data-look="wax"]{color:#f6ead2;background:radial-gradient(circle at 35% 30%,#8a2234 0%,#3a0c16 78%);border:2px solid #c6a15b;box-shadow:0 6px 18px rgba(0,0,0,.55),0 0 0 4px rgba(20,12,18,.8)}
#rpg-dock-seal:hover{transform:scale(1.06)}
#rpg-dock-seal:active{transform:scale(.95);transition-duration:60ms}
#rpg-dock-seal:focus-visible{outline:2px solid #e6cf86;outline-offset:4px}
#rpg-dock-seal i{transition:transform 200ms cubic-bezier(.2,.8,.2,1);position:relative;z-index:1}
body.rpg-dock-open #rpg-dock-seal i{transform:rotate(90deg)}
/* news inside: a button behind the seal shows its own sign (a new event, an unread letter) — the seal shows how many */
#rpg-dock-seal .rpgs-news{position:absolute;top:-4px;left:-4px;min-width:18px;height:18px;border-radius:9px;background:#e6cf86;color:#2b2014;border:2px solid #2b2014;
 font:800 11px/14px Alegreya,Georgia,serif;text-align:center;padding:0 3px;box-sizing:border-box;z-index:2;pointer-events:none;animation:rpgs-news 1.4s cubic-bezier(.4,0,.6,1) infinite alternate}
#rpg-dock-seal .rpgs-news[hidden]{display:none}
@keyframes rpgs-news{to{transform:scale(1.15);box-shadow:0 0 0 3px rgba(230,207,134,.35)}}
#rpg-dock-seal[hidden]{display:none!important}
/* carried by a finger or the mouse: lifted a little */
body.rpg-dock-drag #rpg-dock-seal{cursor:grabbing;transition:none;will-change:transform}
body.rpg-dock-drag{user-select:none;-webkit-user-select:none}
html body #rpg-buttons-container.rpg-dock{position:fixed!important;top:var(--rpgs-y,-200px)!important;bottom:auto!important;right:auto!important;left:0!important;
 width:auto!important;height:auto!important;box-sizing:border-box!important;
 transform:translate(calc(var(--rpgs-x,-200px) - 100%), calc(-100% - 12px))!important;
 display:flex!important;flex-direction:column!important;align-items:flex-end!important;gap:7px!important;padding:9px 9px 6px 170px!important;
 max-height:var(--rpgs-maxh,300px)!important;overflow-y:auto!important;overflow-x:visible!important;scrollbar-width:none!important;
 z-index:3000!important;pointer-events:none;visibility:hidden;transition:visibility 0s linear 150ms}
/* the seal on the left: the column hangs to the right, names after the buttons */
html.rpgs-flip body #rpg-buttons-container.rpg-dock{transform:translate(var(--rpgs-x,-200px), calc(-100% - 12px))!important;align-items:flex-start!important;padding:9px 170px 6px 9px!important}
/* the seal high up: the column opens downwards */
html.rpgs-down body #rpg-buttons-container.rpg-dock{transform:translate(calc(var(--rpgs-x,-200px) - 100%), 0)!important}
html.rpgs-down.rpgs-flip body #rpg-buttons-container.rpg-dock{transform:translate(var(--rpgs-x,-200px), 0)!important}
html body #rpg-buttons-container.rpg-dock::-webkit-scrollbar{display:none}
body.rpg-dock-open #rpg-buttons-container.rpg-dock{visibility:visible;transition:none}
/* only the buttons and the plate take presses: the empty room for the names lets them through to the chat */
body.rpg-dock-open #rpg-buttons-container.rpg-dock > [data-rpgd],body.rpg-dock-open #rpg-buttons-container.rpg-dock > #rpg-pulse{pointer-events:auto}
#rpg-buttons-container.rpg-dock > .rpg-dock-sep{order:var(--rpgs-o,var(--o));width:22px;height:1px;flex:none;margin:1px 11px 1px 0;background:linear-gradient(90deg,transparent,#c6a15b,transparent);opacity:0;transition:opacity 150ms}
html.rpgs-flip #rpg-buttons-container.rpg-dock > .rpg-dock-sep{margin:1px 0 1px 11px}
body.rpg-dock-open #rpg-buttons-container.rpg-dock > .rpg-dock-sep{opacity:.7}
#rpg-buttons-container.rpg-dock > [data-rpgd]{order:var(--rpgs-o)!important;position:relative!important;inset:auto!important;top:auto!important;left:auto!important;right:auto!important;bottom:auto!important;margin:0!important;
 width:42px!important;height:42px!important;min-width:42px!important;flex:none!important;box-sizing:border-box!important;border-radius:50%!important;align-items:center!important;justify-content:center!important;
 background:radial-gradient(circle at 35% 28%,#3a2f38,#17121a 75%)!important;border:1px solid rgba(198,161,91,.6)!important;color:#efe3c8!important;font-size:16px!important;
 box-shadow:0 2px 8px rgba(0,0,0,.5),inset 0 0 0 2px rgba(0,0,0,.35)!important;filter:none!important;
 opacity:0;transform:translateY(8px) scale(.96);transition:opacity 150ms cubic-bezier(.4,0,1,1),transform 150ms cubic-bezier(.4,0,1,1),box-shadow 80ms!important}
html.rpgs-down #rpg-buttons-container.rpg-dock > [data-rpgd]{transform:translateY(-8px) scale(.96)}
#rpg-buttons-container.rpg-dock > [data-rpgd] i{color:#efe3c8!important;font-size:16px!important}
#rpg-buttons-container.rpg-dock > [data-rpgd] svg{width:20px!important;height:20px!important;color:#efe3c8!important;fill:currentColor}
#rpg-buttons-container.rpg-dock > [data-rpgd]:hover{transform:translateY(0) scale(1.06)!important;box-shadow:0 4px 12px rgba(198,161,91,.35),inset 0 0 0 2px rgba(0,0,0,.35)!important}
#rpg-buttons-container.rpg-dock > [data-rpgd]:focus-visible{outline:2px solid #e6cf86!important;outline-offset:3px!important}
body.rpg-dock-open #rpg-buttons-container.rpg-dock > [data-rpgd]{opacity:1;transform:none;transition:opacity 200ms cubic-bezier(.2,.8,.2,1) calc(var(--rpgs-i,0)*18ms),transform 200ms cubic-bezier(.2,.8,.2,1) calc(var(--rpgs-i,0)*18ms),box-shadow 80ms!important}
/* the colour dot — the old button's colour, as a small mark next to the line icon */
#rpg-buttons-container.rpg-dock > [data-rpgd] > .rpg-dock-dot{position:absolute;right:0;bottom:0;width:10px;height:10px;border-radius:50%;background:var(--c);box-shadow:0 0 0 2px #17121a;pointer-events:none}
/* the name, always shown next to the button while the column is open (never hover-only) */
#rpg-buttons-container.rpg-dock > [data-rpgd] > .rpg-dock-name{position:absolute;right:calc(100% + 9px);top:50%;transform:translateY(-50%);white-space:nowrap;pointer-events:none;
 font:600 13px/1 Alegreya,'Palatino Linotype',Georgia,serif;letter-spacing:.3px;color:#f3e7cc;background:rgba(22,17,24,.92);border:1px solid rgba(198,161,91,.4);padding:6px 10px;border-radius:12px;
 box-shadow:0 3px 10px rgba(0,0,0,.4)}
html.rpgs-flip #rpg-buttons-container.rpg-dock > [data-rpgd] > .rpg-dock-name{right:auto;left:calc(100% + 9px)}
/* news: while the column is closed, a button showing its own sign (a new event, unread letters) stands by the seal
   with its name — the others step out of the way */
body:not(.rpg-dock-open):not(.rls-novel-on) #rpg-buttons-container.rpg-dock[data-rpgs-peek] > [data-rpgd]:not([data-rpgs-hot]),
body:not(.rpg-dock-open):not(.rls-novel-on) #rpg-buttons-container.rpg-dock[data-rpgs-peek] > .rpg-dock-sep,
body:not(.rpg-dock-open):not(.rls-novel-on) #rpg-buttons-container.rpg-dock[data-rpgs-peek] > #rpg-pulse{position:absolute!important}
body:not(.rpg-dock-open):not(.rls-novel-on) #rpg-buttons-container.rpg-dock > [data-rpgd][data-rpgs-hot]{visibility:visible;opacity:1;transform:none;pointer-events:auto}
/* phone: the window over the menu keeps its own button reachable, as before */
body.rpg-hub-phone #rpg-buttons-container.rpg-dock{pointer-events:auto;visibility:visible}
body.rpg-hub-phone #rpg-buttons-container.rpg-dock > #rph-btn{opacity:1;transform:none}
body.rls-novel-on #rpg-dock-seal{visibility:hidden!important;pointer-events:none!important}
/* settings: the four looks as small seals to press */
#rpg-dock-settings .rpgs-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:6px 0}
#rpg-dock-settings .rpgs-row > label{min-width:150px}
#rpg-dock-settings .rpgs-row select{flex:1;min-width:170px;max-width:100%}
#rpg-dock-settings .rpgs-looks{display:flex;gap:12px;flex-wrap:wrap}
#rpg-dock-settings .rpgs-look{all:unset;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;padding:6px 6px 4px;border-radius:10px;border:1px solid transparent;min-width:62px}
#rpg-dock-settings .rpgs-look .rpgs-face{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-size:15px}
#rpg-dock-settings .rpgs-look .rpgs-face svg{width:42px;height:42px;overflow:visible}
#rpg-dock-settings .rpgs-look span:last-child{font-size:12.5px;line-height:1.1}
#rpg-dock-settings .rpgs-look[aria-pressed="true"]{border-color:#c6a15b;background:rgba(198,161,91,.14)}
#rpg-dock-settings .rpgs-look:focus-visible{outline:2px solid #e6cf86;outline-offset:2px}
#rpg-dock-settings.rpgs-inhub .rpgs-head .fa-compass{opacity:.85}
#rpg-dock-settings.rpgs-inhub .rpgs-head:focus-visible{outline:2px solid #e6cf86;outline-offset:2px}
#rpg-dock-settings.rpgs-inhub .rpgs-body{padding:8px 4px 2px}
#rpg-dock-settings .rpgs-hint{font-size:12.5px;opacity:.85;margin:4px 0 2px;line-height:1.35}
@media (prefers-reduced-motion: reduce){
 #rpg-dock-seal,#rpg-dock-seal i,#rpg-buttons-container.rpg-dock > [data-rpgd],body.rpg-dock-open #rpg-buttons-container.rpg-dock > [data-rpgd]{transition:none!important}
 #rpg-buttons-container.rpg-dock > [data-rpgd],html.rpgs-down #rpg-buttons-container.rpg-dock > [data-rpgd]{transform:none}
 body.rpg-dock-drag #rpg-dock-seal{transition:none}
 #rpg-dock-seal .rpgs-news{animation:none}}
`;

/* The seal's own settings (extensionSettings.rpg_dock) — kept by the core, so they work with or without the Menu.
   close: 'auto' (folds after a press, a tap outside, Escape) | 'seal' (only the seal folds it)
   look:  'wax' | 'medal' | 'leather' | 'compass'
   desk / phone: { spot: 'right' | 'left' | 'top' | 'free', x, y } — x, y: the seal's centre as a share of the window (0…1) */
const DOCK_LOOKS = ['wax', 'det', 'cute', 'dark', 'fan'];   // older saved looks (medal, leather, compass) fall back to the neutral one
const DOCK_SPOTS = ['right', 'left', 'top', 'free'];
const DOCK_DEFAULT = () => ({ close: 'auto', look: 'wax', desk: { spot: 'right', x: null, y: null }, phone: { spot: 'right', x: null, y: null } });
function dockCfg() {
    let es = null;
    try { es = window.SillyTavern?.getContext?.()?.extensionSettings || null; } catch (e) { es = null; }
    if (!es) return DOCK_DEFAULT();
    let s = es.rpg_dock;
    if (!s || typeof s !== 'object' || Array.isArray(s)) s = es.rpg_dock = DOCK_DEFAULT();
    if (s.close !== 'auto' && s.close !== 'seal') s.close = 'auto';
    if (!DOCK_LOOKS.includes(s.look)) s.look = 'wax';
    for (const d of ['desk', 'phone']) {
        let v = s[d];
        if (!v || typeof v !== 'object' || Array.isArray(v)) v = s[d] = { spot: 'right', x: null, y: null };
        if (!DOCK_SPOTS.includes(v.spot)) v.spot = 'right';
        for (const k of ['x', 'y']) if (!(typeof v[k] === 'number' && isFinite(v[k]) && v[k] >= 0 && v[k] <= 1)) v[k] = null;
        if (v.spot === 'free' && (v.x === null || v.y === null)) v.spot = 'right';
    }
    return s;
}
function dockSave() { try { window.SillyTavern?.getContext?.()?.saveSettingsDebounced?.(); } catch (e) { /* not saved this time */ } }

function installDock(core) {
    const doc = document;
    const root = doc.documentElement;
    const offs = [];                          // everything to let go of on dispose
    const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn, o)); };
    const style = doc.createElement('style');
    style.id = 'rpg-dock-style';
    style.textContent = DOCK_CSS;
    doc.head.appendChild(style);
    const seal = doc.createElement('button');
    seal.type = 'button';
    seal.id = 'rpg-dock-seal';
    seal.className = 'rpgs-face';
    seal.hidden = true;
    seal.setAttribute('aria-expanded', 'false');
    seal.setAttribute('aria-controls', 'rpg-buttons-container');
    seal.innerHTML = '<span class="rpgs-art-slot" aria-hidden="true"></span><i class="fa-solid fa-compass" aria-hidden="true"></i><span class="rpgs-news" hidden aria-hidden="true"></span>';
    doc.body.appendChild(seal);
    const newsEl = seal.querySelector('.rpgs-news');
    let open = false;
    let down = false;                         // the column opens downwards (the seal is high up)
    let cur = { top: -200, left: -200, size: 52, phone: false };
    const box = () => doc.getElementById('rpg-buttons-container');
    const ensureBox = () => {
        let b = box();
        if (!b) {   // same element the extensions make, so whoever comes next appends to it
            b = doc.createElement('div');
            b.id = 'rpg-buttons-container';
            b.setAttribute('style', 'position:fixed; bottom:20px; right:20px; display:flex; gap:15px; z-index:3000;');
            doc.body.appendChild(b);
        }
        return b;
    };
    const labels = () => {
        const st = [dt(open ? 'close' : 'open'), core.sealNote, core.newsNote].filter(Boolean).join(' · ');
        if (seal.title !== st) { seal.title = st; seal.setAttribute('aria-label', st); }
        const b = box(); if (!b) return;
        b.querySelectorAll(':scope > [data-rpgd] > .rpg-dock-name').forEach(n => { const id = n.parentElement.id; const v = dt(id) || n.parentElement.title || ''; if (n.textContent !== v) n.textContent = v; });
    };
    const setVar = (el, k, v) => { if (el.style.getPropertyValue(k) !== v) el.style.setProperty(k, v); };
    const shown = el => el && el.style.display !== 'none' && getComputedStyle(el).display !== 'none';
    // the column's order runs from the far end to the seal; opening downwards turns it round
    const ord = n => String(down ? 200 - n : n);
    let syncing = false;
    function sync() {
        if (syncing) return;
        syncing = true;
        try {
            const b = ensureBox();
            if (!b.classList.contains('rpg-dock')) b.classList.add('rpg-dock');
            for (const id of LOOSE) { const el = doc.getElementById(id); if (el && el.parentElement !== b) b.appendChild(el); }
            const kids = [...b.children].filter(k => !k.classList.contains('rpg-dock-sep') && k.id !== 'rpg-pulse');
            const order = new Map(DOCK_ITEMS.map(([id, g, c], n) => [id, { n, g, c }]));
            const visible = [];
            for (const k of kids) {
                const meta = order.get(k.id) || { n: 50, g: 'fun', c: '#c6a15b' };
                if (k.getAttribute('data-rpgd') !== meta.g) k.setAttribute('data-rpgd', meta.g);
                setVar(k, '--rpgs-o', ord(meta.n * 2));
                setVar(k, '--rpgs-c', meta.c);
                if (!k.querySelector(':scope > .rpg-dock-name')) {   // (again, if its owner redrew the button)
                    const dot = doc.createElement('span'); dot.className = 'rpg-dock-dot'; dot.style.setProperty('--c', meta.c); dot.setAttribute('aria-hidden', 'true');
                    const name = doc.createElement('span'); name.className = 'rpg-dock-name'; name.setAttribute('aria-hidden', 'true');
                    k.appendChild(dot); k.appendChild(name);
                }
                if (shown(k)) visible.push({ k, meta });
            }
            // a thin rule between the groups that are actually there (rebuilt only when they change)
            visible.sort((x, y) => x.meta.n - y.meta.n);
            const seps = [];
            for (let n = 1; n < visible.length; n++) if (visible[n].meta.g !== visible[n - 1].meta.g) seps.push(visible[n].meta.n * 2 - 1);
            const sig = (down ? 'd' : 'u') + seps.join(',');
            // (an older core still loaded may have redrawn them its own way: then they are drawn again)
            const mineN = b.querySelectorAll(':scope > .rpg-dock-sep[data-rpgs]').length, allN = b.querySelectorAll(':scope > .rpg-dock-sep').length;
            if (b.__rpgsSeps !== sig || mineN !== seps.length || allN !== seps.length) {
                b.__rpgsSeps = sig;
                b.querySelectorAll(':scope > .rpg-dock-sep').forEach(s => s.remove());
                for (const o of seps) {
                    const s = doc.createElement('div'); s.className = 'rpg-dock-sep'; s.dataset.rpgs = '1'; s.setAttribute('aria-hidden', 'true');
                    s.style.setProperty('--rpgs-o', ord(o));
                    b.appendChild(s);
                }
            }
            const p = doc.getElementById('rpg-pulse');            // the pulse plate: always at the far end
            if (p) setVar(p, '--rpgs-po', down ? '999' : '-10');
            // stagger from the seal outwards
            visible.slice().reverse().forEach((v, n) => setVar(v.k, '--rpgs-i', String(n)));
            seal.hidden = !visible.length;
            if (!visible.length && open) setOpen(false);
            news();
            labels();
        } finally { syncing = false; }
    }
    // a button's own sign (anything of its own called "…badge…", shown) means news behind the seal
    function news() {
        const b = box();
        const hot = [];
        if (b) for (const k of b.querySelectorAll(':scope > [data-rpgd]')) {
            if (!shown(k)) continue;
            // (drawn = has a box; the closed column itself is invisible, so visibility says nothing here)
            const sign = [...k.querySelectorAll('[class*="badge"]')].some(x => !x.hidden && x.getClientRects().length > 0 && +getComputedStyle(x).opacity > 0.05);
            if (sign) hot.push(dt(k.id) || k.title || '');
            if (sign !== k.hasAttribute('data-rpgs-hot')) k.toggleAttribute('data-rpgs-hot', sign);
        }
        // a button with news peeks out by the closed seal, as it used to stand on the screen
        if (b && b.hasAttribute('data-rpgs-peek') !== !!hot.length) b.toggleAttribute('data-rpgs-peek', !!hot.length);
        const n = hot.length;
        if (newsEl.hidden !== !n) newsEl.hidden = !n;
        const txt = n > 9 ? '9+' : String(n);
        if (n && newsEl.textContent !== txt) newsEl.textContent = txt;
        const note = n ? dt('news').replace('{list}', hot.filter(Boolean).join(', ')) : '';
        if (core.newsNote !== note) { core.newsNote = note; labels(); }
    }
    let newsRaf = 0;
    const newsSoon = () => { if (!newsRaf) newsRaf = requestAnimationFrame(() => { newsRaf = 0; news(); }); };
    let drag = null;                          // { id, sx, sy, ox, oy, on, x, y }
    function place() {
        const W = window.innerWidth, H = window.innerHeight;
        const phone = W <= 700;
        const size = phone ? 48 : 52;
        const margin = phone ? 12 : 22;
        const cfg = dockCfg();
        const mine = cfg[phone ? 'phone' : 'desk'];
        if (seal.dataset.look !== cfg.look) {
            seal.dataset.look = cfg.look;
            seal.querySelector('.rpgs-art-slot').innerHTML = sealArt(cfg.look, 'S');
        }
        if (root.getAttribute('data-rpgs-theme') !== cfg.look) root.setAttribute('data-rpgs-theme', cfg.look);
        const sf = doc.getElementById('send_form');
        const r = sf && sf.offsetParent !== null ? sf.getBoundingClientRect() : null;
        const above = r && r.top > 80 && r.top < H ? r.top : H - 20;
        const tb = doc.getElementById('top-bar');
        const tbB = tb ? Math.round(tb.getBoundingClientRect().bottom) : 40;
        const lowTop = Math.max(70, Math.round(above - 14 - size));
        const clampX = x => Math.round(Math.min(Math.max(x, 4), W - size - 4));
        const clampY = y => Math.round(Math.min(Math.max(y, tbB + 4), H - size - 4));
        let top, left;
        if (mine.spot === 'left') { top = lowTop; left = margin; }
        else if (mine.spot === 'top') { top = tbB + 14; left = W - margin - size; }
        else if (mine.spot === 'free') { left = clampX(mine.x * W - size / 2); top = clampY(mine.y * H - size / 2); }
        else { top = lowTop; left = W - margin - size; }
        cur = { top, left, size, phone };
        const flip = left + size / 2 < W / 2;
        const wasDown = down;
        down = top + size / 2 < H / 2;
        if (root.classList.contains('rpgs-flip') !== flip) root.classList.toggle('rpgs-flip', flip);
        if (root.classList.contains('rpgs-down') !== down) root.classList.toggle('rpgs-down', down);
        const room = tbB + 22;
        const maxh = down ? Math.min(H, above) - (top + size + 12) - 10 : top - room;   // downwards: to the message box, not over it
        setVar(root, '--rpgs-top', top + 'px');
        setVar(root, '--rpgs-left', left + 'px');
        setVar(root, '--rpgs-size', size + 'px');
        setVar(root, '--rpgs-x', Math.round(left + size / 2 + (flip ? -30 : 30)) + 'px');
        setVar(root, '--rpgs-y', (down ? top + size + 12 : top) + 'px');
        setVar(root, '--rpgs-maxh', Math.max(120, Math.round(maxh)) + 'px');
        if (wasDown !== down) sync();
    }
    function setOpen(v) {
        open = !!v;
        doc.body.classList.toggle('rpg-dock-open', open);
        seal.setAttribute('aria-expanded', String(open));
        seal.querySelector('i').className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-compass';
        labels();
        if (open) { place(); const b = box(); if (b) b.scrollTop = down ? 0 : b.scrollHeight; }
    }
    // carry the seal anywhere (a finger or the mouse); a short press is still a press
    let dragged = false;
    on(seal, 'pointerdown', e => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        const tb = doc.getElementById('top-bar');
        drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: cur.left, oy: cur.top, on: false, x: cur.left, y: cur.top, raf: 0, minY: (tb ? Math.round(tb.getBoundingClientRect().bottom) : 40) + 4 };
        try { seal.setPointerCapture(e.pointerId); } catch (err) { /* old browser: moves still reach the seal */ }
    });
    on(seal, 'pointermove', e => {
        if (!drag || e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
        if (!drag.on) {
            if (Math.hypot(dx, dy) < 8) return;
            drag.on = true;
            if (open) setOpen(false);
            doc.body.classList.add('rpg-dock-drag');
        }
        e.preventDefault();
        // only the seal moves while carried — by transform, once a frame; nothing else on the page is
        // touched until it is put down (moving the column and the page's variables each move was what made it stutter)
        const W = window.innerWidth, H = window.innerHeight, s = cur.size;
        drag.x = Math.round(Math.min(Math.max(drag.ox + dx, 4), W - s - 4));
        drag.y = Math.round(Math.min(Math.max(drag.oy + dy, drag.minY, 4), H - s - 4));
        if (!drag.raf) drag.raf = requestAnimationFrame(() => { if (!drag) return; drag.raf = 0; seal.style.transform = `translate3d(${drag.x - drag.ox}px, ${drag.y - drag.oy}px, 0) scale(1.12)`; });
    });
    const drop = e => {
        if (!drag || (e && e.pointerId !== drag.id)) return;
        const d = drag; drag = null;
        if (d.raf) cancelAnimationFrame(d.raf);
        try { seal.releasePointerCapture(d.id); } catch (err) { /* already let go */ }
        if (!d.on) return;
        seal.style.transform = '';
        doc.body.classList.remove('rpg-dock-drag');
        dragged = true;
        setTimeout(() => { dragged = false; }, 400);
        const cfg = dockCfg();
        const W = window.innerWidth, H = window.innerHeight, s = cur.size;
        const mine = cfg[W <= 700 ? 'phone' : 'desk'];
        mine.spot = 'free';
        mine.x = Math.min(1, Math.max(0, (d.x + s / 2) / W));
        mine.y = Math.min(1, Math.max(0, (d.y + s / 2) / H));
        dockSave();
        place();
        refreshSettings();
    };
    on(seal, 'pointerup', drop);
    on(seal, 'pointercancel', drop);
    on(seal, 'click', e => { e.stopPropagation(); if (dragged) { dragged = false; return; } setOpen(!open); });
    // a button pressed: its window opens, the column folds away (unless only the seal folds it)
    on(doc, 'click', e => {
        if (!open) return;
        if (dockCfg().close === 'seal') return;
        const b = box();
        if (e.target === seal || seal.contains(e.target)) return;
        if (e.target.closest && e.target.closest('#rpg-pulse')) return;      // the pulse plate is read, not a button
        if (b && b.contains(e.target)) { setTimeout(() => setOpen(false), 0); return; }
        setOpen(false);
    }, true);
    on(doc, 'keydown', e => {
        if (!open || e.key !== 'Escape') return;
        // "only the seal": Escape still folds it while the seal or the column has the keyboard, not from another window
        if (dockCfg().close === 'seal') { const b = box(); const a = doc.activeElement; if (!(a === seal || (b && b.contains(a)))) return; }
        setOpen(false); seal.focus();
    });
    let raf = 0;
    const soon = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; sync(); place(); }); };
    const mo = new MutationObserver(muts => {
        for (const m of muts) {
            if (m.target === seal || seal.contains(m.target)) continue;
            if (m.type === 'childList') {
                const touch = [...m.addedNodes, ...m.removedNodes].some(n => n.nodeType === 1 && (n.id === 'rpg-buttons-container' || LOOSE.includes(n.id) || n.parentElement?.id === 'rpg-buttons-container' || m.target.id === 'rpg-buttons-container'));
                if (touch || m.target.id === 'rpg-buttons-container') { soon(); return; }
            } else if (m.type === 'attributes' && (m.target.parentElement?.id === 'rpg-buttons-container')) { soon(); return; }
            if (m.target.closest && m.target.closest('#rpg-buttons-container > [data-rpgd]')) newsSoon();   // a sign on a button came or went
        }
    });
    mo.observe(doc.body, { childList: true, subtree: false });
    // the novel has its own bar: an open column folds when it starts (the seal hides with it)
    const novel = new MutationObserver(() => { if (open && doc.body.classList.contains('rls-novel-on')) setOpen(false); });
    novel.observe(doc.body, { attributes: true, attributeFilter: ['class'] });
    const watchBox = () => { const b = box(); if (b && !b.__rpgsWatched) { b.__rpgsWatched = true; mo.observe(b, { childList: true, attributes: true, subtree: true, attributeFilter: ['style', 'class', 'hidden'] }); } };
    const tick = () => { watchBox(); soon(); };
    on(window, 'resize', soon);
    if (window.visualViewport) on(window.visualViewport, 'resize', soon);
    const sfo = new ResizeObserver(soon);
    const hookSend = () => { const sf = doc.getElementById('send_form'); if (sf && !sf.__rpgsWatched) { sf.__rpgsWatched = true; sfo.observe(sf); } };
    hookSend();

    /* ---------- the settings, among the extensions' own (with or without the Menu) ---------- */
    let setLang = '';
    function settingsHtml(inHub) {
        const cfg = dockCfg();
        const lang = setLang; const dt = k => dockText(k, lang);   // the panel's language (see settingsLang)
        const opt = (v, c, l, dis) => `<option value="${v}"${v === c ? ' selected' : ''}${dis ? ' disabled' : ''}>${dt(l)}</option>`;
        const spots = d => opt('right', cfg[d].spot, 's_right') + opt('left', cfg[d].spot, 's_left') + opt('top', cfg[d].spot, 's_top') + opt('free', cfg[d].spot, 's_free', cfg[d].x === null);
        return (inHub
            ? `<div class="rsh-connhead rpgs-head" role="button" tabindex="0" aria-expanded="false" aria-controls="rpgs-body"><i class="fa-solid fa-compass" aria-hidden="true"></i><b>${dt('set_title')}</b><i class="fa-solid fa-chevron-down rsh-chev" aria-hidden="true"></i></div>
        <div class="rsh-connbody rpgs-body" id="rpgs-body" style="display:none;">`
            : `<div class="inline-drawer-toggle inline-drawer-header"><b><i class="fa-solid fa-compass"></i> ${dt('set_title')}</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>
        <div class="inline-drawer-content">`) + `
            <div class="rpgs-row"><label for="rpgs-close">${dt('set_close')}</label><select id="rpgs-close" class="text_pole">${opt('auto', cfg.close, 'c_auto')}${opt('seal', cfg.close, 'c_seal')}</select></div>
            <div class="rpgs-row"><label id="rpgs-look-l">${dt('set_look')}</label><div class="rpgs-looks" role="group" aria-labelledby="rpgs-look-l">${DOCK_LOOKS.map(l => `<button type="button" class="rpgs-look" data-look="${l}" aria-pressed="${l === cfg.look}"><span class="rpgs-face" data-look="${l}">${l === 'wax' ? '<i class="fa-solid fa-compass" aria-hidden="true"></i>' : sealArt(l, 'P' + l)}</span><span>${dt('l_' + l)}</span></button>`).join('')}</div></div>
            <div class="rpgs-row"><label for="rpgs-desk">${dt('set_desk')}</label><select id="rpgs-desk" class="text_pole">${spots('desk')}</select></div>
            <div class="rpgs-row"><label for="rpgs-phone">${dt('set_phone')}</label><select id="rpgs-phone" class="text_pole">${spots('phone')}</select></div>
            <div class="rpgs-hint">${dt('set_drag')}</div>
        </div>`;
    }
    // where the block belongs now: inside "Tavern RPG Suite" (its slot), or on its own among the extensions
    const hubSlot = () => doc.getElementById('rsh-slot-seal');
    const settingsLang = () => (hubSlot() && suiteLang()) || dockLang();
    const settingsPlaced = el => { const slot = hubSlot(); return slot ? el.parentElement === slot : el.classList.contains('inline-drawer'); };
    function renderSettings() {
        const parent = doc.getElementById('extensions_settings2') || doc.getElementById('extensions_settings');
        const slot = hubSlot();
        if (!parent && !slot) return false;
        let el = doc.getElementById('rpg-dock-settings');
        const body0 = el && el.querySelector('.inline-drawer-content, .rpgs-body');
        const wasOpen = !!(body0 && getComputedStyle(body0).display !== 'none');
        if (el && !settingsPlaced(el)) { el.remove(); el = null; }       // the Suite panel came (or went): move over
        if (!el) {
            el = doc.createElement('div');
            el.id = 'rpg-dock-settings';
            if (slot) { el.className = 'rsh-conn rpgs-inhub'; slot.appendChild(el); }
            else {
                el.className = 'inline-drawer';
                const menu = doc.getElementById('rpg-hub-settings');           // next to the Menu's own, when it is there
                if (menu && menu.parentElement === parent) menu.after(el); else parent.appendChild(el);
            }
        }
        setLang = settingsLang();
        el.innerHTML = settingsHtml(!!slot);
        if (slot) {
            const head = el.querySelector('.rpgs-head'), body = el.querySelector('.rpgs-body'), chev = el.querySelector('.rsh-chev');
            const show = (on, anim) => {
                head.setAttribute('aria-expanded', String(on)); chev.classList.toggle('open', on);
                const $ = window.jQuery;
                if (anim && $ && !matchMedia('(prefers-reduced-motion: reduce)').matches) $(body).stop(true, true)[on ? 'slideDown' : 'slideUp'](140);
                else body.style.display = on ? 'block' : 'none';
            };
            head.addEventListener('click', () => show(body.style.display === 'none' || getComputedStyle(body).display === 'none', true));
            head.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); head.click(); } });
            if (wasOpen) show(true, false);
        }
        else if (wasOpen) { const c = el.querySelector('.inline-drawer-content'); if (c) c.style.display = 'block'; const ic = el.querySelector('.inline-drawer-icon'); if (ic) { ic.classList.remove('down', 'fa-circle-chevron-down'); ic.classList.add('up', 'fa-circle-chevron-up'); } }
        el.querySelector('#rpgs-close').addEventListener('change', e => { const c = dockCfg(); c.close = e.target.value === 'seal' ? 'seal' : 'auto'; dockSave(); });
        for (const d of ['desk', 'phone']) el.querySelector('#rpgs-' + d).addEventListener('change', e => {
            const c = dockCfg(); const v = e.target.value;
            if (DOCK_SPOTS.includes(v) && !(v === 'free' && c[d].x === null)) c[d].spot = v;
            dockSave(); place(); refreshSettings();
        });
        el.querySelectorAll('.rpgs-look').forEach(b => b.addEventListener('click', () => {
            const c = dockCfg(); if (!DOCK_LOOKS.includes(b.dataset.look)) return;
            c.look = b.dataset.look; dockSave(); place();
            el.querySelectorAll('.rpgs-look').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        }));
        return true;
    }
    // after a drag: the select shows "where you left it" (values only, nothing redrawn under the finger)
    function refreshSettings() {
        const el = doc.getElementById('rpg-dock-settings'); if (!el) return;
        const c = dockCfg();
        for (const d of ['desk', 'phone']) {
            const s = el.querySelector('#rpgs-' + d); if (!s) continue;
            const f = s.querySelector('option[value="free"]'); if (f) f.disabled = c[d].x === null;
            if (s.value !== c[d].spot) s.value = c[d].spot;
        }
    }
    // drawn once the tavern's list is there; moved next to the Menu's own block when that one comes later
    let setTries = 0;
    const setPoll = setInterval(() => {
        const el = doc.getElementById('rpg-dock-settings');
        if (!el || !settingsPlaced(el)) renderSettings();
        else { const menu = doc.getElementById('rpg-hub-settings'); if (menu && menu.parentElement === el.parentElement && menu.nextElementSibling !== el) menu.after(el); }
        if (++setTries > 60) clearInterval(setPoll);
    }, 500);
    renderSettings();
    // "Tavern RPG Suite" draws its panel again (a language switch) or comes late: follow it, cheaply —
    // only the direct children of the two settings columns are watched
    const setMo = new MutationObserver(() => { const el = doc.getElementById('rpg-dock-settings'); if (!el || !settingsPlaced(el)) renderSettings(); });
    for (const id of ['extensions_settings', 'extensions_settings2']) { const h = doc.getElementById(id); if (h) setMo.observe(h, { childList: true }); }

    // the extensions make their buttons over the first seconds; a light poll covers anything the observer misses
    let tries = 0;
    const poll = setInterval(() => { hookSend(); tick(); if (++tries > 40) clearInterval(poll); }, 500);
    const slow = setInterval(tick, 4000);
    const onChat = () => setTimeout(tick, 300);
    const onSettings = () => setTimeout(() => { labels(); place(); if (setLang && setLang !== settingsLang()) renderSettings(); }, 50);
    let ctxES = null;
    try {
        const ctx = window.SillyTavern?.getContext?.();
        ctxES = ctx?.eventSource || null;
        ctxES?.on?.(ctx.event_types.CHAT_CHANGED, onChat);
        ctxES?.on?.(ctx.event_types.SETTINGS_UPDATED, onSettings);
        if (ctxES) offs.push(() => { try { ctxES.removeListener?.(ctx.event_types.CHAT_CHANGED, onChat); ctxES.removeListener?.(ctx.event_types.SETTINGS_UPDATED, onSettings); } catch (e) { } });
    } catch (e) { /* the tavern without events: the poll still runs */ }
    tick();
    core.dock = {
        open: () => setOpen(true), close: () => setOpen(false), isOpen: () => open, refresh: tick,
        dispose() {
            clearInterval(poll); clearInterval(slow); clearInterval(setPoll); setMo.disconnect(); mo.disconnect(); novel.disconnect(); sfo.disconnect();
            if (raf) cancelAnimationFrame(raf);
            if (newsRaf) cancelAnimationFrame(newsRaf);
            offs.forEach(f => { try { f(); } catch (e) { } });
            seal.remove(); style.remove();
            doc.getElementById('rpg-dock-settings')?.remove();
            doc.body.classList.remove('rpg-dock-open', 'rpg-dock-drag');
            root.classList.remove('rpgs-flip', 'rpgs-down');
            root.removeAttribute('data-rpgs-theme');
            const b = box();
            if (b) {
                b.classList.remove('rpg-dock');
                b.querySelectorAll(':scope > .rpg-dock-sep').forEach(s => s.remove());
                b.removeAttribute('data-rpgs-peek');
                b.querySelectorAll(':scope > [data-rpgd]').forEach(k => { k.removeAttribute('data-rpgd'); k.removeAttribute('data-rpgs-hot'); k.querySelectorAll(':scope > .rpg-dock-dot, :scope > .rpg-dock-name').forEach(n => n.remove()); });
            }
        },
    };
    core.seal = seal;
}


/* ============================================================================
   QUEUE — the suite's requests to a second model, one after another.
   Every extension still sends its own request, with its own prompt and its own key;
   nothing in a request changes. Only WHEN it goes: to one address, a local server
   (localhost, 127.x, 192.168.x, 10.x, *.local) gets one request at a time, a remote
   one at most three. A busy local model then answers each in turn instead of
   turning half of them away with 503 while it is still cutting the last reply.
   Only POSTs made by the suite's own files are queued (found by where the call came
   from); the tavern's own requests and other extensions pass straight through.
   ============================================================================ */
const SUITE_FILE = /\/(?:third-party\/)?((?:RPG|Tavern)-[\w-]+|Dual-Model-Thoughts|Character-Lens)\/[\w./-]+\.js/;
const EXT_NAME = {
    en: { 'Dual-Model-Thoughts': 'Dual-Model Thoughts', 'RPG-Living-Scene': 'Living Scene', 'RPG-Scene-Card': 'Scene Card', 'RPG-Vitals': 'Vitals', 'RPG-Diary': 'Diary', 'RPG-Map-Locations-Engine': 'Map', 'RPG-Phone': 'Phone', 'RPG-Dungeons': 'Rabbit Hole', 'RPG-Vendors-Workshops': 'Vendors', 'RPG-Equipment-Durability': 'Outfit', 'RPG-Status-Bar-Bonds': 'Bonds', 'RPG-Game-Companion': 'Games', 'Tavern-RPG-Engine': 'Engine', 'Tavern-Doors': 'Doors', 'Tavern-Suite-Menu': 'Menu', 'Character-Lens': 'Character Lens', 'RPG-Codex': 'Codex', 'Tavern-RPG-Suite-Hub': 'Hub' },
    ru: { 'Dual-Model-Thoughts': 'Dual-Model Thoughts', 'RPG-Living-Scene': 'Живая сцена', 'RPG-Scene-Card': 'Scene Card', 'RPG-Vitals': 'Состояние', 'RPG-Diary': 'Дневник', 'RPG-Map-Locations-Engine': 'Карта', 'RPG-Phone': 'Телефон', 'RPG-Dungeons': 'Кроличья нора', 'RPG-Vendors-Workshops': 'Вендоры', 'RPG-Equipment-Durability': 'Экипировка', 'RPG-Status-Bar-Bonds': 'Связи', 'RPG-Game-Companion': 'Игры', 'Tavern-RPG-Engine': 'Движок', 'Tavern-Doors': 'Двери', 'Tavern-Suite-Menu': 'Меню', 'Character-Lens': 'Character Lens', 'RPG-Codex': 'Книга', 'Tavern-RPG-Suite-Hub': 'Хаб' },
};
const extName = id => (EXT_NAME[dockLang()] || EXT_NAME.en)[id] || id;
function whoCalls() {
    const st = String(new Error().stack || '').split('\n');
    for (const line of st) {
        if (/suite-core\.js/.test(line)) continue;
        const m = line.match(SUITE_FILE);
        if (m) return m[1];
    }
    return null;
}
function isLocalHost(h) { return /^(localhost|127\.|0\.0\.0\.0|\[?::1\]?|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)|\.local$/i.test(h); }

function installQueue(core) {
    const real = window.fetch;
    const lanes = new Map();      // origin → { busy, max, wait: [] }
    const jobs = [];              // for the pulse: { id, ext, host, state: wait|run|ok|fail, at, end, why }
    let seq = 0;
    const listeners = new Set();
    const changed = () => { for (const f of listeners) { try { f(); } catch (e) { } } };
    const lane = (origin, host) => { let l = lanes.get(origin); if (!l) { l = { busy: 0, max: isLocalHost(host) ? 1 : 3, wait: [] }; lanes.set(origin, l); } return l; };
    const next = l => { while (l.busy < l.max && l.wait.length) { const go = l.wait.shift(); if (go.cancelled) continue; l.busy++; go(); } };
    const keep = j => { jobs.push(j); while (jobs.length > 40) jobs.shift(); };
    function queued(input, init) {
        let url, method;
        try {
            url = new URL(typeof input === 'string' ? input : (input && input.url) || String(input), location.href);
            method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
        } catch (e) { return null; }
        if (method !== 'POST') return null;
        if (url.origin === location.origin && /^\/(api|csrf|version)/.test(url.pathname)) return null;   // the tavern's own server
        const ext = whoCalls();
        if (!ext) return null;
        return { url, ext };
    }
    window.fetch = function (input, init) {
        const q = queued(input, init);
        if (!q) return real.apply(this, arguments);
        const self = this, args = arguments;
        const l = lane(q.url.origin, q.url.hostname);
        const job = { id: ++seq, ext: q.ext, host: q.url.hostname, state: 'wait', at: Date.now() };
        keep(job); changed();
        const signal = (init && init.signal) || (input && input.signal) || null;
        return new Promise((resolve, reject) => {
            let released = false;
            const release = () => { if (released) return; released = true; l.busy = Math.max(0, l.busy - 1); next(l); };
            const go = () => {
                if (signal && signal.aborted) { release(); job.state = 'stop'; job.end = Date.now(); changed(); reject(signal.reason ?? new DOMException('Aborted', 'AbortError')); return; }
                job.state = 'run'; job.start = Date.now(); changed();
                let p;
                try { p = real.apply(self, args); } catch (e) { release(); job.state = 'fail'; job.why = 'net'; job.end = Date.now(); changed(); reject(e); return; }
                p.then(res => {
                    job.end = Date.now();
                    job.state = res.ok ? 'ok' : 'fail';
                    if (!res.ok) job.why = String(res.status);
                    changed();
                    // a streamed answer keeps the lane until it has finished arriving; an ordinary one
                    // was written whole before its headers came, so the lane is free at once
                    const streamed = /event-stream|x-ndjson/i.test(res.headers.get('content-type') || '');
                    if (res.ok && streamed && res.body && typeof TransformStream === 'function') {
                        let done = false;
                        const fin = () => { if (!done) { done = true; release(); } };
                        try {
                            const ts = new TransformStream({ flush() { fin(); }, cancel() { fin(); } });
                            const body = res.body.pipeThrough(ts);
                            const wrapped = new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
                            try { Object.defineProperty(wrapped, 'url', { value: res.url }); } catch (e) { }
                            // never hold a lane for ever: a body nobody reads lets go after a while
                            setTimeout(fin, 3 * 60 * 1000);
                            resolve(wrapped);
                            return;
                        } catch (e) { fin(); }
                    }
                    release();
                    resolve(res);
                }, e => {
                    release();
                    job.end = Date.now();
                    if (e && e.name === 'AbortError') job.state = 'stop'; else { job.state = 'fail'; job.why = 'net'; }
                    changed();
                    reject(e);
                });
            };
            if (signal) signal.addEventListener('abort', () => {
                if (job.state === 'wait') { go.cancelled = true; job.state = 'stop'; job.end = Date.now(); changed(); reject(signal.reason ?? new DOMException('Aborted', 'AbortError')); }
            }, { once: true });
            l.wait.push(go);
            next(l);
        });
    };
    window.fetch.__rpgQueued = true;
    core.queue = {
        jobs: () => jobs.slice(),
        clear: () => { for (let i = jobs.length - 1; i >= 0; i--) if (jobs[i].state !== 'wait' && jobs[i].state !== 'run') jobs.splice(i, 1); changed(); },
        on: f => { listeners.add(f); return () => listeners.delete(f); },
        lanes: () => [...lanes.entries()].map(([o, l]) => ({ origin: o, busy: l.busy, waiting: l.wait.filter(g => !g.cancelled).length, max: l.max })),
        dispose() { if (window.fetch.__rpgQueued) window.fetch = real; listeners.clear(); },
    };
}

/* ============================================================================
   PULSE — what the suite is doing in the background, on the seal itself.
   A thin gold arc turns on the seal while a request is out; a small "!" appears
   when one failed. The open column shows the last few, with why, and a
   "try again" where the extension offered one (window.RPG.core.pulse.report).
   ============================================================================ */
const PULSE_I18N = {
    en: { title: 'In the background', wait: 'waiting', run: 'thinking…', ok: 'done', fail: 'failed', stop: 'stopped', none: 'Nothing is running.', clear: 'Clear', retry: 'Try again', ago: '{n} min ago', now: 'just now', busy: 'Suite: {n} in the background', failed: 'Suite: something failed — open to see', net: 'no connection', s429: 'too many requests (429)', s503: 'model busy (503)', s401: 'key refused (401)', s5xx: 'server error ({c})', s4xx: 'refused ({c})' },
    ru: { title: 'В фоне', wait: 'ждёт', run: 'думает…', ok: 'готово', fail: 'ошибка', stop: 'остановлено', none: 'Сейчас ничего не идёт.', clear: 'Очистить', retry: 'Повторить', ago: '{n} мин назад', now: 'только что', busy: 'Комплект: в фоне {n}', failed: 'Комплект: что-то не вышло — открой, чтобы увидеть', net: 'нет связи', s429: 'слишком много запросов (429)', s503: 'модель занята (503)', s401: 'ключ не принят (401)', s5xx: 'ошибка сервера ({c})', s4xx: 'отказ ({c})' },
};
const pt = (k, v) => { let s = (PULSE_I18N[dockLang()] || PULSE_I18N.en)[k] ?? PULSE_I18N.en[k] ?? k; if (v) for (const x in v) s = s.split('{' + x + '}').join(String(v[x])); return s; };
const PULSE_CSS = `
#rpg-dock-seal::before{content:'';position:absolute;inset:-6px;border-radius:50%;border:2px solid transparent;pointer-events:none;opacity:0;transition:opacity 200ms}
body.rpg-pulse-busy #rpg-dock-seal::before{opacity:1;border-top-color:#e6cf86;border-right-color:rgba(230,207,134,.35);animation:rpg-pulse-turn 1.1s linear infinite}
@keyframes rpg-pulse-turn{to{transform:rotate(360deg)}}
#rpg-dock-seal .rpg-pulse-badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:9px;background:#b3261e;color:#fff;border:2px solid #f3e7cc;font:800 11px/14px Alegreya,Georgia,serif;text-align:center;padding:0 3px;box-sizing:border-box}
#rpg-dock-seal .rpg-pulse-badge[hidden]{display:none}
#rpg-buttons-container.rpg-dock > #rpg-pulse{order:var(--rpgs-po,-10)!important;align-self:flex-end;width:244px;max-width:calc(100vw - 30px);box-sizing:border-box;margin:0 0 4px;padding:9px 11px 8px;border-radius:12px;
 background:rgba(22,17,24,.94);border:1px solid rgba(198,161,91,.45);box-shadow:0 6px 18px rgba(0,0,0,.45);color:#f3e7cc;font:500 13px/1.3 Alegreya,'Palatino Linotype',Georgia,serif;
 opacity:0;transform:translateY(8px);transition:opacity 150ms,transform 150ms}
body.rpg-dock-open #rpg-buttons-container.rpg-dock > #rpg-pulse{opacity:1;transform:none;transition:opacity 200ms cubic-bezier(.2,.8,.2,1),transform 200ms cubic-bezier(.2,.8,.2,1)}
#rpg-pulse[hidden]{display:none!important}
html.rpgs-flip #rpg-buttons-container.rpg-dock > #rpg-pulse{align-self:flex-start}
#rpg-pulse .rp-h{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px;font:700 10px/1 'PT Mono',ui-monospace,monospace;letter-spacing:2px;text-transform:uppercase;color:#e6cf86}
#rpg-pulse .rp-row{display:flex;align-items:baseline;gap:7px;padding:3px 0;border-top:1px dashed rgba(198,161,91,.22)}
#rpg-pulse .rp-row:first-of-type{border-top:0}
#rpg-pulse .rp-n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700}
#rpg-pulse .rp-s{white-space:nowrap;color:#d9ccb0;font-size:12px}
#rpg-pulse .rp-row.fail .rp-s{color:#ffb4a8}
#rpg-pulse .rp-row.run .rp-s{color:#e6cf86}
#rpg-pulse .rp-why{display:block;font-size:11.5px;color:#ffb4a8}
#rpg-pulse button{all:unset;cursor:pointer;font:700 11px/1 Alegreya,Georgia,serif;color:#f3e7cc;border:1px dashed rgba(198,161,91,.6);border-radius:9px;padding:4px 8px;letter-spacing:.3px}
#rpg-pulse button:hover{background:rgba(198,161,91,.18)}
#rpg-pulse button:focus-visible{outline:2px solid #e6cf86;outline-offset:2px}
@media (prefers-reduced-motion: reduce){body.rpg-pulse-busy #rpg-dock-seal::before{animation:none;border-color:#e6cf86}#rpg-buttons-container.rpg-dock > #rpg-pulse{transition:none}}
`;
function installPulse(core) {
    const doc = document;
    const style = doc.createElement('style'); style.id = 'rpg-pulse-style'; style.textContent = PULSE_CSS; doc.head.appendChild(style);
    const seal = core.seal;
    const badge = doc.createElement('span'); badge.className = 'rpg-pulse-badge'; badge.hidden = true; badge.setAttribute('aria-hidden', 'true'); badge.textContent = '!';
    seal.appendChild(badge);
    const own = [];          // reports an extension made itself: { id, ext, text, retry, state, at }
    let seenUpTo = 0;
    let oseq = 0;
    const plate = () => {
        let p = doc.getElementById('rpg-pulse');
        const box = doc.getElementById('rpg-buttons-container');
        if (!box) return null;
        if (!p) { p = doc.createElement('div'); p.id = 'rpg-pulse'; p.setAttribute('role', 'status'); p.setAttribute('aria-live', 'polite'); p.hidden = true; }
        if (p.parentElement !== box) box.appendChild(p);
        return p;
    };
    const why = j => { const c = j.why; if (!c) return ''; if (c === 'net') return pt('net'); if (c === '429') return pt('s429'); if (c === '503') return pt('s503'); if (c === '401' || c === '403') return pt('s401'); if (/^5/.test(c)) return pt('s5xx', { c }); return pt('s4xx', { c }); };
    const ago = t => { const n = Math.round((Date.now() - t) / 60000); return n < 1 ? pt('now') : pt('ago', { n }); };
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const recent = () => {
        const q = (core.queue ? core.queue.jobs() : []).filter(j => j.state === 'wait' || j.state === 'run' || Date.now() - (j.end || j.at) < 15 * 60 * 1000);
        const all = q.map(j => ({ key: 'q' + j.id, ext: j.ext, state: j.state, at: j.end || j.start || j.at, why: why(j) }))
            .concat(own.filter(o => Date.now() - o.at < 30 * 60 * 1000).map(o => ({ key: 'o' + o.id, ext: o.ext, state: o.state, at: o.at, why: o.text, retry: o.retry, oid: o.id })));
        // one line per extension: its newest
        const by = new Map();
        for (const r of all.sort((a, b) => b.at - a.at)) if (!by.has(r.ext) || (r.state === 'run' || r.state === 'wait') && !['run', 'wait'].includes(by.get(r.ext).state)) by.set(r.ext, r);
        return [...by.values()].sort((a, b) => b.at - a.at).slice(0, 5);
    };
    let raf = 0;
    function draw() {
        raf = 0;
        const rows = recent();
        const busy = rows.filter(r => r.state === 'run' || r.state === 'wait').length;
        const fails = rows.filter(r => r.state === 'fail' && r.at > seenUpTo).length;
        doc.body.classList.toggle('rpg-pulse-busy', busy > 0);
        badge.hidden = !fails;
        const base = dt(doc.body.classList.contains('rpg-dock-open') ? 'close' : 'open');
        const extra = fails ? pt('failed') : busy ? pt('busy', { n: busy }) : '';
        core.sealNote = extra;
        const lbl = [base, extra, core.newsNote].filter(Boolean).join(' · ');
        if (seal.getAttribute('aria-label') !== lbl) { seal.setAttribute('aria-label', lbl); seal.title = lbl; }
        const p = plate(); if (!p) return;
        const html = !rows.length ? '' : `<div class="rp-h"><span>${esc(pt('title'))}</span><button type="button" data-rp="clear">${esc(pt('clear'))}</button></div>` + rows.map(r =>
            `<div class="rp-row ${r.state}"><span class="rp-n">${esc(extName(r.ext))}</span><span class="rp-s">${esc(pt(r.state))}${r.state === 'run' || r.state === 'wait' ? '' : ' · ' + esc(ago(r.at))}</span>${r.retry && r.state === 'fail' ? `<button type="button" data-rp="retry" data-oid="${r.oid}">${esc(pt('retry'))}</button>` : ''}</div>${r.state === 'fail' && r.why ? `<span class="rp-why">${esc(r.why)}</span>` : ''}`).join('');
        if (p.__html !== html) { p.__html = html; p.innerHTML = html; }
        p.hidden = !rows.length;
    }
    const soon = () => { if (!raf) raf = requestAnimationFrame(draw); };
    core.queue?.on(soon);
    const minute = setInterval(soon, 30000);
    doc.addEventListener('click', e => {
        const t = e.target.closest && e.target.closest('#rpg-pulse [data-rp]');
        if (!t) return;
        e.stopPropagation();
        if (t.dataset.rp === 'clear') {
            seenUpTo = Date.now();
            core.queue?.clear();
            for (let i = own.length - 1; i >= 0; i--) if (own[i].state !== 'run') own.splice(i, 1);
        } else if (t.dataset.rp === 'retry') {
            const o = own.find(x => String(x.id) === t.dataset.oid);
            if (o && typeof o.retry === 'function') { o.state = 'run'; o.at = Date.now(); soon(); Promise.resolve().then(() => o.retry()).then(() => { o.state = 'ok'; o.at = Date.now(); soon(); }, () => { o.state = 'fail'; o.at = Date.now(); soon(); }); }
        }
        soon();
    }, true);
    // opening the column is seeing the failures
    const mo = new MutationObserver(() => { if (doc.body.classList.contains('rpg-dock-open')) { seenUpTo = Date.now(); } soon(); });
    mo.observe(doc.body, { attributes: true, attributeFilter: ['class'] });
    core.pulse = {
        /* For an extension that wants its own line: report(ext, text, retry) → id; done(id) when it worked. */
        report(ext, text, retry) { const o = { id: ++oseq, ext: String(ext || ''), text: String(text || '').slice(0, 160), retry: typeof retry === 'function' ? retry : null, state: 'fail', at: Date.now() }; own.push(o); while (own.length > 20) own.shift(); soon(); return o.id; },
        done(id) { const o = own.find(x => x.id === id); if (o) { o.state = 'ok'; o.at = Date.now(); soon(); } },
        refresh: soon,
        dispose() { clearInterval(minute); mo.disconnect(); style.remove(); badge.remove(); doc.getElementById('rpg-pulse')?.remove(); doc.body.classList.remove('rpg-pulse-busy'); },
    };
    soon();
}

/* ============================================================================
   WORLD — one answer to "when and where are we", for every extension.
   Time, date, weather and who is here: the Scene Card. The place: the newest of
   the two — a move on the Map, or a change of place in the story (the Scene Card);
   when they are equally new, the Map. Exploring alone keeps the Map apart, as before.
   window.RPG.world.get() → { date, time, day, weather, who, place, from: 'map'|'scene'|null,
                              mapRoom, mapBlock, sceneLoc, stale }
   stale: the story has left the Map's room for another room on that map (the Map can offer
   to catch up). Nothing here asks a model or writes anything.
   ============================================================================ */
const placeNorm = s => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
function samePlace(room, loc) {
    const a = placeNorm(room), b = placeNorm(loc);
    if (!a || !b) return false;
    if (a === b) return true;
    // "Library, Old Castle" is the library; a word inside another word is not
    return (' ' + b + ' ').includes(' ' + a + ' ') || (' ' + a + ' ').includes(' ' + b + ' ');
}
function installWorld(core) {
    const R = () => window.RPG || {};
    const num = v => (typeof v === 'number' && isFinite(v) ? v : null);
    core.world = {
        samePlace,
        get() {
            let sc = null, cur = null, moved = null, since = null, solo = false, rooms = [];
            try { const s = R().scene; if (s && s.available && (!s.isEnabled || s.isEnabled()) && s.get) sc = s.get(); } catch (e) { sc = null; }
            try { const s = R().scene; if (s && s.placeSince) since = num(s.placeSince()); } catch (e) { since = null; }
            try {
                const m = R().map;
                if (m && m.available && (!m.isEnabled || m.isEnabled())) {
                    solo = !!(m.isSolo && m.isSolo());
                    if (!solo && m.getCurrent) cur = m.getCurrent();
                    if (m.movedAt) moved = num(m.movedAt());
                    if (m.listRooms) rooms = m.listRooms() || [];
                }
            } catch (e) { cur = null; }
            const sceneLoc = sc && sc.location ? String(sc.location) : '';
            const mapRoom = cur && cur.room ? String(cur.room) : '';
            let place = '', from = null;
            if (mapRoom && sceneLoc) {
                if (samePlace(mapRoom, sceneLoc)) { place = mapRoom; from = 'map'; }
                else if ((moved ?? -1) >= (since ?? -1)) { place = mapRoom; from = 'map'; }   // equally new → the Map
                else { place = sceneLoc; from = 'scene'; }
            } else if (mapRoom) { place = mapRoom; from = 'map'; }
            else if (sceneLoc) { place = sceneLoc; from = 'scene'; }
            // the story is in another room of this map: the Map can offer to follow
            let stale = null;
            if (from === 'scene' && mapRoom && sceneLoc) {
                const hit = rooms.find(r => r && r.room && !r.locked && samePlace(r.room, sceneLoc) && !samePlace(r.room, mapRoom));
                if (hit) stale = { room: hit.room, block: hit.block || '' };
            }
            return {
                date: sc ? sc.date || null : null, time: sc ? sc.time || null : null, day: sc ? sc.day ?? null : null,
                weather: sc ? sc.weather || null : null, who: sc && Array.isArray(sc.characters) ? sc.characters : [],
                place: place || null, from, mapRoom: mapRoom || null, mapBlock: cur ? cur.block || null : null, sceneLoc: sceneLoc || null,
                solo, stale,
            };
        },
        place() { try { return core.world.get().place; } catch (e) { return null; } },
    };
    R().world = core.world;
}

(function bootCore() {
    try {
        window.RPG = window.RPG || {};
        const had = window.RPG.core;
        if (had && had.version >= CORE_VERSION) return;          // the same or a newer copy runs already
        try { had?.dispose?.(); } catch (e) { /* an older copy that cannot let go */ }
        const core = { version: CORE_VERSION };
        installQueue(core);            // at once: the first requests can come before the page is built
        installWorld(core);
        const start = () => {
            installDock(core);
            installPulse(core);
        };
        core.dispose = () => { for (const k of ['pulse', 'dock', 'queue']) { try { core[k]?.dispose(); } catch (e) { } } if (window.RPG.world === core.world) delete window.RPG.world; };
        if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
        window.RPG.core = core;
    } catch (e) { console.warn('[RPG suite core] not started —', e); }
})();
