const AppFooter = ({ showExitMath, onToggleExitMath }) => {
  return (
    <footer className="app-footer">
      <button
        type="button"
        className="exit-math-toggle"
        onClick={() => onToggleExitMath(!showExitMath)}
        aria-pressed={showExitMath}
      >
        {showExitMath ? '▼' : '▶'} Exit Math
      </button>
    </footer>
  )
}

export default AppFooter
