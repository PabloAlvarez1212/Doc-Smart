"use client";

import { useMemo, useState } from "react";
import { MOCK_REFERENCE_DATE, WEEK_DAYS, mockDoctors } from "./mockDoctors";

const INITIAL_FILTERS = {
    search: "",
    specialty: "all",
    department: "all",
    city: "all",
    availability: "all",
    ordering: "availability",
};

const normalizeText = (value) => String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();

const referenceDate = new Date(`${MOCK_REFERENCE_DATE}T12:00:00`);
const referenceDayIndex = (referenceDate.getDay() + 6) % 7;

const getNextAvailability = (doctor) => {
    for (let offset = 0; offset < WEEK_DAYS.length; offset += 1) {
        const day = WEEK_DAYS[(referenceDayIndex + offset) % WEEK_DAYS.length];
        const availability = doctor.disponibilidades.find(
            (item) => item.dia === day.nombre && item.bloques.length > 0
        );

        if (availability) {
            return { ...availability, diasHasta: offset };
        }
    }

    return null;
};

const compareAvailability = (first, second) => {
    if (!first.proximaDisponibilidad && !second.proximaDisponibilidad) return 0;
    if (!first.proximaDisponibilidad) return 1;
    if (!second.proximaDisponibilidad) return -1;
    return first.proximaDisponibilidad.diasHasta - second.proximaDisponibilidad.diasHasta;
};

export default function useMockDoctors() {
    const [filters, setFilters] = useState(INITIAL_FILTERS);
    const [selectedDoctorId, setSelectedDoctorId] = useState(null);
    const [appointmentDoctorId, setAppointmentDoctorId] = useState(null);

    const doctorsWithAvailability = useMemo(
        () => mockDoctors.map((doctor) => {
            const proximaDisponibilidad = getNextAvailability(doctor);

            return {
                ...doctor,
                proximaDisponibilidad,
                disponibleHoy: proximaDisponibilidad?.diasHasta === 0,
            };
        }),
        []
    );

    const specialties = useMemo(
        () => [...new Set(mockDoctors.map((doctor) => doctor.especialidad))].sort(),
        []
    );
    const departments = useMemo(
        () => [...new Set(mockDoctors.map((doctor) => doctor.departamento))].sort(),
        []
    );
    const cities = useMemo(() => {
        const availableCities = filters.department === "all"
            ? mockDoctors.map((doctor) => doctor.ciudad)
            : mockDoctors
                .filter((doctor) => doctor.departamento === filters.department)
                .map((doctor) => doctor.ciudad);

        return [...new Set(availableCities)].sort();
    }, [filters.department]);

    const doctors = useMemo(() => {
        const search = normalizeText(filters.search);

        return doctorsWithAvailability
            .filter((doctor) => {
                const matchesSearch = !search || normalizeText(doctor.nombre).includes(search);
                const matchesSpecialty = filters.specialty === "all"
                    || doctor.especialidad === filters.specialty;
                const matchesDepartment = filters.department === "all"
                    || doctor.departamento === filters.department;
                const matchesCity = filters.city === "all"
                    || doctor.ciudad === filters.city;
                const matchesAvailability = filters.availability === "all"
                    || (filters.availability === "today" && doctor.disponibleHoy)
                    || (
                        filters.availability === "week"
                        && doctor.proximaDisponibilidad
                        && doctor.proximaDisponibilidad.diasHasta <= 6
                    )
                    || (
                        filters.availability === "scheduled"
                        && doctor.disponibilidades.length > 0
                    );

                return matchesSearch
                    && matchesSpecialty
                    && matchesDepartment
                    && matchesCity
                    && matchesAvailability;
            })
            .sort((first, second) => {
                if (filters.ordering === "name") {
                    return first.nombre.localeCompare(second.nombre, "es");
                }
                if (filters.ordering === "specialty") {
                    return first.especialidad.localeCompare(second.especialidad, "es");
                }
                return compareAvailability(first, second);
            });
    }, [doctorsWithAvailability, filters]);

    const changeFilter = (field, value) => {
        setFilters((current) => ({
            ...current,
            [field]: value,
            ...(field === "department" ? { city: "all" } : {}),
        }));
    };

    const resetFilters = () => setFilters(INITIAL_FILTERS);

    const selectedDoctor = doctorsWithAvailability.find(
        (doctor) => doctor.id === selectedDoctorId
    ) ?? null;
    const appointmentDoctor = doctorsWithAvailability.find(
        (doctor) => doctor.id === appointmentDoctorId
    ) ?? null;

    const openAvailability = (doctorId) => {
        setAppointmentDoctorId(null);
        setSelectedDoctorId(doctorId);
    };
    const closeAvailability = () => setSelectedDoctorId(null);
    const openAppointment = (doctorId) => {
        setSelectedDoctorId(null);
        setAppointmentDoctorId(doctorId);
    };
    const closeAppointment = () => setAppointmentDoctorId(null);

    const hasFilters = filters.search.trim() !== ""
        || filters.specialty !== "all"
        || filters.department !== "all"
        || filters.city !== "all"
        || filters.availability !== "all"
        || filters.ordering !== "availability";

    return {
        doctors,
        filters,
        specialties,
        departments,
        cities,
        selectedDoctor,
        appointmentDoctor,
        hasFilters,
        changeFilter,
        resetFilters,
        openAvailability,
        closeAvailability,
        openAppointment,
        closeAppointment,
    };
}
