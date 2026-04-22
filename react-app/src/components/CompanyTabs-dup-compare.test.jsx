import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CompanyTabs from './CompanyTabs'

const companies = {
  c1: { name: 'Startup Alpha' },
  c2: { name: 'Startup Beta' },
}

const baseProps = () => ({
  companies,
  activeCompany: 'c1',
  onCompanyChange: vi.fn(),
  onAddCompany: vi.fn(),
  onRemoveCompany: vi.fn(),
  onUpdateCompany: vi.fn(),
  onDuplicateCompany: vi.fn(),
  selectedCompanyIds: [],
  onToggleCompareSelection: vi.fn(),
})

describe('CompanyTabs duplicate + compare', () => {
  let props
  let originalScrollIntoView

  beforeEach(() => {
    props = baseProps()
    originalScrollIntoView = HTMLElement.prototype.scrollIntoView
    HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView
  })

  it('renders duplicate button and calls onDuplicateCompany on click', () => {
    render(<CompanyTabs {...props} />)
    const btns = screen.getAllByRole('button', { name: /duplicate company/i })
    expect(btns).toHaveLength(2)
    fireEvent.click(btns[0])
    expect(props.onDuplicateCompany).toHaveBeenCalledWith('c1')
  })

  it('duplicate click does not change active tab (stopPropagation)', () => {
    render(<CompanyTabs {...props} />)
    const btns = screen.getAllByRole('button', { name: /duplicate company/i })
    fireEvent.click(btns[1])
    expect(props.onCompanyChange).not.toHaveBeenCalled()
    expect(props.onDuplicateCompany).toHaveBeenCalledWith('c2')
  })

  it('renders compare checkboxes that reflect selectedCompanyIds', () => {
    render(<CompanyTabs {...props} selectedCompanyIds={['c2']} />)
    const boxes = screen.getAllByRole('checkbox', { name: /include .* in compare/i })
    expect(boxes).toHaveLength(2)
    expect(boxes[0].checked).toBe(false)
    expect(boxes[1].checked).toBe(true)
  })

  it('toggling a checkbox calls onToggleCompareSelection with the id', () => {
    render(<CompanyTabs {...props} />)
    const boxes = screen.getAllByRole('checkbox', { name: /include .* in compare/i })
    fireEvent.click(boxes[0])
    expect(props.onToggleCompareSelection).toHaveBeenCalledWith('c1')
  })

  it('checkbox click does not activate the tab (stopPropagation)', () => {
    render(<CompanyTabs {...props} />)
    const boxes = screen.getAllByRole('checkbox', { name: /include .* in compare/i })
    fireEvent.click(boxes[1])
    expect(props.onCompanyChange).not.toHaveBeenCalled()
  })

  it('scrolls the active tab into view when selection changes', () => {
    const { rerender } = render(<CompanyTabs {...props} />)
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(1)

    rerender(<CompanyTabs {...props} activeCompany="c2" />)
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(2)
  })
})
