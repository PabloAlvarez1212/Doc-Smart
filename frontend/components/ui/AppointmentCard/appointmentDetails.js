export function getAppointmentCode(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    return value;
}

export function getAppointmentReason(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    return value;
}

export async function copyAppointmentCode(value, clipboard) {
    const code = getAppointmentCode(value);
    const target = clipboard ?? globalThis.navigator?.clipboard;

    if (!code || typeof target?.writeText !== "function") return false;

    try {
        await target.writeText(code);
        return true;
    } catch {
        return false;
    }
}
