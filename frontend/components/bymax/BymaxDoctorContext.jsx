"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CalendarDays,
  RefreshCw,
  Stethoscope,
  X,
} from "lucide-react";
import { bymaxService } from "@/app/services/bymaxServices";
import styles from "./BymaxAssistant.module.css";

const FILTROS = [
  ["hoy", "Hoy"],
  ["siguiente", "Quién sigue"],
  ["proximas", "Próximas"],
  ["pendientes", "Pendientes"],
  ["atrasadas", "Atrasadas"],
];

export default function BymaxDoctorContext({
  open,
  close,
  chatId,
  disabled = false,
}) {
  const [contexto, setContexto] = useState(null);
  const [alcance, setAlcance] = useState("proximas");
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState("");
  const closeRef = useRef(null);

  const cargar = useCallback(async (filtro = "proximas") => {
    if (!chatId) return;

    setCargando(true);
    setAviso("");

    try {
      setContexto(
        await bymaxService.obtenerContextoMedico(
          chatId,
          filtro,
        ),
      );
    } catch (error) {
      setAviso(error.message);
    } finally {
      setCargando(false);
    }
  }, [chatId]);

  const actuar = async (accion, datos = {}) => {
    if (!chatId || cargando || disabled) return;

    setCargando(true);
    setAviso("");

    try {
      const respuesta =
        await bymaxService.accionContextoMedico(
          chatId,
          accion,
          { alcance, ...datos },
        );

      setContexto(respuesta);
      setAviso(respuesta?.mensaje || "Acción completada.");
    } catch (error) {
      setAviso(error.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!open || !chatId) return;

    setAlcance("proximas");
    cargar("proximas");
    requestAnimationFrame(() => closeRef.current?.focus());
  }, [open, chatId, cargar]);

  useEffect(() => {
    if (!open) return;

    const cerrarEscape = (event) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("keydown", cerrarEscape);
    return () => window.removeEventListener("keydown", cerrarEscape);
  }, [open, close]);

  const pacientes = useMemo(() => {
    const mapa = new Map();

    contexto?.citas?.forEach(({ paciente }) => {
      if (paciente?.id) mapa.set(paciente.id, paciente);
    });

    const activo = contexto?.paciente_activo;
    if (activo?.id) mapa.set(activo.id, activo);

    return [...mapa.values()];
  }, [contexto]);

  if (!open) return null;

  const activo = contexto?.paciente_activo;
  const citas = contexto?.citas || [];
  const bloqueado = disabled || cargando || !chatId;

  const filtrar = (valor) => {
    setAlcance(valor);
    cargar(valor);
  };

  return (
    <div
      className={styles.clinicalBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        className={styles.clinicalModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bymax-clinical-title"
      >
        <header className={styles.clinicalModalHeader}>
          <div>
            <span>
              <Stethoscope size={18} />
              COPILOTO MÉDICO
            </span>
            <h2 id="bymax-clinical-title">
              Contexto clínico y agenda
            </h2>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Cerrar copiloto"
          >
            <X size={21} />
          </button>
        </header>

        <div className={styles.clinicalModalBody}>
          <div className={styles.clinicalToolbar}>
            <label>
              Paciente activo

              <select
                value={activo?.id || ""}
                disabled={bloqueado}
                onChange={(event) => {
                  const pacienteId = Number(event.target.value);

                  if (pacienteId) {
                    actuar("seleccionar_paciente", {
                      paciente_id: pacienteId,
                    });
                  }
                }}
              >
                <option value="">
                  Selecciona un paciente autorizado
                </option>

                {pacientes.map((paciente) => (
                  <option key={paciente.id} value={paciente.id}>
                    {paciente.nombre} · #{paciente.id}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              disabled={bloqueado || !activo}
              onClick={() => actuar("cerrar_contexto")}
            >
              Cerrar contexto
            </button>

            <button
              type="button"
              disabled={bloqueado}
              onClick={() => cargar(alcance)}
              aria-label="Actualizar"
            >
              <RefreshCw size={17} />
            </button>
          </div>

          <p className={styles.clinicalStatus} role="status">
            {aviso ||
              (cargando
                ? "Actualizando información…"
                : activo
                  ? `Caso activo: ${activo.nombre}.`
                  : "Sin paciente activo.")}
          </p>

          <nav
            className={styles.clinicalFilters}
            aria-label="Filtros de agenda"
          >
            {FILTROS.map(([valor, etiqueta]) => (
              <button
                key={valor}
                type="button"
                disabled={bloqueado}
                aria-pressed={alcance === valor}
                className={
                  alcance === valor
                    ? styles.clinicalFilterActive
                    : ""
                }
                onClick={() => filtrar(valor)}
              >
                {etiqueta}
              </button>
            ))}
          </nav>

          <div className={styles.clinicalAgenda}>
            <h3>
              <CalendarDays size={18} />
              Citas ({citas.length})
            </h3>

            <ul>
              {citas.map((cita) => (
                <li key={cita.id_cita}>
                  <div>
                    <strong>{cita.paciente.nombre}</strong>
                    <span>
                      {new Date(
                        cita.fecha_programada,
                      ).toLocaleString("es-CO")}
                      {" · "}
                      {cita.estado}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={bloqueado}
                    onClick={() =>
                      actuar("seleccionar_paciente", {
                        paciente_id: cita.paciente.id,
                      })
                    }
                  >
                    Usar caso
                  </button>
                </li>
              ))}
            </ul>

            {!cargando && !citas.length && (
              <p>No hay citas para este filtro.</p>
            )}
          </div>
        </div>

        <footer className={styles.clinicalModalFooter}>
          Este panel no escribe en el chat. Toda decisión
          clínica permanece bajo valoración profesional.
        </footer>
      </section>
    </div>
  );
}