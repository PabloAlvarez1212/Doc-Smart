const MAX_NAME_CHARS = 16;

export function wrapPatientName(value) {
    const lines = [];
    let currentLine = "";

    for (let word of String(value ?? "").trim().split(/\s+/)) {
        while (word.length > MAX_NAME_CHARS) {
            if (currentLine) {
                lines.push(currentLine);
                currentLine = "";
            }
            lines.push(word.slice(0, MAX_NAME_CHARS));
            word = word.slice(MAX_NAME_CHARS);
        }
        if (!word) continue;
        if (currentLine && `${currentLine} ${word}`.length > MAX_NAME_CHARS) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = currentLine ? `${currentLine} ${word}` : word;
        }
    }

    if (currentLine) lines.push(currentLine);
    return lines.length ? lines : [""];
}

export function PatientNameTick({ x, y, payload }) {
    const lines = wrapPatientName(payload.value);

    return (
        <text x={x} y={y} textAnchor="end" fill="#526078" fontSize="12">
            <title>{payload.value}</title>
            {lines.map((line, index) => (
                <tspan key={index} x={x} dy={index === 0 ? 4 - (lines.length - 1) * 7 : 14}>
                    {line}
                </tspan>
            ))}
        </text>
    );
}

export function getPatientsChartLayout(data) {
    const wrappedNames = data.map((item) => wrapPatientName(item.paciente));
    const longestLine = Math.max(1, ...wrappedNames.flat().map((line) => line.length));
    const maxLines = Math.max(1, ...wrappedNames.map((lines) => lines.length));
    const axisWidth = Math.min(132, Math.max(76, longestLine * 7 + 16));
    const rowHeight = Math.max(54, maxLines * 15 + 18);
    const chartHeight = Math.max(160, data.length * rowHeight + 72);
    const maxTotal = Math.max(1, ...data.map((item) => {
        const value = Number(item.total_citas);
        return Number.isFinite(value) ? value : 0;
    }));
    const tickStep = Math.max(1, Math.ceil(maxTotal / 4));
    const axisMax = Math.ceil(maxTotal / tickStep) * tickStep;
    const ticks = Array.from({ length: axisMax / tickStep + 1 }, (_, index) => index * tickStep);

    return { axisWidth, chartHeight, axisMax, ticks };
}
