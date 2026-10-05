import assert from "node:assert/strict";
import test from "node:test";

import { getContentTransition, getPageReveal } from "./patientHomeMotion.js";

test("la entrada de la página usa un único gesto breve sin stagger", () => {
    const reveal = getPageReveal(false);

    assert.deepEqual(reveal.initial, {
        opacity: 0,
        filter: "blur(4px)",
        transform: "translateY(8px)",
    });
    assert.deepEqual(reveal.animate, {
        opacity: 1,
        filter: "blur(0px)",
        transform: "translateY(0px)",
    });
    assert.equal(reveal.transition.duration, 0.24);
    assert.equal("delay" in reveal.transition, false);
});

test("el movimiento reducido elimina desplazamientos y duración", () => {
    assert.deepEqual(getPageReveal(true), {
        initial: false,
        animate: {
            opacity: 1,
            filter: "blur(0px)",
            transform: "translateY(0px)",
        },
        transition: { duration: 0 },
    });

    assert.deepEqual(getContentTransition(true), {
        initial: false,
        animate: { opacity: 1, transform: "translateY(0px)" },
        exit: { opacity: 1, transform: "translateY(0px)" },
        transition: { duration: 0 },
    });
});

test("el intercambio de contenido evita escalas y desplazamientos amplios", () => {
    const transition = getContentTransition(false);

    assert.deepEqual(transition.initial, { opacity: 0, transform: "translateY(6px)" });
    assert.deepEqual(transition.animate, { opacity: 1, transform: "translateY(0px)" });
    assert.deepEqual(transition.exit, { opacity: 0, transform: "translateY(-4px)" });
    assert.equal(transition.transition.duration, 0.2);
});
