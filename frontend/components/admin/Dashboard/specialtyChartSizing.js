export function getSpecialtyChartMinWidth(axisWidth) {
    const normalizedAxisWidth = Number.isFinite(axisWidth)
        ? Math.max(0, axisWidth)
        : 0;

    return Math.max(340, normalizedAxisWidth + 220);
}
