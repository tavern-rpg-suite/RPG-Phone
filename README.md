# RPG Phone

<p>
<img width="1672" height="941" alt="f1c8bf6d-dd7b-47d5-9579-c8536c12d8068" src="https://github.com/user-attachments/assets/c532a5ca-a759-4379-90ca-209c358d36ed" />
</p>

A SillyTavern extension that adds a **side messenger** to your roleplay — a magical phone that links your world to theirs. It lives apart from the main chat: characters text you about what's happening, and, most of the time, they **start the conversation themselves**.

**Version 2.0.0**

---

## ✨ Features

<img width="1700" height="702" alt="Skins" src="https://github.com/user-attachments/assets/4feee2d8-f172-4884-82a9-d862960ad925" />


- 📱 **A separate thread per character** — own history, own initiative, own diary. Chatting with one never leaks into another.
- ⏰ **Real initiative** — no coin flips and no "message every N turns". Pressure builds from silence in the thread, the main story stalling, an unanswered line, time of day and how many days have passed. When it tips over, the model is handed **a concrete reason** and writes from it.
- 🤫 **They back off** — ignore two texts and they wait three times as long. Answer one and the counter resets.
- 🌙 **Quiet hours & daily cap** — no texts at 4 a.m. unless you want them.
- 🕰️ **They know the clock** — real date, weekday, time of day and how long it's been since the last message.
- 🎧 **Voice notes and photos** — sent as text tags, drawn as a real player with a waveform, or a photo card with a caption.
- 📷 **Real photos** — tap a photo they described and it gets drawn: cloud image APIs or your own ComfyUI. Or let every photo develop on its own. Not happy with one? ↻ redraws it, and the old photo stays until the new one arrives.
- 🔊 **Voices** — ▶ on a voice note speaks it with SillyTavern's own TTS, in the voice you gave that character.
- 🎭 **One card, many people** — an RP card with a whole cast: list who lives in it (👥 next to the card in *Who is online*) and each of them texts under their own name and avatar. People RPG Diary has filed as NPCs for that character are recognised on their own.
- 👥 **Group thread** — the whole party of an open group chat in one conversation, talking to you *and* to each other.
- 📖 **Its own diary chat** — every conversation gets a separate diary inside **RPG Diary**: entries, memory, summarization, all of it — never mixed with the character's main-story diary.
- 🧠 **Memory** — the last messages of the main story (only for characters who are actually in the open chat — someone from another story never sees it), the conversation itself (adjustable depth) and, optionally, long-term memory from the Diary. A context ceiling trims the oldest lines first if a request would not fit.
- 🔄 **Reroll & cancel** — regenerate the reply to any of your messages; a hung request can be cancelled from the "typing…" bubble.
- ✏️ **Editable system prompt** — *Main* (slow-burn, for mature roleplay), *Short replies* (the same, texting in one to three short messages) or your own text; yours is kept aside while you look at the others, and a reset button brings *Main* back.
- 🎨 **Five skins** — the original floating arc of bubbles, or a real phone: **Cute**, **Gothic**, **Lace** or **Classic**. See below.
- 🌍 **Bilingual UI (RU / EN)**.

## 📦 Install

Copy the `RPG-Phone` folder into:

```
SillyTavern/data/<user>/extensions/
```

Reload SillyTavern and enable it in **Extensions → RPG Phone**.

## ⚙️ Setup

1. Enable the phone.
2. Pick the **interface language** (English / Русский).
3. Fill in **API Settings** (URL / key / model) — any OpenAI-compatible text endpoint (default: OpenRouter).
4. Press the 📱 button at the bottom-right and switch on whoever is allowed to write to you.

**If replies come out cut off**, raise *Max reply tokens* — reasoning models spend most of the budget on hidden thinking. The extension also re-asks for the tail once on its own and stitches it back together.

## ⏰ How initiative works

Every minute, each active conversation is scored. It grows when the thread has been silent, when you left the last word to them, when the main story hasn't moved for a while, when you've been away, when days have passed. It shrinks when they've just asked you something, and it stalls entirely during quiet hours or once the daily cap is reached. Past the threshold, the model receives a plain-language reason — *"they wrote to you last and you never answered; 40 minutes have passed"*, *"the story has been paused for an hour and you're getting impatient"* — and writes a message that follows from it. With the Diary connected, sometimes the reason is simply what they wrote in their diary that night.

## 🔗 Works with the suite

- **RPG Diary** — each conversation gets its own diary chat there (📖 button in the input bar opens it). Entries written from the phone land in that diary, and its memory feeds back into their replies. Their main-story diary can also be read as long-term memory (a toggle).
- The character's card supplies personality; NPCs without a card can borrow theirs from the Diary's dossiers.

## 💾 Storage

Conversations, contacts and per-character state live in the extension's settings, keyed by character — which is why the phone keeps working when the chat is closed, or when you're somewhere else entirely.
