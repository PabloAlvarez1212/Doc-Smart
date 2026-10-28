export function getDoctorCalificacionPresentation(cita) {
    const estado = String(cita?.estado || "").trim().toLowerCase();
    const puntuacion = Number(cita?.calificacion?.puntuacion);

    if (estado !== "completada" || !Number.isFinite(puntuacion) || puntuacion < 1 || puntuacion > 5) {
        return null;
    }

    return {
        label: "Ver valoración",
        scoreLabel: `${puntuacion}/5`,
    };
}
