import styles from "./Help.module.css";

const preguntas = [
    {
        pregunta: "¿Cómo creo una cuenta?",
        respuesta:
            "Selecciona Registrarse en la pantalla de inicio. Si utilizas un celular o una tablet y no ves esa opción, abre el menú de navegación. Completa tus datos y sigue las instrucciones para verificar tu documento y tu correo electrónico. Desde el celular puedes tomar una foto del documento si el navegador ofrece esa opción; desde un computador puedes cargar una imagen guardada. Ingresa el código recibido por correo para continuar. Si no lo encuentras, revisa la carpeta de spam.",
    },
    {
        pregunta: "¿Cómo agendo una cita?",
        respuesta:
            "Inicia sesión como paciente y entra en Encontrar doctores. En computador encontrarás esta opción en la navegación; en celular o tablet puede estar dentro del menú. Busca al profesional, revisa su información y selecciona un horario disponible. Escribe el motivo de consulta y envía la solicitud. Luego entra en Mis citas para comprobar su estado: enviar la solicitud no significa que ya esté confirmada por el médico.",
    },
    {
        pregunta: "¿Dónde consulto o gestiono mis citas?",
        respuesta:
            "Abre Mis citas desde la navegación principal o desde el menú de tu celular o tablet. Allí puedes revisar la fecha, hora, profesional y estado de cada cita. Utiliza los filtros para encontrar una solicitud específica y abre sus detalles para ver las acciones disponibles. Las opciones de cancelar o reprogramar dependen del estado de la cita y de las reglas de la plataforma.",
    },
    {
        pregunta: "¿Cómo agrego o actualizo mi información de salud?",
        respuesta:
            "Entra en Mi perfil y busca Información de salud. Selecciona Agregar para abrir el formulario y elige el tipo de información: alergia, medicamento, enfermedad u otro antecedente. Completa los datos solicitados y guarda. En celular, desplázate dentro del formulario si los campos no caben en la pantalla. También puedes editar o eliminar registros existentes. Esta información ayuda al médico a conocer tus antecedentes, por lo que debe ser clara y estar actualizada.",
    },
    {
        pregunta: "¿Cómo utilizo Bymax?",
        respuesta:
            "Inicia sesión y abre el asistente Bymax desde la opción disponible en la plataforma. Puedes escribir lo que necesitas, como buscar un médico o gestionar una cita. Si utilizas la función de voz en celular, tablet o computador, permite el acceso al micrófono cuando el navegador lo solicite. Si no funciona, revisa los permisos del sitio y que tu dispositivo tenga un micrófono disponible; también puedes continuar escribiendo. La orientación de Bymax no reemplaza una valoración médica.",
    },
    {
        pregunta: "¿Cómo cambio entre modo claro y oscuro?",
        respuesta:
            "Abre Configuración mediante el icono de engranaje, cuando esté disponible en tu sesión. Selecciona Claro, Oscuro o Sistema. La opción Sistema sigue la preferencia de apariencia de tu celular, tablet o computador. El selector se encuentra únicamente en Configuración y el cambio se aplica a la aplicación.",
    },
    {
        pregunta: "¿Qué hago si no puedo iniciar sesión?",
        respuesta:
            "Comprueba que escribiste correctamente tu correo y contraseña. En celular o tablet, revisa que el teclado no haya agregado espacios o cambiado caracteres. Si olvidaste la contraseña, utiliza la opción de recuperación del inicio de sesión y sigue las instrucciones enviadas a tu correo. Si el problema continúa, contacta al equipo de ayuda e indica el dispositivo, navegador y mensaje de error. No envíes tu contraseña ni códigos de verificación.",
    },
    {
        pregunta: "¿Qué hago si una página no carga o no guarda mis datos?",
        respuesta:
            "Comprueba tu conexión a internet. En celular o tablet, prueba cambiar entre Wi-Fi y datos móviles; en computador, revisa que otras páginas carguen correctamente. Antes de recargar, copia cualquier texto que no hayas guardado para evitar perderlo. Si el fallo continúa, anota el mensaje que aparece y contacta al equipo de ayuda indicando qué acción realizabas, el dispositivo y el navegador utilizado.",
    },
    {
        pregunta: "¿Cómo contacto al equipo de ayuda?",
        respuesta:
            "Escríbenos a pamikle00@gmail.com. Indica si utilizas un celular, tablet o computador, el navegador y una descripción del problema. Puedes adjuntar una captura ocultando datos personales y médicos. Desde cualquier dispositivo, el enlace de correo intentará abrir tu aplicación de correo configurada; si no se abre, copia la dirección y envía el mensaje desde tu servicio de correo habitual.",
    },
];

export default function Help() {
    return (
        <section
            id="ayuda"
            className={styles.section}
            aria-labelledby="help-title"
        >
            <header className={styles.heading}>
                <span>Estamos para orientarte</span>
                <h2 id="help-title">Ayuda y preguntas frecuentes</h2>
                <p>
                    Encuentra respuestas para comenzar a utilizar DocSmart
                    y gestionar tu información.
                </p>
            </header>

            <div className={styles.support}>
                <h3>Contacta al equipo de ayuda</h3>

                <p>
                    ¿Necesitas ayuda con DocSmart? Escríbenos indicando
                    qué estabas intentando hacer y el problema que encontraste.
                </p>

                <a href="mailto:pamikle00@gmail.com">
                    pamikle00@gmail.com
                </a>

                <small>
                    No incluyas contraseñas, códigos de verificación
                    ni información médica sensible.
                </small>
            </div>

            <div className={styles.questions}>
                {preguntas.map(({ pregunta, respuesta }) => (
                    <details key={pregunta} className={styles.question}>
                        <summary>{pregunta}</summary>
                        <p>{respuesta}</p>
                    </details>
                ))}
            </div>
        </section>
    );
}