// Logging system
function log(msg) {
    const logArea = document.getElementById('debugLog');
    const content = document.getElementById('logContent');
    logArea.style.display = 'block';
    content.textContent += `> ${msg}\n`;
}

// Extract BibTeX field helper
function getBibField(field, text) {
    const regex = new RegExp(`${field}\\s*=\\s*[{\\x22]?([^}\\x22]+)[}\\x22]?`, 'i');
    const match = text.match(regex);
    if (match) return match[1].trim().replace(/[{}]/g, '').replace(/[,]$/, '');
    return null;
}

// Parse BibTeX snippet and update the preview
function updateUI(text) {
    if (!text) return {};
    const info = {
        title: getBibField('title', text),
        meeting: getBibField('booktitle', text) || getBibField('journal', text) || "Unknown",
        year: getBibField('year', text) || "0",
        url: getBibField('url', text) || (getBibField('doi', text) ? `https://doi.org/${getBibField('doi', text)}` : null)
    };
    document.getElementById('outTitle').textContent = info.title || "Title not detected";
    document.getElementById('outMeeting').textContent = info.meeting;
    document.getElementById('outYear').textContent = info.year;
    const linkEl = document.getElementById('outLink');
    if (info.url) {
        linkEl.href = info.url; linkEl.style.display = 'inline';
        document.getElementById('linkPlaceholder').style.display = 'none';
    }
    return info;
}

// Core logic: grab content from the active tab
async function grabContent() {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return null;

    const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            // 1. Detect BibTeX (search aggressively across the DOM)
            const bibRegex = /@\w+\s*\{[^]*?\n\s*\}/g; 
            let foundBib = null;
            
            // Check textareas (commonly used by ACM), pre, code, etc.
            const containers = document.querySelectorAll('textarea, pre, code, .bibtex, .citation-body');
            for (let c of containers) {
                const val = (c.value || c.innerText || "");
                if (val.includes('@')) {
                    const m = val.match(bibRegex);
                    if (m) { foundBib = m[0]; break; }
                }
            }
            if (!foundBib) {
                const m = document.body.innerText.match(bibRegex);
                if (m) foundBib = m[0];
            }

            // 2. Detect PDF link
            let foundPdf = null;
            const acmLink = document.querySelector('a[href*="/doi/epdf/"]');
            if (acmLink) {
                foundPdf = acmLink.href.replace('/doi/epdf/', '/doi/pdf/');
            } else {
                const metaPdf = document.querySelector('meta[name="citation_pdf_url"]');
                if (metaPdf) foundPdf = metaPdf.content;
            }
            
            // Fallback: locate any .pdf link
            if (!foundPdf) {
                const links = Array.from(document.querySelectorAll('a'));
                const l = links.find(a => a.href.toLowerCase().endsWith('.pdf'));
                if (l) foundPdf = l.href;
            }

            return { bib: foundBib, pdf: foundPdf };
        }
    });
    return results?.[0]?.result;
}

// Sync data to Notion
async function syncToNotion(info) {
    const token = document.getElementById('notionToken').value.trim();
    const dbId = document.getElementById('notionDbId').value.trim();
    if (!token || !dbId) {
        log("Error: Token or Database ID is empty");
        return;
    }

    const currentDate = new Date().toISOString().split('T')[0];

    log("Syncing to Notion...");
    try {
        const res = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
            },
            body: JSON.stringify({
                parent: { database_id: dbId },
                properties: {
                    "Paper": { 
                        title: [{ text: { content: info.title || "Untitled" } }] 
                    },
                    "Proceedings Title": { 
                        rich_text: [{ text: { content: info.meeting || "Unknown" } }] 
                    },
                    "Date": { 
                        rich_text: [{ text: { content: info.year || "0" } }] 
                    },
                    "URL": { 
                        url: info.url || "https://example.com" 
                    },
                    "PDF Name": { 
                        rich_text: [{ text: { content: info.pdfPath || "No local file" } }] 
                    },
                    "Date Added": { 
                        date: { start: currentDate } 
                    }
                }
            })
        });
        
        const data = await res.json();
        if (res.ok) {
            log("✅ Notion sync succeeded");
        } else {
            log("❌ Notion error: " + data.message);
            console.error("Detail:", data);
        }
    } catch (e) { 
        log("❌ Network error: " + e.message); 
    }
}

// Initialization helpers
// --- 1. Save configuration helper ---
function saveConfig() {
    const config = {
        subfolder: document.getElementById('subfolder').value,
        notionToken: document.getElementById('notionToken').value.trim(),
        notionDbId: document.getElementById('notionDbId').value.trim()
    };
    chrome.storage.local.set(config, () => {
        console.log("Configuration saved automatically");
    });
}

// --- 2. Initialization logic ---
document.addEventListener('DOMContentLoaded', async () => {
    // Populate cached values
    chrome.storage.local.get(['subfolder', 'notionToken', 'notionDbId'], (res) => {
        if (res.subfolder) document.getElementById('subfolder').value = res.subfolder;
        if (res.notionToken) document.getElementById('notionToken').value = res.notionToken;
        if (res.notionDbId) document.getElementById('notionDbId').value = res.notionDbId;
    });

    // Bind autosave events to inputs
    ['subfolder', 'notionToken', 'notionDbId'].forEach(id => {
        document.getElementById(id).addEventListener('input', saveConfig);
    });

    // Auto-grab BibTeX from the current page
    const data = await grabContent();
    if (data?.bib) {
        document.getElementById('bibInput').value = data.bib;
        updateUI(data.bib);
        document.getElementById('status').textContent = "✅ Detected automatically";
    } else {
        document.getElementById('status').textContent = "❓ No BibTeX detected, please paste manually";
    }
});

document.getElementById('mainActionBtn').addEventListener('click', async () => {
    const bibText = document.getElementById('bibInput').value;
    const info = updateUI(bibText);
    const data = await grabContent();

    if (!info.title) { log("Error: Unable to parse title"); return; }
    
    // Autosave configuration
    saveConfig();

    if (data?.pdf) {
        const sub = document.getElementById('subfolder').value;
        const safeTitle = info.title.replace(/[\\/:*?"<>|]/g, '_').trim();
        // Build download path
        const filename = (sub ? `${sub}/${safeTitle}.pdf` : `${safeTitle}.pdf`).replace(/^[\\/]+/, "");
        
        info.pdfPath = filename;

        log("Starting download...");
        chrome.downloads.download({ url: data.pdf, filename: filename, saveAs: true }, (id) => {
            if (chrome.runtime.lastError) {
                log("Download canceled; path will not be recorded in Notion");
                info.pdfPath = "Download canceled";
            }
            // Sync regardless of download outcome
            syncToNotion(info);
        });
    } else {
        log("No PDF found, syncing info only...");
        info.pdfPath = "PDF link not found";
        syncToNotion(info);
    }
});