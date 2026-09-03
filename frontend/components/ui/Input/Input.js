'use client';
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from './Input.module.css';

export default function Input({ type = 'text', placeholder, className = '', id, name, value, onChange, readOnly, min,max,step,sizeEye }) {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
    return (
        <div className={styles.container}>
            <input
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
            />
            {isPassword && (
                <button aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword} className={styles.eyeButton} type='button' onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <Eye size={sizeEye}/> : <EyeOff size={sizeEye}/>}
                </button>
            )}
        </div>
    );
}
