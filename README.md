# PaperToNotion

If you use Chrome for paper searching/reading and use Notion for paper management, then PaperToNotion may help. 

PaperToNotion is a Chrome extension that detects BibTeX snippets on any web page, parses the key metadata, downloads the matching PDF, and pushes the cleaned information into your Notion database. It keeps your reading workflow and your Notion knowledge base perfectly in sync.

## Highlights
- 🔎 Automatic detection: aggressively scans the current tab for BibTeX blocks across `textarea`, `pre`, `code`, ACM/IEEE specific containers, and page text.
- 📄 Smart parsing: extracts `title`, `booktitle`/`journal`, `year`, and `url`/`doi`, then shows a live preview inside the popup.
- ⬇️ One-click downloads: finds PDF links, normalizes the file name using the paper title, and lets Chrome download it into an optional subfolder.
- 🧠 Notion sync: creates a page in your database through the official Notion API with Paper, Proceedings Title, Date, URL, PDF Name, and Date Added properties.
- 💾 Persistent config: Notion token, database ID, and download subfolder are cached in `chrome.storage` so you only enter them once.
- 🧩 Field mapping: rename the Title/Conference/Year/URL property targets directly in the popup to match any Notion schema.

## Installation
1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Toggle on **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the project root.
5. Pin the extension and open it on any paper page to start parsing.

## Notion Setup
You need a Notion Integration Token and a target database ID before syncing papers.

1. **Create an integration**: visit [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations), choose **+ New integration**, and keep the generated token (it starts with `secret_`).
2. **Share the database**: open the database inside Notion, click the ••• menu → **Add connections**, and select the integration so it has write access.
3. **Copy the database ID**: from the database URL `https://www.notion.so/Workspace/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=...`, grab the 32-character block (`xxxxxxxx...`).
4. **Enter the values in the popup**:
	- Notion API Token → the `secret_` string from step 1.
	- Notion Database ID → the 32-character ID from step 3 (no braces or extra symbols).

## Usage
1. Open a paper page that exposes BibTeX (ACM DL, USENIX, IEEE Xplore, arXiv, etc.). **In some sites, you need to manually click the icon that shows the BibTeX (ACM DL, USENIX)**.
2. Click the extension icon; it auto-grabs BibTeX. If detection fails, paste the snippet manually into the textarea.
3. Expand **⚙️ Configure Notion & Path** on the first run and fill in:
	- Notion API Token
	- Notion Database ID
	- Download subfolder (optional, e.g., `papers/2025`)
	- Preferred property names for Title/Conference/Year/URL so the payload maps to the correct Notion columns
  
    The information will be remembered after filling for the first time. 
4. Press **🚀 Parse, Download, and Sync**:
	- The extension downloads the PDF via Chrome’s download manager using the sanitized title.
	- Status messages and Notion API responses appear in the log area at the bottom of the popup.
	- A new page shows up in your Notion database with the parsed metadata and the recorded PDF name.

## Development Notes
- Core parsing, PDF detection, and Notion sync live in [popup.js](popup.js).
- The popup layout is defined in [popup.html](popup.html) with styles in [styles.css](styles.css).
- Permissions and entry points are configured via [manifest.json](manifest.json).

Feel free to open issues or PRs to improve parsing heuristics, UI polish, or Notion field mappings.
