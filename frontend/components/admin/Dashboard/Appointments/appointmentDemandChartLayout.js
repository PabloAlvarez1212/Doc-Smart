export function getIntegerAxis(data, valueKey) {
    const maxValue = Math.max(1, ...data.map((item) => {
        const value = Number(item[valueKey]);
        return Number.isFinite(value) ? value : 0;
    }));
    const tickStep = Math.max(1, Math.ceil(maxValue / 4));
    const axisMax = Math.ceil(maxValue / tickStep) * tickStep;
    const ticks = Array.from({ length: axisMax / tickStep + 1 }, (_, index) => index * tickStep);

    return { axisMax, ticks };
}
