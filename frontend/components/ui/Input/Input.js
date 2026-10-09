'use client';
import { useEffect, useState } from "react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import { Eye, EyeOff } from "lucide-react";
import styles from './Input.module.css';

export default function Input({ type = 'text', placeholder, className = '', id, name, value, onChange, readOnly, min,max,step,sizeEye,autoComplete, validationAttempt, ...rest }) {
    const [showPassword, setShowPassword] = useState(false);
    const animation = useAnimation();
    const reduced = useReducedMotion();
    const invalid = Boolean(rest['aria-invalid']);
    useEffect(() => {
        if (invalid && validationAttempt && !reduced) animation.start({x:[0,-3,3,0],transition:{duration:.18}});
    }, [validationAttempt, invalid, reduced, animation]);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
    return (
        <motion.div className={styles.container} initial={false} animate={animation}>
            <input
                {...rest}
                aria-label={rest["aria-label"] || placeholder || name}
                type={inputType}
                placeholder={placeholder}
                className={`${styles.input} ${className}`}
                id={id}
                name={name}
                value={value}
                onChange={onChange}
                readOnly={readOnly}
                min={min}
                max={max}
                step={step}
                autoComplete={autoComplete}
            />
            {isPassword && (
                <button aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword} className={styles.eyeButton} type='button' onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <Eye size={sizeEye}/> : <EyeOff size={sizeEye}/>}
                </button>
            )}
        </motion.div>
    );
}
