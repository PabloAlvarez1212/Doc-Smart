"use client";

import {
  motion,
  useReducedMotion,
} from "motion/react";

import styles from "./BymaxAssistant.module.css";

export default function AnimatedMoodOption({
  value,
  label,
  emoji,
  language = "es",
  selected,
  disabled,
  onSelect,
}) {
  const reduceMotion = useReducedMotion();

  const scoreText =
    language === "en"
      ? `${value} out of 10`
      : `${value} de 10`;

  return (
    <motion.button
      type="button"
      title={`${scoreText}: ${label}`}
      aria-label={`${scoreText}: ${label}`}
      aria-pressed={selected}
      disabled={disabled}
      className={
        selected
          ? styles.moodOptionSelected
          : styles.moodOption
      }
      initial={
        reduceMotion
          ? false
          : {
              opacity: 0,
              y: 12,
              scale: 0.78,
            }
      }
      animate={{
        opacity: 1,
        y: 0,
        scale: selected ? 1.1 : 1,
      }}
      transition={{
        delay: reduceMotion ? 0 : value * 0.035,
        type: "spring",
        stiffness: 340,
        damping: 19,
      }}
      whileHover={
        reduceMotion
          ? undefined
          : {
              scale: 1.12,
              y: -4,
            }
      }
      whileTap={
        reduceMotion
          ? undefined
          : {
              scale: 0.92,
            }
      }
      onClick={() => onSelect(value)}
    >
      <motion.span
        className={styles.moodEmoji}
        aria-hidden="true"
        animate={
          reduceMotion
            ? undefined
            : selected
              ? {
                  rotate: [-5, 5, -5, 0],
                  scale: [1, 1.15, 1],
                }
              : {
                  y: [0, -2, 0],
                }
        }
        transition={{
          duration: selected ? 0.5 : 2.4,
          repeat: selected ? 0 : Infinity,
          delay: value * 0.08,
        }}
      >
        {emoji}
      </motion.span>

      <span className={styles.moodOptionNumber}>
        {value}
      </span>

      <span className={styles.moodOptionLabel}>
        {label}
      </span>

      {selected && (
        <motion.span
          className={styles.moodSelectedMark}
          aria-hidden="true"
          initial={
            reduceMotion
              ? false
              : {
                  opacity: 0,
                  scale: 0,
                }
          }
          animate={{
            opacity: 1,
            scale: 1,
          }}
        >
          ✓
        </motion.span>
      )}
    </motion.button>
  );
}