import React, { useState } from 'react'
import { FileText, Download } from 'lucide-react'
import { exportSummaryAsPdf } from '../../utils/pdf'

interface ExportPanelProps {
  summary: string
  translatedSummary: string
  translatedLang: string
  pageTitle: string
  pageUrl: string
}

export default function ExportPanel({
  summary,
  translatedSummary,
  translatedLang,
  pageTitle,
  pageUrl,
}: ExportPanelProps) {
  const [exporting, setExporting] = useState(false)

  if (!summary) return null

  async function handleExport() {
    setExporting(true)
    try {
      exportSummaryAsPdf({
        title: pageTitle,
        url: pageUrl,
        summary,
        translated: translatedSummary || undefined,
        translatedLang: translatedLang || undefined,
      })
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setTimeout(() => setExporting(false), 1500)
    }
  }

  return (
    <div className="px-4 pb-4">
      <div className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-indigo-400" />
            <p className="text-gray-300 text-xs font-medium">Download Summary</p>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all flex-shrink-0
              ${exporting
                ? 'bg-indigo-800/60 text-indigo-200 cursor-not-allowed'
                : 'bg-indigo-700 hover:bg-indigo-600 text-white'
              }
            `}
          >
            {exporting ? (
              <>
                <span className="w-3 h-3 border-2 border-indigo-300/30 border-t-indigo-200 rounded-full animate-spin" />
                Opening...
              </>
            ) : (
              <>
                <Download size={13} />
                Download
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
