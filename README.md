# RPG Phone

A SillyTavern extension that adds a **side messenger** to your roleplay — a magical phone that links your world to theirs. It lives apart from the main chat: characters text you about what's happening, and, most of the time, they **start the conversation themselves**.

**Version 1.7.1**

---

## ✨ Features

- 📱 **A separate thread per character** — own history, own initiative, own diary. Chatting with one never leaks into another.
- ⏰ **Real initiative** — no coin flips and no "message every N turns". Pressure builds from silence in the thread, the main story stalling, an unanswered line, time of day and how many days have passed. When it tips over, the model is handed **a concrete reason** and writes from it.
- 🤫 **They back off** — ignore two texts and they wait three times as long. Answer one and the counter resets.
- 🌙 **Quiet hours & daily cap** — no texts at 4 a.m. unless you want them.
- 🕰️ **They know the clock** — real date, weekday, time of day and how long it's been since the last message.
- 🎧 **Voice notes and photos** — sent as text tags, drawn as a real player with a waveform, or a photo card with a caption.
- 👥 **Group thread** — the whole party of an open group chat in one conversation, talking to you *and* to each other.
- 📖 **Its own diary chat** — every conversation gets a separate diary inside **RPG Diary**: entries, memory, summarization, all of it — never mixed with the character's main-story diary.
- 🧠 **Memory** — the last messages of the main story, the conversation itself (adjustable depth) and, optionally, long-term memory from the Diary.
- 🔄 **Reroll & cancel** — regenerate the reply to any of your messages; a hung request can be cancelled from the "typing…" bubble.
- ✏️ **Editable system prompt** — the whole thing is yours to rewrite, with a reset button.
- 🎨 **Floating arc of bubbles** — a column beside the chat, wheel-scrolled, older messages fading out; width, fade, offsets and how many are visible are all adjustable.
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
