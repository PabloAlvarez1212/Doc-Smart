"use client";
import AnimatedMoodOption from "./AnimatedMoodOption";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "./BymaxAssistant.module.css";


const MOOD_OPTIONS = [
  {
    value: 1,
    emoji: "😭",
    labels: {
      es: "Muy mal",
      en: "Very bad",
    },
  },
  {
    value: 2,
    emoji: "😢",
    labels: {
      es: "Mal",
      en: "Bad",
    },
  },
  {
    value: 3,
    emoji: "😟",
    labels: {
      es: "Preocupado",
      en: "Worried",
    },
  },
  {
    value: 4,
    emoji: "🙁",
    labels: {
      es: "Desanimado",
      en: "Feeling low",
    },
  },
  {
    value: 5,
    emoji: "😐",
    labels: {
      es: "Neutral",
      en: "Neutral",
    },
  },
  {
    value: 6,
    emoji: "😌",
    labels: {
      es: "Tranquilo",
      en: "Calm",
    },
  },
  {
    value: 7,
    emoji: "🙂",
    labels: {
      es: "Bien",
      en: "Good",
    },
  },
  {
    value: 8,
    emoji: "😊",
    labels: {
      es: "Muy bien",
      en: "Very good",
    },
  },
  {
    value: 9,
    emoji: "😄",
    labels: {
      es: "Excelente",
      en: "Excellent",
    },
  },
  {
    value: 10,
    emoji: "🤩",
    labels: {
      es: "Fantástico",
      en: "Fantastic",
    },
  },
];

const NUMEROS_ESCRITOS = {
  uno: 1,
  un: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
};


function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}


function extraerPuntuacion(texto) {
  const normalizado = normalizarTexto(texto);

  const numero = normalizado.match(
    /\b(10|[1-9])\b/,
  );

  if (numero) {
    return Number(numero[1]);
  }

  for (
    const [palabra, valor]
    of Object.entries(NUMEROS_ESCRITOS)
  ) {
    if (
      new RegExp(
        `\\b${palabra}\\b`,
      ).test(normalizado)
    ) {
      return valor;
    }
  }

  return null;
}


function crearPregunta(identity) {
  const nombre = identity?.nombre?.trim();

  const saludo = nombre
    ? `Hola, ${nombre}.`
    : "Hola.";

  if (identity?.rol === "medico") {
    return (
      `${saludo} Bienvenido a DocSmart. ` +
      "Antes de comenzar, en una escala del uno " +
      "al diez, ¿cuál es tu estado de ánimo hoy?"
    );
  }

  return (
    `${saludo} Bienvenido a DocSmart. ` +
    "Antes de comenzar, en una escala del uno " +
    "al diez, ¿cuál es tu estado de ánimo hoy?"
  );
}


export default function BymaxMood({
  daily,
  identity,
  speakText,
}) {
  const reducirMovimiento = useReducedMotion();

  const [seleccionado, setSeleccionado] =
    useState(null);

  const [escuchando, setEscuchando] =
    useState(false);

  const [errorVoz, setErrorVoz] =
    useState("");

  const inicioAutomaticoRef = useRef(false);
  const recognitionRef = useRef(null);

  const rawLanguage =
    identity?.idioma ||
    identity?.language ||
    identity?.locale ||
    "es";

  const language = String(rawLanguage)
    .toLowerCase()
    .startsWith("en")
      ? "en"
      : "es";

  const guardarEstado = useCallback(
    async (puntuacion) => {
      if (
        !Number.isInteger(puntuacion) ||
        puntuacion < 1 ||
        puntuacion > 10 ||
        daily.saving
      ) {
        return;
      }

      setSeleccionado(puntuacion);
      setEscuchando(false);
      setErrorVoz("");

      recognitionRef.current?.abort();

      try {
        await daily.save(puntuacion);

        if (typeof speakText === "function") {
          await speakText(
            `Gracias. Registré tu estado de ánimo ` +
            `como ${puntuacion} de diez.`,
          );
        }
      } catch (error) {
        setErrorVoz(
          error?.message ||
          "No fue posible guardar tu estado de ánimo.",
        );

        setSeleccionado(null);
      }
    },
    [
      daily,
      identity,
      speakText,
    ],
  );


  const iniciarEscucha = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorVoz(
        "Selecciona uno de los emojis para responder.",
      );

      return;
    }

    recognitionRef.current?.abort();

    const recognition =
      new SpeechRecognition();

    recognition.lang = "es-CO";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setEscuchando(true);
      setErrorVoz("");
    };

    recognition.onresult = (event) => {
      const alternativas = Array.from(
        event.results?.[0] || [],
      );

      let puntuacion = null;

      for (const alternativa of alternativas) {
        puntuacion = extraerPuntuacion(
          alternativa.transcript,
        );

        if (puntuacion !== null) {
          break;
        }
      }

      if (puntuacion !== null) {
        guardarEstado(puntuacion);

        return;
      }

      setErrorVoz(
        "No pude identificar el número. " +
        "Puedes seleccionar un emoji.",
      );
    };

    recognition.onerror = (event) => {
      setEscuchando(false);

      if (event.error === "not-allowed") {
        setErrorVoz(
          "Selecciona un emoji o permite el micrófono.",
        );

        return;
      }

      if (
        event.error !== "no-speech" &&
        event.error !== "aborted"
      ) {
        setErrorVoz(
          "No pude escuchar la respuesta.",
        );
      }
    };

    recognition.onend = () => {
      setEscuchando(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setErrorVoz(
        "Selecciona una opción para continuar.",
      );
    }
  }, [guardarEstado]);


  useEffect(() => {
    if (
      !daily?.mood?.preguntar ||
      daily.loading ||
      inicioAutomaticoRef.current
    ) {
      return;
    }

    inicioAutomaticoRef.current = true;

    const comenzar = async () => {
      try {
        if (typeof speakText === "function") {
          await speakText(
            crearPregunta(identity),
          );
        }

        iniciarEscucha();
      } catch {
        setErrorVoz(
          "Selecciona uno de los emojis para responder.",
        );
      }
    };

    comenzar();

    return () => {
      recognitionRef.current?.abort();
    };
  }, [
    daily?.mood?.preguntar,
    daily.loading,
    identity,
    speakText,
    iniciarEscucha,
  ]);


  return (
    <AnimatePresence>
      {daily?.mood?.preguntar && (
        <motion.aside
          className={styles.moodFloatingCard}
          aria-label="Estado de ánimo diario"
          aria-live="polite"
          initial={
            reducirMovimiento
              ? {
                  opacity: 1,
                }
              : {
                  opacity: 0,
                  scale: 0.75,
                  x: 35,
                  y: 15,
                }
          }
          animate={{
            opacity: 1,
            scale: 1,
            x: 0,
            y: 0,
          }}
          exit={{
            opacity: 0,
            scale: 0.8,
            x: 25,
          }}
          transition={{
            type: "spring",
            stiffness: 280,
            damping: 22,
          }}
        >
          <div className={styles.moodFloatingArrow} />

          <header className={styles.moodHeader}>
            <div>
              <strong>
                ¿Cómo te sientes hoy?
              </strong>

              <p>
                Selecciona una opción del 1 al 10
              </p>
            </div>

            {escuchando && (
              <motion.span
                className={styles.moodMicrophone}
                aria-label="Bymax está escuchando"
                animate={
                  reducirMovimiento
                    ? undefined
                    : {
                        scale: [
                          1,
                          1.22,
                          1,
                        ],
                      }
                }
                transition={{
                  duration: 1,
                  repeat: Infinity,
                }}
              >
                🎙️
              </motion.span>
            )}
          </header>

          <div className={styles.moodOptions}>
            {MOOD_OPTIONS.map((option) => (
              <AnimatedMoodOption
                key={option.value}
                value={option.value}
                emoji={option.emoji}
                label={option.labels[language]}
                language={language}
                selected={seleccionado === option.value}
                disabled={daily.saving}
                onSelect={guardarEstado}
              />
            ))}
          </div>

          <footer className={styles.moodFooter}>
            {daily.saving ? (
              <span>
                {language === "en"
                  ? "Saving response..."
                  : "Guardando respuesta..."}
              </span>
            ) : escuchando ? (
              <span>
                {language === "en"
                  ? "Bymax is listening..."
                  : "Bymax está escuchando..."}
              </span>
            ) : (
              <button
                type="button"
                onClick={iniciarEscucha}
              >
                🎙️{" "}
                {language === "en"
                  ? "Answer by voice"
                  : "Responder por voz"}
              </button>
            )}
          </footer>

          {(errorVoz || daily.error) && (
            <p
              className={styles.moodError}
              role="alert"
            >
              {errorVoz || daily.error}
            </p>
          )}

          {(errorVoz || daily.error) && (
            <p
              className={styles.moodError}
              role="alert"
            >
              {errorVoz || daily.error}
            </p>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}