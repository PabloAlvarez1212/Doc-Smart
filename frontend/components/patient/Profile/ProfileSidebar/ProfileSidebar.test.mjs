import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(
    new URL("./ProfileSidebar.js", import.meta.url),
    "utf8"
);
const stylesheet = readFileSync(
    new URL("./ProfileSidebar.module.css", import.meta.url),
    "utf8"
);

test("la eliminacion de la foto vive sobre el avatar y reutiliza el callback existente", () => {
    assert.doesNotMatch(component, /styles\.photoActions/);
    assert.match(component, /className=\{styles\.removePhotoButton\}/);
    assert.match(component, /onClick=\{eliminarFotoPerfil\}/);
    assert.match(component, /aria-label="Eliminar foto de perfil"/);
});

test("la accion de eliminar solo se renderiza cuando existe una foto personalizada", () => {
    assert.match(
        component,
        /perfil\?\.foto_perfil\s*&&\s*\([\s\S]*?removePhotoButton/
    );
});

test("el avatar conserva contraste independiente para overlay e icono", () => {
    assert.match(stylesheet, /\.avatarOverlay\s*\{[^}]*opacity:\s*0/s);
    assert.match(stylesheet, /\.removePhotoButton\s*\{[^}]*opacity:\s*0/s);
    assert.match(stylesheet, /\.avatarSurface:hover\s+\.avatarOverlay/s);
    assert.match(stylesheet, /\.avatarSurface:focus-within\s+\.removePhotoButton/s);
    assert.match(stylesheet, /@media\s*\(hover:\s*none\)[\s\S]*?\.removePhotoButton\s*\{[^}]*opacity:\s*1/s);
});
