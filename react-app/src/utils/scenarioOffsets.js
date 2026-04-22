export function roundScenarioOffset(value) {
  return Math.round(Number(value) * 100) / 100
}

export function formatScenarioOffsetValue(value) {
  const rounded = roundScenarioOffset(value)
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`
}

export function buildScenarioOffsets(maxOffset) {
  const max = roundScenarioOffset(Math.abs(Number(maxOffset) || 0))
  if (!(max > 0)) return []

  const quarter = roundScenarioOffset(max / 4)
  const half = roundScenarioOffset(max / 2)

  return [-max, -half, -quarter, quarter, half, max]
}

export function normalizeScenarioOffsets(offsets, defaultMax = 30) {
  const numericOffsets = Array.isArray(offsets)
    ? offsets.map(Number).filter(Number.isFinite).map(Math.abs)
    : []

  const max = numericOffsets.length > 0 ? Math.max(...numericOffsets) : defaultMax
  return buildScenarioOffsets(max > 0 ? max : defaultMax)
}
