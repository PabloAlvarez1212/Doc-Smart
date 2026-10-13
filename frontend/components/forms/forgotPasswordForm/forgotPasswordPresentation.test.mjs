import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const formSource = readFileSync(
    new URL("./forgotPasswordForm.js", import.meta.url),
    "utf8",
);
const hookSource = readFileSync(
    new URL("./useForgotPasswordForm.js", import.meta.url),
    "utf8",
);
const pageStyles = readFileSync(
    new URL("../../../src/app/(auth)/forgot-password/forgotPassword.module.css", import.meta.url),
    "utf8",
);
const pageSource = readFileSync(
    new URL("../../../src/app/(auth)/forgot-password/page.js", import.meta.url),
    "utf8",
);

test("el formulario anuncia validación, carga y resultado sin depender de SweetAlert", () => {
    assert.match(formSource, /aria-busy=\{loading\}/);
    assert.match(formSource, /aria-invalid=\{Boolean\(errors\.correo\)\}/);
    assert.match(formSource, /aria-describedby=/);
    assert.match(formSource, /submittedEmail/);
    assert.match(formSource, /role="status"/);
    assert.doesNotMatch(hookSource, /sweetalert2|Swal\.fire/);
});

test("la recuperación evita envíos duplicados y conserva los mensajes reales de la API", () => {
    assert.match(hookSource, /if \(loading\) return/);
    assert.match(hookSource, /setErrors/);
    assert.match(hookSource, /setFeedback/);
    assert.match(hookSource, /error\.response\?\.data\?\.mensaje/);
});

test("la página distribuye sus tres zonas dentro del viewport y colapsa antes de comprimir el contenido", () => {
    assert.match(pageStyles, /min-height:\s*100dvh/);
    assert.match(pageStyles, /grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)\s+auto/);
    assert.match(pageStyles, /max-height:\s*clamp\(/);
    assert.match(pageStyles, /@media\s*\(max-width:\s*900px\)/);
    assert.match(pageStyles, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    assert.doesNotMatch(pageStyles, /height:\s*100vh/);
});

test("las pantallas de escritorio bajas reducen la composición sin ocultar el desbordamiento de la página", () => {
    assert.match(pageStyles, /@media\s*\(max-height:\s*760px\)\s*and\s*\(min-width:\s*901px\)/);
    assert.doesNotMatch(pageStyles, /\.page\s*\{[^}]*overflow:\s*hidden/s);
});

test("el cálculo móvil descuenta la altura real del encabezado y no crea scroll residual", () => {
    assert.doesNotMatch(pageStyles, /min-height:\s*calc\(100dvh\s*-\s*66px\)/);
});

test("el título principal es el primer encabezado y la ilustración móvil no se precarga", () => {
    assert.equal(pageSource.indexOf("<h2"), -1);
    assert.ok(pageSource.indexOf("<h1") >= 0);
    assert.doesNotMatch(
        pageSource,
        /src="\/images\/logo-seguridad\.png"[\s\S]*?priority/,
    );
});
