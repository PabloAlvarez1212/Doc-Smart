"use client";

import FindDoctorsHero from "../../../../components/patient/FindDoctors/Hero/FindDoctorsHero";
import DoctorsFilters from "../../../../components/patient/FindDoctors/Filters/DoctorsFilters";
import DoctorsList from "../../../../components/patient/FindDoctors/List/DoctorsList";
import AvailabilitySchedule from "../../../../components/patient/FindDoctors/Availability/AvailabilitySchedule";
import ScheduleAppointmentModal from "../../../../components/patient/FindDoctors/Appointment/ScheduleAppointmentModal";
import useMockDoctors from "../../../../components/patient/FindDoctors/useMockDoctors";
import Modal from "../../../../components/ui/Modal/Modal";
import styles from "./findDoctors.module.css";

export default function FindDoctorsPage() {
    const {
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
    } = useMockDoctors();

    return (
        <div className={styles.page}>
            <FindDoctorsHero total={doctors.length} />
            <DoctorsFilters
                filters={filters}
                specialties={specialties}
                departments={departments}
                cities={cities}
                hasFilters={hasFilters}
                onChange={changeFilter}
                onReset={resetFilters}
            />
            <DoctorsList
                doctors={doctors}
                hasFilters={hasFilters}
                onViewAvailability={openAvailability}
                onScheduleAppointment={openAppointment}
                onReset={resetFilters}
            />
            <Modal
                abierto={Boolean(selectedDoctor)}
                onCerrar={closeAvailability}
                titulo={selectedDoctor ? `Disponibilidad de ${selectedDoctor.nombre}` : "Disponibilidad semanal"}
            >
                {selectedDoctor && <AvailabilitySchedule doctor={selectedDoctor} />}
            </Modal>
            <ScheduleAppointmentModal
                doctor={appointmentDoctor}
                onClose={closeAppointment}
            />
        </div>
    );
}
