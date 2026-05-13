import { useEffect, useRef, useState } from 'react'
import { parseImportJson } from '../utils/importCompany'
import { IMPORT_PROMPT } from '../utils/importPrompts'

function formatSafeCount(count) {
  return `${count} SAFE${count === 1 ? '' : 's'}`
}

function ImportModal({ open, activeCompanyName = 'active scenario', onClose, onImport, onShowError, onShowSuccess }) {
  const [jsonText, setJsonText] = useState('')
  const [errors, setErrors] = useState([])
  // pendingPreview holds a validated result so the user can review warnings
  // before committing the import.
  const [pendingPreview, setPendingPreview] = useState(null)
  const [safeDestination, setSafeDestination] = useState('append')
  const [promptOpen, setPromptOpen] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const textareaRef = useRef(null)
  const closeBtnRef = useRef(null)

  useEffect(() => {
    if (!open) {
      setJsonText('')
      setErrors([])
      setPendingPreview(null)
      setSafeDestination('append')
      setPromptOpen(false)
      setCopiedPrompt(false)
    }
  }, [open])

  // If the user edits the textarea after a validation, drop the pending preview
  // so they revalidate.
  useEffect(() => {
    if (pendingPreview && pendingPreview.sourceText !== jsonText) {
      setPendingPreview(null)
      setSafeDestination('append')
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

  const commitImport = (result, destination) => {
    onImport({
      importKind: result.importKind,
      company: result.company,
      safes: result.safes || [],
      warnings: result.warnings || [],
      destination
    })
  }

  const handleImport = () => {
    // Two-step UX so the user can review warnings before committing.
    if (pendingPreview && pendingPreview.sourceText === jsonText) {
      commitImport(
        pendingPreview,
        pendingPreview.importKind === 'safe-only' ? safeDestination : 'new'
      )
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
    if (result.importKind === 'safe-only') {
      setSafeDestination('append')
      setPendingPreview({ ...result, warnings, sourceText: jsonText })
      return
    }
    if (warnings.length === 0) {
      commitImport(result, 'new')
      return
    }
    setPendingPreview({ ...result, warnings, sourceText: jsonText })
  }

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(IMPORT_PROMPT)
      setCopiedPrompt(true)
      setTimeout(() => setCopiedPrompt(false), 1500)
      onShowSuccess?.('Prompt copied to clipboard', 1500)
    } catch {
      onShowError?.('Could not copy — your browser blocked clipboard access', 2200)
    }
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const isSafeOnlyPreview = pendingPreview?.importKind === 'safe-only'
  const previewSafeCount = pendingPreview?.safes?.length || 0
  const importButtonLabel = pendingPreview && pendingPreview.sourceText === jsonText
    ? isSafeOnlyPreview
      ? safeDestination === 'append'
        ? `Append ${formatSafeCount(previewSafeCount)}`
        : 'Create scenario'
      : 'Import anyway'
    : 'Import'

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
          Paste a JSON cap table below. Get one by sending the prompt below to Claude with the cap table XLS and any SAFE PDFs attached.
        </p>

        <div className="import-modal-prompts">
          <PromptDisclosure
            title="Prompt for cap table + SAFE files"
            description="Use with the spreadsheet and any SAFE PDFs in one Claude chat."
            prompt={IMPORT_PROMPT}
            isOpen={promptOpen}
            isCopied={copiedPrompt}
            onToggle={() => setPromptOpen((open) => !open)}
            onCopy={handleCopyPrompt}
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

        {isSafeOnlyPreview && (
          <div className="import-modal-destination" role="group" aria-labelledby="import-destination-title">
            <strong id="import-destination-title">Found {formatSafeCount(previewSafeCount)}</strong>
            <p>Choose where to import these SAFE notes.</p>
            <label className="import-destination-option">
              <input
                type="radio"
                name="safe-import-destination"
                value="append"
                checked={safeDestination === 'append'}
                onChange={() => setSafeDestination('append')}
              />
              <span>
                Append to <strong>{activeCompanyName}</strong>
              </span>
            </label>
            <label className="import-destination-option">
              <input
                type="radio"
                name="safe-import-destination"
                value="new"
                checked={safeDestination === 'new'}
                onChange={() => setSafeDestination('new')}
              />
              <span>Create a new imported scenario</span>
            </label>
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
            {importButtonLabel}
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
