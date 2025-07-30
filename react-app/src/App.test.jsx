import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from './App'

// Mock the child components to focus on App's permalink functionality
vi.mock('./components/CompanyTabs', () => ({
  default: ({ _companies, _activeCompany, onCompanyChange }) => (
    <div data-testid="company-tabs">
      <button onClick={() => onCompanyChange('company1')}>Company 1</button>
    </div>
  )
}))

vi.mock('./components/InputForm', () => ({
  default: ({ company, onUpdate }) => (
    <div data-testid="input-form">
      <input 
        data-testid="post-money-input" 
        value={company?.postMoneyVal || 0}
        onChange={(e) => onUpdate({ postMoneyVal: parseFloat(e.target.value) })}
      />
    </div>
  )
}))

vi.mock('./components/ScenarioCard', () => ({
  default: ({ scenario, _onApplyScenario, onCopyPermalink, isBase }) => (
    <div data-testid={isBase ? "base-scenario" : "alt-scenario"}>
      <span>Post-Money: {scenario?.postMoneyVal}</span>
      {!isBase && onCopyPermalink && (
        <button onClick={() => onCopyPermalink(scenario)}>
          Share Permalink
        </button>
      )}
    </div>
  )
}))

vi.mock('./components/Logo', () => ({
  default: () => <div data-testid="logo">Logo</div>
}))

vi.mock('./components/GeometricBackground', () => ({
  default: () => <div data-testid="geometric-bg">Background</div>
}))

describe('App with Permalink Loading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000',
        origin: 'http://localhost:3000',
        pathname: '/',
        search: '',
        hash: '',
      },
      writable: true,
    })
  })

  it('should render normally without URL parameters', () => {
    render(<App />)
    
    expect(screen.getByTestId('company-tabs')).toBeInTheDocument()
    expect(screen.getByTestId('input-form')).toBeInTheDocument()
  })

  it('should load scenario from URL parameters on mount', async () => {
    // Mock URL with scenario parameters
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000?pmv=15&rs=4&ip=3&op=1&in=Acme%20VC&pr=20&pf=65',
        origin: 'http://localhost:3000',
        pathname: '/',
        search: '?pmv=15&rs=4&ip=3&op=1&in=Acme%20VC&pr=20&pf=65',
        hash: '',
      },
      writable: true,
    })

    render(<App />)

    await waitFor(() => {
      // Check that the input form received the loaded data
      const postMoneyInput = screen.getByTestId('post-money-input')
      expect(postMoneyInput.value).toBe('15')
    })
  })

  it('should handle invalid URL parameters gracefully', async () => {
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000?invalid=data&pmv=abc',
        origin: 'http://localhost:3000',
        pathname: '/',
        search: '?invalid=data&pmv=abc',
        hash: '',
      },
      writable: true,
    })

    // Clear localStorage to ensure clean state
    window.localStorage.clear()

    render(<App />)

    // Should fall back to default values (13 is the default in App.jsx)
    const postMoneyInput = screen.getByTestId('post-money-input')
    expect(postMoneyInput.value).toBe('13') // Default value
  })

  it('should handle partial URL parameters with defaults', async () => {
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000?pmv=20&rs=5&ip=4&op=1&in=Test%20VC',
        origin: 'http://localhost:3000',
        pathname: '/',
        search: '?pmv=20&rs=5&ip=4&op=1&in=Test%20VC',
        hash: '',
      },
      writable: true,
    })

    render(<App />)

    await waitFor(() => {
      const postMoneyInput = screen.getByTestId('post-money-input')
      expect(postMoneyInput.value).toBe('20')
    })
  })

  it('should clear URL parameters after loading scenario', async () => {
    const mockReplaceState = vi.fn()
    Object.defineProperty(window.history, 'replaceState', {
      value: mockReplaceState,
      writable: true,
    })

    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000?pmv=15&rs=4&ip=3&op=1&in=Test&pr=20&pf=65',
        origin: 'http://localhost:3000',
        pathname: '/',
        search: '?pmv=15&rs=4&ip=3&op=1&in=Test&pr=20&pf=65',
        hash: '',
      },
      writable: true,
    })

    render(<App />)

    await waitFor(() => {
      expect(mockReplaceState).toHaveBeenCalledWith(
        null, 
        '', 
        'http://localhost:3000/'
      )
    })
  })

  it('should not modify URL when no parameters are present', () => {
    const mockReplaceState = vi.fn()
    Object.defineProperty(window.history, 'replaceState', {
      value: mockReplaceState,
      writable: true,
    })

    render(<App />)

    expect(mockReplaceState).not.toHaveBeenCalled()
  })
})