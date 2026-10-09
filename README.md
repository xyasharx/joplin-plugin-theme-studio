# 🎨 Theme Studio for Joplin

[![Joplin Plugin](https://img.shields.io/badge/Joplin-Plugin-blue?logo=joplin&logoColor=white)](https://joplinapp.org/)
[![Platforms](https://img.shields.io/badge/Platforms-Desktop%20%7C%20Mobile-green)](#-installation)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Theme Studio** is an all-in-one visual and typography engine for Joplin. Switch instantly between iconic color schemes (Tokyo Night, Everforest, Catppuccin, Nord, Dracula, Gruvbox, Atom One) with **smart BiDi auto-detection**, **international web fonts**, **high-fidelity PDF export**, and responsive mobile rendering—**without ever touching `userstyle.css` again.**

---

## ✨ Features

- 🔄 **One-Click Theme Switching:** Switch between 12+ iconic dark and light palettes on the fly.
- 🌍 **Smart Locale Detection & International Fonts:** Automatically detects Joplin's interface language on launch (defaults to LTR & Inter globally, or RTL & Vazirmatn for Persian/Arabic/Hebrew). Loads web fonts on the fly via CDN—ideal for mobile where system fonts cannot be installed.
- 🔀 **Auto-Detect BiDi & LTR Priority:** Supports pure LTR, pure RTL, or a new **Auto-Detect (Per-Paragraph BiDi)** mode that aligns each paragraph naturally according to its language.
- 📄 **High-Fidelity PDF & Print Engine:** Exact color and background preservation (`print-color-adjust: exact`), automatic table column wrapping (no cropped tables or printed scrollbars), wrapped code blocks (`pre-wrap`), and smart page-break isolation.
- 📱 **Mobile & Desktop Ready:** Works seamlessly across Joplin Desktop (Windows, macOS, Linux) and Joplin Mobile (Android/iOS) with adaptive font scaling and zero horizontal viewport sway.
- 📊 **Contained Mermaid Diagrams:** Centered flowcharts, rounded nodes, transparent label backgrounds, and container-isolated horizontal scrolling.
- 💻 **ASCII-Safe Code Blocks:** Strict horizontal scroll isolation so folder tree structures and terminal logs never break or wrap unexpectedly on screen.
- 📋 **Contrast & Font-Fixed Tables:** Resolves Joplin's light-mode unreadable text bug and ensures tables fully adopt your chosen typography preset.
- ✅ **Interactive Checklist Styling:** Checked to-do items (`- [x]`) smoothly dim to 55% opacity with an automatic strikethrough.
- 🖼️ **Smart Image Boundaries:** Pasted screenshots and retina graphics are auto-centered and bounded (`max-height: 520px`) to prevent them from dominating your notes.
- 🔗 **Cross-Note Link Distinction:** Internal Joplin note links (`:/<id>`) feature a distinct dashed accent underline to stand out from external web URLs.
- 📖 **Focus Reading Width:** Center and constrain line lengths on ultra-wide monitors (`Compact 760px`, `Comfortable 920px`, or `Full Width`).

---

## 🌍 Built-In International Font Presets

Mobile devices running Joplin typically cannot install local system fonts. Theme Studio includes built-in web fonts served on the fly via CDN:

| Language / Script | Font Preset | Description |
| :--- | :--- | :--- |
| **Global / Latin / European / Cyrillic** | **Inter** *(Default)* | The gold standard for modern UI and long-form reading |
| **Clean Modern Sans** | **Roboto** | Google's versatile, high-legibility sans-serif |
| **Persian / Arabic / Kurdish / Urdu** | **Vazirmatn** | Modern, beautiful, and crisp Arabic-script typography |
| **Standard Arabic** | **Noto Sans Arabic** | Modern clean Arabic typeface from Google |
| **Simplified Chinese (CJK)** | **Noto Sans SC** | High-contrast Chinese typography |
| **Japanese (CJK)** | **Noto Sans JP** | Balanced Japanese typography |
| **Hebrew** | **Heebo** | Clean Hebrew and Latin typography |
| **Devanagari (Hindi / Sanskrit / Marathi)** | **Noto Sans Devanagari** | Complete Devanagari script support |
| **Editorial & Book Reading** | **Lora** | Classic serif optimized for long reading sessions |
| **Code & Monospace** | **Fira Code** / **JetBrains Mono** | Modern developer monospace typefaces |
| **Native System** | **System Default** | Zero-network overhead using your OS native font stack |

---

## 🎨 Built-In Themes

| Theme | Mode | Description |
| :--- | :---: | :--- |
| **Tokyo Night** | Dark | Deep navy aesthetic with vivid neon accents |
| **Tokyo Night Storm** | Dark | Softer midnight-slate variation |
| **Everforest Dark** | Dark | Nature-inspired, warm green environment |
| **Everforest Light** | Light | Organic, paper-soft tones for comfortable daytime reading |
| **Catppuccin Mocha** | Dark | Modern, soothing pastel dark theme |
| **Catppuccin Latte** | Light | Crisp, high-contrast pastel light theme |
| **Nord** | Dark | Elegant, arctic-blue cold palette |
| **Dracula** | Dark | Classic vibrant purple and high-contrast accents |
| **Gruvbox Dark** | Dark | Retro groove warm amber/brown palette |
| **Gruvbox Light** | Light | Warm retro parchment aesthetic |
| **Atom One Dark** | Dark | The classic One Dark editor standard |
| **Atom One Light** | Light | Clean, balanced One Light palette |

---

## 🚀 Installation

### Option 1: In-App Search (Recommended)
1. Open Joplin Desktop.
2. Go to **Tools > Options > Plugins** (macOS: **Joplin > Preferences > Plugins**).
3. Search for **`Theme Studio`**.
4. Click **Install** and restart Joplin.

---

### Option 2: Manual Installation (`.jpl` file)

#### On Desktop:
1. Download the latest `org.joplin.plugin.theme-studio.jpl` from the [Releases](https://github.com/xyasharx/joplin-plugin-theme-studio/releases) page.
2. Open Joplin > **Tools > Options > Plugins**.
3. Click the gear icon (**⚙**) in the top right > **Install from file**.
4. Select the downloaded `.jpl` file and restart Joplin.

#### On Mobile (Android):
1. Download the `.jpl` file to your mobile device.
2. Open Joplin Mobile > Tap the **Menu icon (≡)** > **Configuration** > **Plugins**.
3. Under **Advanced**, tap **Install from file**.
4. Choose the `.jpl` file and restart the Joplin app.

---

## ⚙️ Configuration Reference

Open **Tools > Options > Theme Studio** (on Mobile: **Configuration > Plugins > Theme Studio**):

| Setting | Options / Description | Default |
| :--- | :--- | :--- |
| **Color Theme** | Select any of the 12+ built-in palettes. | `Atom One Dark` |
| **Layout Direction** | `LTR (Global)`, `Auto-Detect (Per-Paragraph BiDi)`, or `RTL`. | Auto-detected |
| **International Font Preset** | Choose from 10+ web fonts (Inter, Roboto, Vazirmatn, Noto Arabic, Noto CJK, Heebo, Devanagari, Lora, System, Custom). | Auto-detected |
| **Custom Font Stack** | Custom font-family string (active only when *Custom Font Stack* is chosen above). | System stack |
| **Code Font Preset** | `Fira Code`, `JetBrains Mono`, `System Monospace`, or `Custom`. | `Fira Code` |
| **Custom Code Font Stack** | Custom monospace stack (active only when *Custom Code Font* is chosen above). | Cascadia / Consolas |
| **Font Size** | Base font size (e.g., `14px`, `16px`, `18px`, `20px`). Fully responsive on mobile. | `16px` |
| **Line Height** | Body line spacing (e.g., `1.6`, `1.75`, `1.9`). | `1.75` |
| **Reading Width (Focus Mode)** | `Full Width (100%)`, `Comfortable (920px Centered)`, or `Compact (760px Centered)`. | `Full Width` |
| **PDF Export Appearance** | `Exact Match` (identical colors and backgrounds) or `Paper Friendly` (white background with theme accents). | `Exact Match` |

---

## 💡 Mixed-Language (LTR in RTL) Guide

If your note direction is set to **RTL**, you can embed English paragraphs, code summaries, or quotes with left-to-right alignment using `<div dir="ltr">`:

```html
<div dir="ltr">

### English Subheading
- List markers automatically sit on the left.
- Markdown links, bold text, and math render as usual.

> Blockquotes automatically flip their accent line to the left border.

</div>
```

*(Alternatively, switch **Layout Direction** to `Auto-Detect (Per-Paragraph BiDi)` to let the plugin align each paragraph automatically without manual HTML tags).*

---

## 🛠️ Development & Building

To build Theme Studio locally:

1. **Clone the repo:**
   ```bash
   git clone https://github.com/xyasharx/joplin-plugin-theme-studio.git
   cd joplin-plugin-theme-studio
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the plugin bundle:**
   ```bash
   npm run dist
   ```
   The compiled `.jpl` archive will be created inside the `publish/` directory.

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
