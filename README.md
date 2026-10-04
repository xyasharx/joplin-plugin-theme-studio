# 🎨 Theme Studio for Joplin

[![Joplin Plugin](https://img.shields.io/badge/Joplin-Plugin-blue?logo=joplin&logoColor=white)](https://joplinapp.org/)
[![Platforms](https://img.shields.io/badge/Platforms-Desktop%20%7C%20Mobile-green)](#-installation)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Theme Studio** is an all-in-one visual engine for Joplin. Switch instantly between iconic color schemes (Tokyo Night, Everforest, Catppuccin, Nord, Dracula, Gruvbox, Atom One) with full **RTL/LTR typography**, mobile responsiveness, and polished diagram rendering—**without ever touching `userstyle.css` again.**

---

## ✨ Why Theme Studio?

Tired of copying CSS snippets, broken bullet points in RTL, unreadable white text in light-mode tables, or clipped Mermaid diagrams? 

**Theme Studio** moves all custom styling into a single, configurable plugin:
- 🔄 **One-Click Palette Switching:** Change themes dynamically from Joplin's settings.
- 🌍 **Native RTL & Bidirectional Engine:** Flawless right-to-left alignment powered by [Vazirmatn](https://github.com/rastikerdar/vazirmatn), with full bullet marker and border fixes.
- 🔀 **Isolated LTR Blocks:** Mix English and RTL text seamlessly using `<div dir="ltr">...</div>`.
- 📱 **Mobile & Desktop Ready:** Works across Joplin Desktop (Windows, macOS, Linux) and Joplin Mobile (Android/iOS).
- 📊 **Enhanced Mermaid Diagrams:** Centered flowcharts, rounded nodes, transparent label backgrounds, and horizontal scrollbars.
- 💻 **ASCII-Preserved Code Blocks:** Horizontal scrolling prevents line wrapping from breaking folder trees or terminal outputs.
- 📋 **Fixed Table Contrast:** Resolves Joplin's light-mode unreadable table cell bug and adds responsive table scrolling.
- 🖨️ **Print & PDF Optimization:** Auto-strips dark backgrounds and formats headings cleanly for clean PDF exports.

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
1. Download the latest `org.joplin.plugin.theme-studio.jpl` from the [Releases](https://github.com/yourusername/joplin-plugin-theme-studio/releases) page.
2. Open Joplin > **Tools > Options > Plugins**.
3. Click the gear icon (**⚙**) in the top right > **Install from file**.
4. Select the downloaded `.jpl` file and restart Joplin.

#### On Mobile (Android):
1. Download the `.jpl` file to your mobile device.
2. Open Joplin Mobile > Tap the **Menu icon (≡)** > **Configuration** > **Plugins**.
3. Under **Advanced**, tap **Install from file**.
4. Choose the `.jpl` file and restart the Joplin app.

---

## ⚙️ Configuration

Once installed, open **Tools > Options > Theme & Typography**:

| Setting | Options / Description |
| :--- | :--- |
| **Color Theme** | Select any of the 12+ built-in palettes. |
| **Layout Direction** | Choose **RTL** (Persian/Arabic) or **LTR** (English/Latin). |
| **Primary Font Stack** | Customize your main reading font (defaults to *Vazirmatn* for RTL). |
| **Monospace Code Font** | Customize your code font (*Cascadia Code*, *Fira Code*, *JetBrains Mono*). |
| **Base Font Size** | Adjust font scaling (e.g., `15px`, `16px`, `17px`). |
| **Line Height** | Adjust line spacing for reading comfort (e.g., `1.7`, `1.8`). |

---

## 💡 Mixed-Language (LTR in RTL) Guide

When your layout direction is set to **RTL**, you can insert English text, code explanations, or quotes without layout breakage by wrapping them in `<div dir="ltr">`:

```html
<div dir="ltr">

### English Subheading
- List markers automatically sit on the left.
- Markdown links, bold text, and math render as usual.

> Blockquotes automatically flip their accent line to the left border.

</div>
```

---

## 🛠️ Development & Building

To run or modify Theme Studio locally:

1. **Clone the repo:**
   ```bash
   git clone https://github.com/yourusername/joplin-plugin-theme-studio.git
   cd joplin-plugin-theme-studio
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the plugin package:**
   ```bash
   npm run dist
   ```
   The compiled `.jpl` bundle will be created inside the `publish/` directory.

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
