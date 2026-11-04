import Swal from "sweetalert2";

const TEXTOS = {
    doctor: {
        texto: "Indica el motivo por el cual deseas cancelar la consulta.",
        placeholder: "Escribe el motivo de la cancelación.",
        volver: "Volver",
    },
    patient: {
        texto: "Indica el motivo por el cual deseas cancelar tu cita médica.",
        placeholder: "Escribe el motivo de su cancelación",
        volver: "volver",
    },
};

// Abre el modal de cancelación de siempre y responde cuando ya terminó de cerrarse,
// para que la animación de la tarjeta se vea completa. Devuelve el motivo o null.
export default async function pedirMotivo(rol) {
    const textos = TEXTOS[rol] || TEXTOS.patient;
    let avisarCierre;
    const cerrado = new Promise((resolver) => {
        avisarCierre = resolver;
    });

    const resultado = await Swal.fire({
        title: "¿Cancelar cita?",
        text: textos.texto,
        icon: "warning",
        input: "textarea",
        inputPlaceholder: textos.placeholder,
        inputAttributes: {
            maxlength: "500",
            "aria-label": "Motivo de cancelación",
        },
        showCancelButton: true,
        confirmButtonText: "Confirmar Cancelación",
        cancelButtonText: textos.volver,
        didClose: () => avisarCierre(),
        inputValidator: (value) => {
            const motivo = value?.trim();
            if (!motivo) return "Debes indicar el motivo de cancelación.";
            if (motivo.length > 500) return "El motivo no puede superar los 500 caracteres.";
        },
    });

    await cerrado;
    return resultado.isConfirmed ? resultado.value.trim() : null;
}
