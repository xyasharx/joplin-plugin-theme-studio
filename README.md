# 🎨 Theme Studio for Joplin

[![Joplin Plugin](https://img.shields.io/badge/Joplin-Plugin-blue?logo=joplin&logoColor=white)](https://joplinapp.org/)
[![Platforms](https://img.shields.io/badge/Platforms-Desktop%20%7C%20Mobile-green)](#-installation)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Theme Studio is a modular palette and typography engine for Joplin. It applies unified color schemes and typography across the **Markdown Viewer**, the **Markdown Editor** (CodeMirror 6 & 5), and the **Rich Text Editor** (TinyMCE)—eliminating manual edits to `userstyle.css` and `userchrome.css`.

---

## ✨ Features

- **Universal Mode Theming:** Applies the selected theme across the Markdown Viewer, the CodeMirror Markdown Editor (gutters, syntax highlighting, active line, caret, selection), and the TinyMCE Rich Text Editor (iframe content and outer toolbar).
- **12 Integrated Color Schemes:** Switch between dark and light palettes (Tokyo Night, Everforest, Catppuccin, Nord, Dracula, Gruvbox, Atom One) without restarting Joplin.
- **Smart BiDi Locale Detection:** Inspects Joplin's system interface language on initialization. Defaults to LTR with Inter for global locales, and RTL with Vazirmatn for Persian, Arabic, and Hebrew interfaces.
- **Auto-BiDi Direction Mode:** Includes an `Auto-Detect (Per-Paragraph BiDi)` mode utilizing `unicode-bidi: plaintext` and CSS Logical Properties to align individual paragraphs based on their script direction.
- **International Web Font Engine:** Loads open-source typefaces via CDN on demand (with `display=swap` to eliminate FOIT). Enables custom typography on Joplin Mobile without requiring local OS font installation.
- **Performance Optimized Rendering:** Features an in-memory memoization cache in the Markdown-It parser. Generates compiled CSS once per configuration change, reducing keystroke re-rendering to O(1) memory retrieval.
- **High-Fidelity PDF & Print Export:** Preserves theme backgrounds, syntax colors, and borders using `print-color-adjust: exact`. Tables automatically wrap cells to prevent margin clipping, and code blocks wrap long lines (`pre-wrap`).
- **Responsive Mobile Layout:** Hardened for viewport widths under 768px. Respects configured font sizes, contains Mermaid diagrams within touch-scrollable blocks, and prevents horizontal window sway.
- **Refined Document Elements:**
  - Minimal 1px blockquote borders with transparent backgrounds across RTL, LTR, and print modes.
  - Interactive task lists: Completed items (`- [x]`) dim to 55% opacity with an automatic strikethrough.
  - Image boundaries: Pasted screenshots are centered and bounded (`max-height: 520px`) to prevent oversized image blowouts.
  - Joplin internal links (`:/<id>`) feature a dashed accent underline to distinguish them from external URLs.
  - Formatted styling for native `[[toc]]` and `[^1]` footnotes.

---

## 🌍 International Font Presets

| Script / Target | Font Preset | Technical Description |
| :--- | :--- | :--- |
| **Global / Latin / Cyrillic** | **Inter** *(Default)* | Variable sans-serif optimized for screens |
| **Clean Modern Sans** | **Roboto** | Standard geometric sans-serif |
| **Persian / Arabic / Urdu** | **Vazirmatn** | Persian and Arabic script typeface |
| **Standard Arabic** | **Noto Sans Arabic** | Modern Noto Arabic typography |
| **Simplified Chinese (CJK)** | **Noto Sans SC** | Comprehensive Simplified Chinese font stack |
| **Japanese (CJK)** | **Noto Sans JP** | Balanced Japanese font stack |
| **Hebrew** | **Heebo** | Clean Hebrew and Latin typography |
| **Devanagari** | **Noto Sans Devanagari** | Complete Hindi and Sanskrit script support |
| **Editorial & Long-form** | **Lora** | Contemporary serif suited for body text |
| **Monospace / Code** | **Fira Code** / **JetBrains Mono** | Developer monospace typefaces with clean punctuation |
| **Operating System Native** | **System Default** | Zero network overhead; uses OS system font stack |

---

## 🎨 Built-In Themes

| Theme | Type | Characteristics |
| :--- | :---: | :--- |
| **Tokyo Night** | Dark | Deep navy background with high-contrast pastel accents |
| **Tokyo Night Storm** | Dark | Medium-contrast slate blue variation |
| **Everforest Dark** | Dark | Nature-inspired warm green background with muted accents |
| **Everforest Light** | Light | Low-contrast paper-toned warm background |
| **Catppuccin Mocha** | Dark | Modern dark palette with soothing pastel accents |
| **Catppuccin Latte** | Light | High-contrast light palette with clean pastel accents |
| **Nord** | Dark | Arctic blue-gray palette with subdued cold tones |
| **Dracula** | Dark | High-contrast dark purple background with vibrant accents |
| **Gruvbox Dark** | Dark | Retro warm brown and amber palette |
| **Gruvbox Light** | Light | Retro parchment light palette with warm accents |
| **Atom One Dark** | Dark | Traditional Atom editor syntax theme |
| **Atom One Light** | Light | High-clarity light theme with crisp editor contrast |

---

## 🚀 Installation

### In-App Plugin Search (Recommended)
1. Open Joplin Desktop.
2. Navigate to **Tools > Options > Plugins** (macOS: **Joplin > Preferences > Plugins**).
3. Search for **`Theme Studio`**.
4. Click **Install** and restart Joplin.

### Manual Installation (`.jpl`)

#### Desktop (Windows, macOS, Linux):
1. Download `org.joplin.plugin.theme-studio.jpl` from the [Releases](https://github.com/xyasharx/joplin-plugin-theme-studio/releases) page.
2. In Joplin, go to **Tools > Options > Plugins**.
3. Click the gear icon (**⚙**) > **Install from file**.
4. Select the downloaded `.jpl` file and restart Joplin.

#### Mobile (Android):
1. Download the `.jpl` file to your mobile device storage.
2. Open Joplin Mobile > Tap **Menu (≡)** > **Configuration** > **Plugins**.
3. Under **Advanced**, tap **Install from file**.
4. Select the `.jpl` file and restart the application.

---

## ⚙️ Configuration Reference

Access the settings panel under **Tools > Options > Theme Studio** (on Mobile: **Configuration > Plugins > Theme Studio**):

| Setting Key | Options / Inputs | Default | Description |
| :--- | :--- | :--- | :--- |
| **Color Theme** | 12 built-in palettes | `Atom One Dark` | Sets document and editor color tokens |
| **Layout Direction** | `LTR`, `Auto-Detect (BiDi)`, `RTL` | Auto-detected | Primary text direction and border alignment |
| **Apply Theme to Markdown Editor** | `true` / `false` | `true` | Styles CodeMirror 6/5 and TinyMCE editors |
| **International Font Preset** | 11 font presets | Auto-detected | On-demand web font loaded via CDN |
| **Custom Font Stack** | CSS `font-family` string | System Stack | Active when preset is set to *Custom* |
| **Code Font Preset** | `Fira Code`, `JetBrains Mono`, `System`, `Custom` | `Fira Code` | Monospace font for code blocks and editor |
| **Custom Code Font Stack** | CSS `font-family` string | Cascadia / Consolas | Active when code preset is set to *Custom* |
| **Font Size** | Text string (e.g., `16px`, `18px`) | `16px` | Scales base text size across desktop & mobile |
| **Line Height** | Numeric string (e.g., `1.6`, `1.75`) | `1.75` | Sets body reading line spacing |
| **Reading Width (Focus Mode)** | `Full Width`, `Comfortable (920px)`, `Compact (760px)` | `Full Width` | Constrains note container width on wide monitors |
| **PDF Export Appearance** | `Exact Match`, `Paper Friendly` | `Exact Match` | Controls background retention in exported PDFs |

---

## 💡 Mixed-Language (LTR within RTL) Usage

When **Layout Direction** is set to `RTL`, left-to-right code explanations, English citations, or quotes can be isolated using HTML container syntax:

```html
<div dir="ltr">

### English Subheading
- List markers position on the left margin.
- Hyperlinks and formatting render left-to-right.

> Blockquotes format with a left accent border.

</div>
```

*Tip: Selecting `Auto-Detect (Per-Paragraph BiDi)` handles mixed language paragraphs automatically without requiring manual `div` tags.*

---

## 🛠️ Development & Build Pipeline

### Prerequisites
- Node.js >= 20.9.0
- npm >= 9.0.0

### Build Instructions
```bash
# 1. Clone the repository
git clone https://github.com/xyasharx/joplin-plugin-theme-studio.git
cd joplin-plugin-theme-studio

# 2. Install dependencies
npm install

# 3. Compile TypeScript and build .jpl bundle
npm run dist
```

The compiled archive and hash metadata will be generated in the `publish/` directory:
- `publish/org.joplin.plugin.theme-studio.jpl`
- `publish/org.joplin.plugin.theme-studio.json`

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
