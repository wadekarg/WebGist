// Relay page: reads exported HTML from storage, renders it, and opens the print/PDF dialog.
chrome.storage.local.get('wg_export', (data) => {
  const record = data.wg_export as { html: string } | undefined
  if (!record?.html) {
    document.body.innerHTML =
      '<p style="font-family:sans-serif;padding:24px;color:#666">No export data found. Please try again from the WebGist popup.</p>'
    return
  }
  chrome.storage.local.remove('wg_export')

  // Parse the generated HTML and inject it into the current extension page.
  // This keeps us in a trusted context where window.print() works reliably.
  const parser = new DOMParser()
  const doc = parser.parseFromString(record.html, 'text/html')

  // Inject head styles
  document.head.innerHTML = doc.head.innerHTML

  // Add style to hide the print button during actual printing
  const printStyle = document.createElement('style')
  printStyle.textContent = '@media print { #wg-print-bar { display: none !important } }'
  document.head.appendChild(printStyle)

  // Inject body content
  document.body.innerHTML = doc.body.innerHTML

  // Add a floating "Save as PDF" button (visible on screen, hidden when printing)
  const bar = document.createElement('div')
  bar.id = 'wg-print-bar'
  bar.style.cssText =
    'position:fixed;top:14px;right:18px;z-index:9999;display:flex;align-items:center;gap:10px;'
  bar.innerHTML = `
    <span style="font-family:sans-serif;font-size:12px;color:#64748b">
      Ctrl+P → Save as PDF, or:
    </span>
    <button
      onclick="window.print()"
      style="background:#4f46e5;color:white;border:none;padding:7px 16px;border-radius:6px;
             font-size:13px;font-weight:600;cursor:pointer;font-family:sans-serif;
             box-shadow:0 2px 8px rgba(79,70,229,.4);">
      🖨️ Save as PDF
    </button>`
  document.body.appendChild(bar)

  // Auto-open print dialog
  setTimeout(() => window.print(), 600)
})
