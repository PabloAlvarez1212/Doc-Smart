"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Copy, Plus, Search } from "lucide-react";
import Reveal from "../Reveal";
import home from "../home.module.css";
import styles from "./Help.module.css";

const preguntas = [
    {
        tema: "Cuenta",
        pregunta: "¿Cómo creo una cuenta?",
        respuesta:
            "Selecciona Registrarse en la pantalla de inicio. Si utilizas un celular o una tablet y no ves esa opción, abre el menú de navegación. Completa tus datos y sigue las instrucciones para verificar tu documento y tu correo electrónico. Desde el celular puedes tomar una foto del documento si el navegador ofrece esa opción; desde un computador puedes cargar una imagen guardada. Ingresa el código recibido por correo para continuar. Si no lo encuentras, revisa la carpeta de spam.",
    },
    {
        tema: "Citas",
        pregunta: "¿Cómo agendo una cita?",
        respuesta:
            "Inicia sesión como paciente y entra en Encontrar doctores. En computador encontrarás esta opción en la navegación; en celular o tablet puede estar dentro del menú. Busca al profesional, revisa su información y selecciona un horario disponible. Escribe el motivo de consulta y envía la solicitud. Luego entra en Mis citas para comprobar su estado: enviar la solicitud no significa que ya esté confirmada por el médico.",
    },
    {
        tema: "Citas",
        pregunta: "¿Dónde consulto o gestiono mis citas?",
        respuesta:
            "Abre Mis citas desde la navegación principal o desde el menú de tu celular o tablet. Allí puedes revisar la fecha, hora, profesional y estado de cada cita. Utiliza los filtros para encontrar una solicitud específica y abre sus detalles para ver las acciones disponibles. Las opciones de cancelar o reprogramar dependen del estado de la cita y de las reglas de la plataforma.",
    },
    {
        tema: "Cuenta",
        pregunta: "¿Cómo agrego o actualizo mi información de salud?",
        respuesta:
            "Entra en Mi perfil y busca Información de salud. Selecciona Agregar para abrir el formulario y elige el tipo de información: alergia, medicamento, enfermedad u otro antecedente. Completa los datos solicitados y guarda. En celular, desplázate dentro del formulario si los campos no caben en la pantalla. También puedes editar o eliminar registros existentes. Esta información ayuda al médico a conocer tus antecedentes, por lo que debe ser clara y estar actualizada.",
    },
    {
        tema: "Bymax",
        pregunta: "¿Cómo utilizo Bymax?",
        respuesta:
            "Inicia sesión y abre el asistente Bymax desde la opción disponible en la plataforma. Puedes escribir lo que necesitas, como buscar un médico o gestionar una cita. Si utilizas la función de voz en celular, tablet o computador, permite el acceso al micrófono cuando el navegador lo solicite. Si no funciona, revisa los permisos del sitio y que tu dispositivo tenga un micrófono disponible; también puedes continuar escribiendo. La orientación de Bymax no reemplaza una valoración médica.",
    },
    {
        tema: "Cuenta",
        pregunta: "¿Cómo cambio entre modo claro y oscuro?",
        respuesta:
            "Abre Configuración mediante el icono de engranaje, cuando esté disponible en tu sesión. Selecciona Claro, Oscuro o Sistema. La opción Sistema sigue la preferencia de apariencia de tu celular, tablet o computador. El selector se encuentra únicamente en Configuración y el cambio se aplica a la aplicación.",
    },
    {
        tema: "Problemas",
        pregunta: "¿Qué hago si no puedo iniciar sesión?",
        respuesta:
            "Comprueba que escribiste correctamente tu correo y contraseña. En celular o tablet, revisa que el teclado no haya agregado espacios o cambiado caracteres. Si olvidaste la contraseña, utiliza la opción de recuperación del inicio de sesión y sigue las instrucciones enviadas a tu correo. Si el problema continúa, contacta al equipo de ayuda e indica el dispositivo, navegador y mensaje de error. No envíes tu contraseña ni códigos de verificación.",
    },
    {
        tema: "Problemas",
        pregunta: "¿Qué hago si una página no carga o no guarda mis datos?",
        respuesta:
            "Comprueba tu conexión a internet. En celular o tablet, prueba cambiar entre Wi-Fi y datos móviles; en computador, revisa que otras páginas carguen correctamente. Antes de recargar, copia cualquier texto que no hayas guardado para evitar perderlo. Si el fallo continúa, anota el mensaje que aparece y contacta al equipo de ayuda indicando qué acción realizabas, el dispositivo y el navegador utilizado.",
    },
    {
        tema: "Problemas",
        pregunta: "¿Cómo contacto al equipo de ayuda?",
        respuesta:
            "Escríbenos a pamikle00@gmail.com. Indica si utilizas un celular, tablet o computador, el navegador y una descripción del problema. Puedes adjuntar una captura ocultando datos personales y médicos. Desde cualquier dispositivo, el enlace de correo intentará abrir tu aplicación de correo configurada; si no se abre, copia la dirección y envía el mensaje desde tu servicio de correo habitual.",
    },
];

const temas = ["Todas", "Cuenta", "Citas", "Bymax", "Problemas"];
const correo = "pamikle00@gmail.com";

const normalizar = (texto) =>
    texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export default function Help() {
    const [busqueda, setBusqueda] = useState("");
    const [tema, setTema] = useState("Todas");
    const [abierta, setAbierta] = useState(preguntas[0].pregunta);
    const [copiado, setCopiado] = useState(false);

    const texto = normalizar(busqueda.trim());
    const visibles = preguntas.filter(
        (item) =>
            (tema === "Todas" || item.tema === tema) &&
            (!texto || normalizar(`${item.pregunta} ${item.respuesta}`).includes(texto))
    );

    const copiar = async () => {
        try {
            await navigator.clipboard.writeText(correo);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1600);
        } catch {
            window.getSelection()?.selectAllChildren(document.getElementById("correo-ayuda"));
        }
    };

    return (
        <section
            id="ayuda"
            className={home.section}
            aria-labelledby="help-title"
        >
            <div className={styles.help}>
                <Reveal as="aside" className={styles.side}>
                    <h2 id="help-title" className={home.h2}>Ayuda y preguntas frecuentes</h2>
                    <p className={home.lead}>
                        Encuentra respuestas para comenzar a utilizar DocSmart
                        y gestionar tu información.
                    </p>

                    <div className={styles.contact}>
                        <h3>Contacta al equipo de ayuda</h3>
                        <p>
                            Escríbenos indicando qué estabas intentando hacer y
                            el problema que encontraste.
                        </p>

                        <div className={styles.mail}>
                            <a id="correo-ayuda" href={`mailto:${correo}`}>{correo}</a>
                            <button type="button" onClick={copiar} aria-live="polite">
                                {copiado ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                                {copiado ? "Copiado" : "Copiar"}
                            </button>
                        </div>

                        <small>
                            No incluyas contraseñas, códigos de verificación
                            ni información médica sensible.
                        </small>
                    </div>

                    <div className={styles.ask}>
                        <Image src="/images/logoCara.png" width={34} height={34} alt="" />
                        <div>
                            <b>¿Prefieres preguntarle a Bymax?</b>
                            <small>Disponible al iniciar sesión.</small>
                        </div>
                    </div>
                </Reveal>

                <Reveal delay={.08}>
                    <label className={styles.search}>
                        <Search size={18} aria-hidden="true" />
                        <input
                            type="search"
                            value={busqueda}
                            onChange={(event) => setBusqueda(event.target.value)}
                            placeholder="Busca: cita, contraseña, Bymax…"
                            aria-label="Buscar en las preguntas"
                        />
                    </label>

                    <div className={styles.chips} role="group" aria-label="Filtrar por tema">
                        {temas.map((item) => (
                            <button
                                key={item}
                                type="button"
                                className={item === tema ? styles.chipOn : styles.chip}
                                aria-pressed={item === tema}
                                onClick={() => setTema(item)}
                            >
                                {item}
                            </button>
                        ))}
                    </div>

                    <div className={styles.questions}>
                        {visibles.map(({ pregunta, respuesta }, index) => {
                            const open = abierta === pregunta;
                            const id = `respuesta-${index}`;

                            return (
                                <div key={pregunta} className={`${styles.question} ${open ? styles.open : ""}`}>
                                    <button
                                        type="button"
                                        aria-expanded={open}
                                        aria-controls={id}
                                        onClick={() => setAbierta(open ? null : pregunta)}
                                    >
                                        {pregunta}
                                        <span className={styles.plus}><Plus size={16} aria-hidden="true" /></span>
                                    </button>
                                    <div id={id} className={styles.answer} inert={!open}>
                                        <div><p>{respuesta}</p></div>
                                    </div>
                                </div>
                            );
                        })}

                        {!visibles.length && (
                            <p className={styles.empty}>
                                No encontramos preguntas con esa búsqueda. Escríbenos al correo de soporte.
                            </p>
                        )}
                    </div>
                </Reveal>
            </div>
        </section>
    );
}