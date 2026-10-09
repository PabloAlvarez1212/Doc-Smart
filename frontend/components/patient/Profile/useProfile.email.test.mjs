import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Module, createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { transformSync } = require("next/dist/build/swc");

function load(filename, overrides) {
    const compiled = new Module(filename);
    compiled.paths = Module._nodeModulePaths(path.dirname(filename));
    compiled.require = name => Object.hasOwn(overrides, name) ? overrides[name] : require(name);
    const source = transformSync(fs.readFileSync(filename, "utf8"), {
        filename, jsc: { parser: { syntax: "ecmascript" }, transform: { react: { runtime: "automatic" } } }, module: { type: "commonjs" },
    }).code;
    compiled._compile(source, filename);
    return compiled.exports;
}
const initial = { id: 8, correo: "actual@docsmart.test", telefono: "3001234567", peso: 68, estatura: 1.7 };
function mount(services = {}) {
    const cells = [], effects = [], cleanups = [];
    let cursor = 0, output;
    const hook = load(path.resolve("components/patient/Profile/useProfile.js"), {
        react: {
            useState(value) {
                const key = cursor++;
                cells[key] ??= { value: typeof value === "function" ? value() : value };
                return [cells[key].value, update => { cells[key].value = typeof update === "function" ? update(cells[key].value) : update; }];
            },
            useRef(value) { const key = cursor++; cells[key] ??= { current: value }; return cells[key]; },
            useEffect(effect, deps) {
                const key = cursor++;
                if (!cells[key] || deps.some((v, i) => v !== cells[key].deps[i])) {
                    cells[key] = { deps }; effects.push(effect);
                }
            },
        },
        "sweetalert2": { fire: async () => ({ isConfirmed: true }) },
        "@/app/utils/errrorUtils": { obtenerPrimerError: value => typeof value === "string" ? value : Array.isArray(value) ? value[0] : value ? Object.values(value).flat()[0] : null },
        "@/app/services/patientServices": {
            obtenerPerfilPacienteService: async () => ({ data: { ...initial } }),
            solicitarCambioCorreoService: async () => ({ ok: true, data: { cambio_id: "a-test-uuid" } }),
            confirmarCambioCorreoService: async () => ({ ok: true, data: { correo: "nuevo@docsmart.test" } }),
            ...services,
        },
    }).default;
    function render() { cursor = 0; output = hook(); return output; }
    render(); effects.splice(0).forEach(effect => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); });
    return { render, unmount: () => cleanups.forEach(fn => fn()) };
}
async function ready(services) { const env = mount(services); await Promise.resolve(); env.render().abrirCambioCorreo(); env.render().editarCambioCorreo("correo", "  NUEVO@DocSmart.test  "); env.render(); return env; }
const backendError = (message, status = 400) => ({ response: { status, data: { ok: false, errores: { codigo: [message] } } } });

test("services use exactly the backend email endpoints and payloads", async () => {
    const requests = [];
    const service = load(path.resolve("src/app/services/patientServices.js"), {
        "./api": { post: async (url, data) => { requests.push({ url, data }); return { data: { ok: true } }; } },
    });
    await service.solicitarCambioCorreoService("nuevo@docsmart.test");
    await service.confirmarCambioCorreoService("uuid", "012345");
    assert.deepEqual(requests, [
        { url: "/perfil/correo/solicitar-cambio/", data: { correo: "nuevo@docsmart.test" } },
        { url: "/perfil/correo/confirmar-cambio/", data: { cambio_id: "uuid", codigo: "012345" } },
    ]);
});
test("email is unchanged until the backend confirms; UUID and leading zero OTP are preserved", async () => {
    const sent = [];
    const e = await ready({ confirmarCambioCorreoService: async (...args) => { sent.push(args); return { ok: true, data: { correo: "nuevo@docsmart.test" } }; } });
    await e.render().enviarCambioCorreo();
    assert.equal(e.render().cambioCorreo.paso, "verificacion");
    assert.equal(e.render().perfil.correo, initial.correo);
    e.render().editarCambioCorreo("codigo", "012345");
    await e.render().enviarCambioCorreo();
    assert.deepEqual(sent, [["a-test-uuid", "012345"]]);
    assert.deepEqual(e.render().perfil, { ...initial, correo: "nuevo@docsmart.test" });
    assert.equal(e.render().cambioCorreo.paso, "confirmado");
    assert.equal(e.render().cambioCorreo.codigo, "");
    assert.equal(e.render().cambioCorreo.cambioId, null);
});
test("duplicate clicks and reopening during pending requests cannot issue another request", async () => {
    let resolve, calls = 0;
    const e = await ready({ solicitarCambioCorreoService: () => { calls++; return new Promise(done => { resolve = done; }); } });
    const first = e.render().enviarCambioCorreo();
    await e.render().enviarCambioCorreo();
    e.render().cerrarCambioCorreo(); e.render().abrirCambioCorreo();
    assert.equal(calls, 1); assert.equal(e.render().cambioCorreo.abierto, false);
    resolve({ ok: true, data: { cambio_id: "old" } }); await first;
    assert.equal(e.render().cambioCorreo.cambioId, null);
    assert.equal(e.render().cambioCorreo.correo, "");
    assert.equal(e.render().ocupadoCorreo, false);
});
test("closing while confirmation finishes updates profile but never revives the modal", async () => {
    let resolve;
    const e = await ready({ confirmarCambioCorreoService: () => new Promise(done => { resolve = done; }) });
    await e.render().enviarCambioCorreo(); e.render().editarCambioCorreo("codigo", "123456");
    const confirming = e.render().enviarCambioCorreo(); e.render().cerrarCambioCorreo();
    resolve({ ok: true, data: { correo: "nuevo@docsmart.test" } }); await confirming;
    assert.equal(e.render().perfil.correo, "nuevo@docsmart.test");
    assert.equal(e.render().cambioCorreo.abierto, false); assert.equal(e.render().cambioCorreo.codigo, "");
});
test("incorrect OTP remains retryable; expiry, unavailability and max attempts block verification", async () => {
    for (const [message, blocked] of [["Código incorrecto", false], ["El código ha expirado", true], ["Esta solicitud ya no está disponible", true], ["Se alcanzó el máximo de intentos", true]]) {
        let calls = 0;
        const e = await ready({ confirmarCambioCorreoService: async () => { calls++; throw backendError(message); } });
        await e.render().enviarCambioCorreo(); e.render().editarCambioCorreo("codigo", "123456");
        await e.render().enviarCambioCorreo();
        assert.equal(e.render().cambioCorreo.error, message); assert.equal(e.render().cambioCorreo.bloqueado, blocked);
        assert.equal(e.render().perfil.correo, initial.correo);
        if (blocked) { await e.render().enviarCambioCorreo(); assert.equal(calls, 1); }
        e.render().reiniciarCambioCorreo(); assert.equal(e.render().cambioCorreo.paso, "correo"); assert.equal(e.render().cambioCorreo.cambioId, null);
    }
});
test("request errors and malformed responses never unlock the OTP step", async () => {
    for (const result of [async () => { throw backendError("El correo ya se encuentra registrado"); }, async () => ({ ok: true, data: {} })]) {
        const e = await ready({ solicitarCambioCorreoService: result });
        await e.render().enviarCambioCorreo(); assert.equal(e.render().cambioCorreo.paso, "correo"); assert.ok(e.render().cambioCorreo.error);
    }
});
test("invalid input, closed modals and completed flows cannot send requests", async () => {
    let calls = 0;
    const e = await ready({ solicitarCambioCorreoService: async () => { calls++; return { ok: true, data: { cambio_id: "uuid" } }; } });
    e.render().editarCambioCorreo("correo", "sin-formato"); await e.render().enviarCambioCorreo(); assert.equal(calls, 0);
    e.render().cerrarCambioCorreo(); await e.render().enviarCambioCorreo(); assert.equal(calls, 0);
});
