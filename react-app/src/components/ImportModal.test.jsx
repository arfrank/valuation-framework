import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ImportModal from './ImportModal'

function renderImportModal(props = {}) {
  const user = userEvent.setup()
  const onImport = vi.fn()
  const onClose = vi.fn()
  render(
    <ImportModal
      open={true}
      activeCompanyName="Scenario 1"
      onClose={onClose}
      onImport={onImport}
      onShowError={vi.fn()}
      onShowSuccess={vi.fn()}
      {...props}
    />
  )
  return { user, onImport, onClose }
}

function pasteJson(payload) {
  fireEvent.change(screen.getByLabelText(/paste json/i), {
    target: {
      value: typeof payload === 'string' ? payload : JSON.stringify(payload)
    }
  })
}

describe('ImportModal', () => {
  it('shows one combined prompt for spreadsheets and SAFE PDFs', async () => {
    const { user } = renderImportModal()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)

    expect(screen.getByText('Prompt for cap table + SAFE files')).toBeInTheDocument()
    expect(screen.queryByText('Prompt for XLS cap tables')).not.toBeInTheDocument()
    expect(screen.queryByText('Prompt for SAFE PDFs')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /prompt for cap table/i }))
    expect(screen.getByText(/Read all attached files together/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('One or more SAFE PDFs'))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Excel/Google Sheets cap table export'))
  })

  it('shows malformed JSON errors without importing', async () => {
    const { user, onImport } = renderImportModal()

    pasteJson('{ not json')
    await user.click(screen.getByRole('button', { name: 'Import' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/invalid json/i)
    expect(onImport).not.toHaveBeenCalled()
  })

  it('imports full cap-table JSON as a new scenario', async () => {
    const { user, onImport } = renderImportModal()

    pasteJson({
      name: 'Acme',
      founders: [{ name: 'Founder Team', ownershipPercent: 85 }],
      priorInvestors: [{ name: 'Seed Investors', ownershipPercent: 15 }]
    })
    await user.click(screen.getByRole('button', { name: 'Import' }))

    expect(onImport).toHaveBeenCalledWith(expect.objectContaining({
      importKind: 'company',
      destination: 'new',
      company: expect.objectContaining({ name: 'Acme' })
    }))
  })

  it('previews SAFE-only JSON and appends to the active scenario by default', async () => {
    const { user, onImport } = renderImportModal()

    pasteJson({
      safes: [{ investorName: 'Bridge Investor', amount: 1, cap: 20 }]
    })
    await user.click(screen.getByRole('button', { name: 'Import' }))

    expect(screen.getByText('Found 1 SAFE')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /append to scenario 1/i })).toBeChecked()
    expect(onImport).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Append 1 SAFE' }))

    expect(onImport).toHaveBeenCalledWith(expect.objectContaining({
      importKind: 'safe-only',
      destination: 'append',
      safes: [expect.objectContaining({ investorName: 'Bridge Investor' })]
    }))
  })

  it('can create a new scenario from SAFE-only JSON', async () => {
    const { user, onImport } = renderImportModal()

    pasteJson({
      safes: [
        { investorName: 'Bridge Investor', amount: 1, cap: 20 },
        { investorName: 'Angel', amount: 0.5, discount: 20 }
      ]
    })
    await user.click(screen.getByRole('button', { name: 'Import' }))
    await user.click(screen.getByRole('radio', { name: /create a new imported scenario/i }))
    await user.click(screen.getByRole('button', { name: 'Create scenario' }))

    expect(onImport).toHaveBeenCalledWith(expect.objectContaining({
      importKind: 'safe-only',
      destination: 'new',
      safes: [
        expect.objectContaining({ investorName: 'Bridge Investor' }),
        expect.objectContaining({ investorName: 'Angel' })
      ]
    }))
  })
})
