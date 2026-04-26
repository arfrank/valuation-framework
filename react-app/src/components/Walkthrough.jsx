import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'

const SPOTLIGHT_PADDING = 8
const TOOLTIP_MARGIN = 16
const TOOLTIP_WIDTH = 360

// Geometry helper: where to render the tooltip relative to the target rect.
function computeTooltipPosition(rect, placement, viewport) {
  if (!rect || placement === 'center') {
    return {
      left: Math.max(16, viewport.width / 2 - TOOLTIP_WIDTH / 2),
      top: Math.max(16, viewport.height / 2 - 120),
      arrow: null
    }
  }

  const space = {
    top: rect.top,
    bottom: viewport.height - rect.bottom,
    left: rect.left,
    right: viewport.width - rect.right
  }

  let resolved = placement
  if (placement === 'auto') {
    resolved = space.bottom > 220 ? 'bottom'
      : space.top > 220 ? 'top'
      : space.right > TOOLTIP_WIDTH + 40 ? 'right'
      : 'left'
  }

  let left, top, arrow
  switch (resolved) {
    case 'top':
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2
      top = rect.top - TOOLTIP_MARGIN - 8
      arrow = 'bottom'
      // Tooltip's bottom edge sits at this `top`; push up so it doesn't overflow above
      top = Math.max(16, top - 200)
      break
    case 'bottom':
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2
      top = rect.bottom + TOOLTIP_MARGIN
      arrow = 'top'
      break
    case 'left':
      left = rect.left - TOOLTIP_WIDTH - TOOLTIP_MARGIN
      top = rect.top + rect.height / 2 - 100
      arrow = 'right'
      break
    case 'right':
    default:
      left = rect.right + TOOLTIP_MARGIN
      top = rect.top + rect.height / 2 - 100
      arrow = 'left'
      break
  }

  // Clamp inside viewport
  left = Math.min(Math.max(16, left), viewport.width - TOOLTIP_WIDTH - 16)
  top = Math.min(Math.max(16, top), viewport.height - 240)

  return { left, top, arrow }
}

function Walkthrough({ open, steps, onClose, onComplete }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState(null)
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight })
  const enteredStepRef = useRef(-1)
  const measureTimeoutRef = useRef(null)

  const currentStep = steps[stepIndex]
  const total = steps.length

  // Reset when reopened
  useEffect(() => {
    if (open) {
      setStepIndex(0)
      enteredStepRef.current = -1
    }
  }, [open])

  // Track viewport size
  useEffect(() => {
    if (!open) return
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open])

  // Measure target — repeatable so resize/scroll/auto-open all refresh geometry
  const measureTarget = useCallback(() => {
    if (!open || !currentStep) return
    if (!currentStep.target) {
      setTargetRect(null)
      return
    }
    const el = document.querySelector(currentStep.target)
    if (!el) {
      setTargetRect(null)
      return
    }
    // Scroll target into view if it's fully off-screen
    const rect = el.getBoundingClientRect()
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      right: rect.right
    })
  }, [open, currentStep])

  // Run onEnter side effects (e.g. open Advanced / Exit Math) once per step, then measure
  useLayoutEffect(() => {
    if (!open || !currentStep) return
    if (enteredStepRef.current === stepIndex) {
      measureTarget()
      return
    }
    enteredStepRef.current = stepIndex
    if (typeof currentStep.onEnter === 'function') {
      currentStep.onEnter()
    }

    if (currentStep.waitForTarget) {
      // Retry measurement a few times so the just-toggled panel has time to render
      const attempts = [0, 60, 160, 320]
      attempts.forEach((delay) => {
        const id = setTimeout(measureTarget, delay)
        measureTimeoutRef.current = id
      })
    } else {
      measureTarget()
    }
  }, [open, stepIndex, currentStep, measureTarget])

  // Re-measure on resize / scroll
  useEffect(() => {
    if (!open) return
    const onScroll = () => measureTarget()
    const onResize = () => measureTarget()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, measureTarget])

  // ESC closes
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose && onClose()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stepIndex])

  const goNext = () => {
    if (stepIndex >= total - 1) {
      onComplete && onComplete()
    } else {
      setStepIndex((i) => Math.min(total - 1, i + 1))
    }
  }
  const goPrev = () => setStepIndex((i) => Math.max(0, i - 1))
  const handleSkip = () => onClose && onClose()

  if (!open || !currentStep) return null

  const placement = currentStep.placement || 'auto'
  // If no rect (target missing or center step), use centered fallback
  const useCenter = !targetRect || placement === 'center'
  const tooltip = computeTooltipPosition(useCenter ? null : targetRect, placement, viewport)

  // Spotlight: dim everything except the target rect.
  // Implementation: four absolutely-positioned dark rectangles around the cutout.
  let spotlight = null
  if (!useCenter && targetRect) {
    const padded = {
      top: Math.max(0, targetRect.top - SPOTLIGHT_PADDING),
      left: Math.max(0, targetRect.left - SPOTLIGHT_PADDING),
      width: targetRect.width + SPOTLIGHT_PADDING * 2,
      height: targetRect.height + SPOTLIGHT_PADDING * 2
    }
    const right = padded.left + padded.width
    const bottom = padded.top + padded.height
    spotlight = (
      <>
        <div className="walkthrough-mask" style={{ top: 0, left: 0, width: '100vw', height: padded.top }} />
        <div className="walkthrough-mask" style={{ top: bottom, left: 0, width: '100vw', height: `calc(100vh - ${bottom}px)` }} />
        <div className="walkthrough-mask" style={{ top: padded.top, left: 0, width: padded.left, height: padded.height }} />
        <div className="walkthrough-mask" style={{ top: padded.top, left: right, width: `calc(100vw - ${right}px)`, height: padded.height }} />
        <div
          className="walkthrough-spotlight-ring"
          style={{
            top: padded.top,
            left: padded.left,
            width: padded.width,
            height: padded.height
          }}
        />
      </>
    )
  } else {
    // Centered card — full-screen dim
    spotlight = <div className="walkthrough-mask walkthrough-mask-full" />
  }

  const isFirst = stepIndex === 0
  const isLast = stepIndex === total - 1

  return (
    <div className="walkthrough" role="dialog" aria-modal="true" aria-label={currentStep.title}>
      {spotlight}
      <div
        className={`walkthrough-tooltip walkthrough-tooltip--${tooltip.arrow || 'center'}`}
        style={{ left: tooltip.left, top: tooltip.top, width: TOOLTIP_WIDTH }}
      >
        <div className="walkthrough-step-counter">Step {stepIndex + 1} of {total}</div>
        <h4 className="walkthrough-title">{currentStep.title}</h4>
        <p className="walkthrough-body">{currentStep.body}</p>
        <div className="walkthrough-actions">
          <button type="button" className="walkthrough-btn walkthrough-btn-skip" onClick={handleSkip}>
            Skip
          </button>
          <div className="walkthrough-nav">
            {!isFirst && (
              <button type="button" className="walkthrough-btn walkthrough-btn-secondary" onClick={goPrev}>
                Back
              </button>
            )}
            <button type="button" className="walkthrough-btn walkthrough-btn-primary" onClick={goNext}>
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Walkthrough
