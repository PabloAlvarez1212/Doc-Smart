export function hasAppointmentsByWeekday(data) {
    return Array.isArray(data)
        && data.some((item) => Number(item?.total_citas) > 0);
}
