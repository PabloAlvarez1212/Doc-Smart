import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import ResetPasswordValidate from "../../../src/app/validations/resetPasswordValidate.js";

const formSource = readFileSync(new URL("./resetPasswordForm.js", import.meta.url), "utf8");
const hookSource = readFileSync(new URL("./useResetPasswordForm.js", import.meta.url), "utf8");
const formStyles = readFileSync(new URL("./resetPasswordForm.module.css", import.meta.url), "utf8");
const inputSource = readFileSync(new URL("../../ui/Input/Input.js", import.meta.url), "utf8");
const pageSource = readFileSync(
    new URL("../../../src/app/(auth)/reset-password/page.js", import.meta.url),
    "utf8",
);
const pageStyles = readFileSync(
    new URL("../../../src/app/(auth)/reset-password/resetPassword.module.css", import.meta.url),
    "utf8",
);

test("la validación cliente refleja las reglas reales del backend", () => {
    const cases = [
        ["Corta1!", "mínimo 8 caracteres"],
        ["Segura1<", "No se permiten"],
        ["Segura123", "carácter especial"],
        ["segura123!", "mayúscula"],
        ["SEGURA123!", "minúscula"],
        ["SeguraClave!", "número"],
    ];

    for (const [password, expectedMessage] of cases) {
        const errors = ResetPasswordValidate({
            nueva_contraseña: password,
            confirmarContraseña: password,
        });
        assert.match(errors.nueva_contraseña, new RegExp(expectedMessage));
    }
});

test("el formulario expone requisitos reales, errores accesibles y visibilidad independiente", () => {
    assert.match(formSource, /passwordRequirements/);
    assert.match(formSource, /aria-invalid=/);
    assert.match(formSource, /aria-describedby=/);
    assert.match(formSource, /autoComplete="new-password"/);
    assert.match(formSource, /VerificationStatus/);
    assert.ok((formSource.match(/type="password"/g) || []).length >= 2);
    assert.match(inputSource, /type=['"]button['"]/);
    assert.match(inputSource, /Mostrar contrase/);
    assert.match(inputSource, /Ocultar contrase/);
});

test("el flujo preserva el token, evita dobles envíos y presenta estados dentro de la página", () => {
    assert.match(hookSource, /searchParams\.get\(["']token["']\)/);
    assert.match(hookSource, /token:/);
    assert.match(hookSource, /if \(loading\) return/);
    assert.match(hookSource, /kind:\s*["']success["']/);
    assert.match(hookSource, /tokenError/);
    assert.doesNotMatch(hookSource, /sweetalert2|Swal\.fire|console\.log/);
});

test("la página utiliza una composición propia, responsive y estable en el viewport", () => {
    assert.match(pageSource, /DocSmart/);
    assert.match(pageSource, /ResetPasswordForm/);
    assert.match(pageStyles, /min-height:\s*100dvh/);
    assert.match(pageStyles, /grid-template-columns:/);
    assert.match(pageStyles, /@media\s*\(max-width:\s*900px\)/);
    assert.match(pageStyles, /@media\s*\(max-height:/);
    assert.doesNotMatch(pageStyles, /height:\s*100vh/);
    assert.doesNotMatch(pageStyles, /\.page\s*\{[^}]*overflow:\s*hidden/s);
});

test("los estilos mantienen targets táctiles y movimiento reducido", () => {
    assert.match(formStyles, /min-height:\s*44px/);
    assert.match(formStyles, /prefers-reduced-motion:\s*reduce/);
    assert.doesNotMatch(formStyles, /transition:\s*all/);
});
