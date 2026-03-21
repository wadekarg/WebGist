// Relay page: reads exported HTML from storage, renders it, and opens the print/PDF dialog.
chrome.storage.local.get('wg_export', (data) => {
  const record = data.wg_export as { html: string } | undefined
  if (!record?.html) {
    const msg = document.createElement('p')
    msg.style.cssText = 'font-family:sans-serif;padding:24px;color:#666'
    msg.textContent = 'No export data found. Please try again from the WebGist popup.'
    document.body.appendChild(msg)
    return
  }
  chrome.storage.local.remove('wg_export')

  // Parse the generated HTML into a detached document, then safely copy nodes
  // using importNode() instead of innerHTML to avoid XSS risks.
  const parser = new DOMParser()
  const doc = parser.parseFromString(record.html, 'text/html')

  // Copy <style> and <link> nodes from parsed <head> into the real document head
  Array.from(doc.head.childNodes).forEach((node) => {
    const tag = (node as Element).tagName?.toLowerCase()
    if (tag === 'style' || tag === 'link' || tag === 'meta') {
      document.head.appendChild(document.importNode(node, true))
    }
  })

  // Add style to hide the print button during actual printing
  const printStyle = document.createElement('style')
  printStyle.textContent = '@media print { #wg-print-bar { display: none !important } }'
  document.head.appendChild(printStyle)

  // Copy body children from the parsed document using importNode (safe, no innerHTML)
  Array.from(doc.body.childNodes).forEach((node) => {
    document.body.appendChild(document.importNode(node, true))
  })

  // Add a floating "Save as PDF" button (visible on screen, hidden when printing)
  const bar = document.createElement('div')
  bar.id = 'wg-print-bar'
  bar.style.cssText =
    'position:fixed;top:14px;right:18px;z-index:9999;display:flex;align-items:center;gap:10px;'

  const hint = document.createElement('span')
  hint.style.cssText = 'font-family:sans-serif;font-size:12px;color:#64748b'
  hint.textContent = 'Ctrl+P → Save as PDF, or:'

  const printBtn = document.createElement('button')
  printBtn.style.cssText =
    'background:#3b82f6;color:white;border:none;padding:7px 16px;border-radius:6px;' +
    'font-size:13px;font-weight:600;cursor:pointer;font-family:sans-serif;' +
    'box-shadow:0 2px 8px rgba(59,130,246,.4);'
  printBtn.textContent = '🖨️ Save as PDF'
  printBtn.addEventListener('click', () => window.print())

  bar.appendChild(hint)
  bar.appendChild(printBtn)
  document.body.appendChild(bar)

  // Auto-open print dialog
  setTimeout(() => window.print(), 600)
})
