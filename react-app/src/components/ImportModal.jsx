import { useEffect, useRef, useState } from 'react'
import { parseImportJson } from '../utils/importCompany'
import { XLS_IMPORT_PROMPT, SAFE_PDF_IMPORT_PROMPT } from '../utils/importPrompts'

function ImportModal({ open, onClose, onImport, onShowError, onShowSuccess }) {
  const [jsonText, setJsonText] = useState('')
  const [errors, setErrors] = useState([])
  // pendingPreview holds a validated result so the user can review warnings
  // before committing the import.
  const [pendingPreview, setPendingPreview] = useState(null)
  const [openPrompt, setOpenPrompt] = useState(null) // 'xls' | 'safe' | null
  const [copiedPrompt, setCopiedPrompt] = useState(null)
  const textareaRef = useRef(null)
  const closeBtnRef = useRef(null)

  useEffect(() => {
    if (!open) {
      setJsonText('')
      setErrors([])
      setPendingPreview(null)
      setOpenPrompt(null)
      setCopiedPrompt(null)
    }
  }, [open])

  // If the user edits the textarea after a validation, drop the pending preview
  // so they revalidate.
  useEffect(() => {
    if (pendingPreview && pendingPreview.sourceText !== jsonText) {
      setPendingPreview(null)
    }
  }, [jsonText, pendingPreview])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [open])

  if (!open) return null

  const handleImport = () => {
    // Two-step UX so the user can review warnings before committing.
    if (pendingPreview && pendingPreview.sourceText === jsonText) {
      onImport(pendingPreview.company, pendingPreview.warnings)
      return
    }
    const result = parseImportJson(jsonText)
    if (!result.ok) {
      setErrors(result.errors)
      setPendingPreview(null)
      return
    }
    setErrors([])
    const warnings = result.warnings || []
    if (warnings.length === 0) {
      onImport(result.company, [])
      return
    }
    setPendingPreview({ company: result.company, warnings, sourceText: jsonText })
  }

  const handleCopyPrompt = async (kind, text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedPrompt(kind)
      setTimeout(() => setCopiedPrompt((c) => (c === kind ? null : c)), 1500)
      onShowSuccess?.('Prompt copied to clipboard', 1500)
    } catch {
      onShowError?.('Could not copy — your browser blocked clipboard access', 2200)
    }
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="import-modal-backdrop" onClick={handleBackdropClick}>
      <div
        className="import-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
      >
        <div className="import-modal-header">
          <h2 id="import-modal-title">Import cap table</h2>
          <button
            type="button"
            className="import-modal-close"
            onClick={onClose}
            ref={closeBtnRef}
            aria-label="Close import dialog"
          >
            ×
          </button>
        </div>

        <p className="import-modal-intro">
          Paste a JSON cap table below. Get one by sending your XLS or SAFE PDF to Claude with the prompt below.
        </p>

        <div className="import-modal-prompts">
          <PromptDisclosure
            kind="xls"
            title="Prompt for XLS cap tables"
            description="Use with the company's cap table spreadsheet."
            prompt={XLS_IMPORT_PROMPT}
            isOpen={openPrompt === 'xls'}
            isCopied={copiedPrompt === 'xls'}
            onToggle={() => setOpenPrompt((p) => (p === 'xls' ? null : 'xls'))}
            onCopy={() => handleCopyPrompt('xls', XLS_IMPORT_PROMPT)}
          />
          <PromptDisclosure
            kind="safe"
            title="Prompt for SAFE PDFs"
            description="Use with one or more SAFE PDFs attached."
            prompt={SAFE_PDF_IMPORT_PROMPT}
            isOpen={openPrompt === 'safe'}
            isCopied={copiedPrompt === 'safe'}
            onToggle={() => setOpenPrompt((p) => (p === 'safe' ? null : 'safe'))}
            onCopy={() => handleCopyPrompt('safe', SAFE_PDF_IMPORT_PROMPT)}
          />
        </div>

        <label className="import-modal-textarea-label" htmlFor="import-json-textarea">
          Paste JSON
        </label>
        <textarea
          id="import-json-textarea"
          ref={textareaRef}
          className="import-modal-textarea"
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={'{\n  "name": "Acme",\n  "founders": [ ... ],\n  "priorInvestors": [ ... ],\n  "safes": [ ... ]\n}'}
          spellCheck={false}
        />

        {errors.length > 0 && (
          <div className="import-modal-errors" role="alert">
            <strong>Couldn&rsquo;t import:</strong>
            <ul>
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {pendingPreview && pendingPreview.warnings.length > 0 && (
          <div className="import-modal-warnings">
            <strong>Looks good — but check these before importing:</strong>
            <ul>
              {pendingPreview.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        <div className="import-modal-actions">
          <button
            type="button"
            className="import-modal-btn import-modal-btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="import-modal-btn import-modal-btn-primary"
            onClick={handleImport}
            disabled={jsonText.trim() === ''}
          >
            {pendingPreview && pendingPreview.sourceText === jsonText ? 'Import anyway' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PromptDisclosure({ title, description, prompt, isOpen, isCopied, onToggle, onCopy }) {
  return (
    <div className={`import-prompt-disclosure${isOpen ? ' open' : ''}`}>
      <div className="import-prompt-header">
        <button
          type="button"
          className="import-prompt-toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
        >
          <span className={`chevron-icon${isOpen ? '' : ' is-collapsed'}`}>▼</span>
          <span className="import-prompt-title">{title}</span>
          <span className="import-prompt-description">{description}</span>
        </button>
        <button
          type="button"
          className="import-prompt-copy"
          onClick={onCopy}
          title="Copy prompt to clipboard"
        >
          {isCopied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      {isOpen && (
        <pre className="import-prompt-body">{prompt}</pre>
      )}
    </div>
  )
}

export default ImportModal
