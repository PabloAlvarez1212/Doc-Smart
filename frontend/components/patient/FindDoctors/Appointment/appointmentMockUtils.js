import { MOCK_REFERENCE_DATE, WEEK_DAYS } from "../mockDoctors";

export const MOCK_MIN_DATE = MOCK_REFERENCE_DATE;

const parseDate = (date) => new Date(`${date}T12:00:00`);

const toIsoDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
};

export const MOCK_MAX_DATE = toIsoDate(addDays(parseDate(MOCK_MIN_DATE), 60));

export const getWeekDayName = (date) => {
    if (!date) return null;
    const jsDay = parseDate(date).getDay();
    return WEEK_DAYS[(jsDay + 6) % 7].nombre;
};

export const getAvailabilityForDate = (doctor, date) => {
    const dayName = getWeekDayName(date);
    return doctor.disponibilidades.find((item) => item.dia === dayName) ?? null;
};

export const generateMockSlots = (doctor, date) => {
    if (!doctor || !date) return [];
    const availability = getAvailabilityForDate(doctor, date);
    if (!availability) return [];

    const occupied = new Set(doctor.horariosOcupados ?? []);

    return availability.bloques.flatMap((block) => {
        const slots = [];
        const end = timeToMinutes(block.horaFin);

        for (let current = timeToMinutes(block.horaInicio); current + 30 <= end; current += 30) {
            const time = minutesToTime(current);
            slots.push({
                hora: time,
                ocupado: occupied.has(`${date}T${time}`),
            });
        }

        return slots;
    });
};

export const findNextAvailableDate = (doctor, date) => {
    if (!doctor || !date || doctor.disponibilidades.length === 0) return null;
    const baseDate = parseDate(date);

    for (let offset = 1; offset <= 7; offset += 1) {
        const candidate = addDays(baseDate, offset);
        const candidateIso = toIsoDate(candidate);
        if (candidateIso > MOCK_MAX_DATE) return null;
        if (getAvailabilityForDate(doctor, candidateIso)) return candidateIso;
    }

    return null;
};

export const formatAppointmentDate = (date) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(parseDate(date));
};
