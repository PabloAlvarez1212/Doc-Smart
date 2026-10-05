const ease = [0.23, 1, 0.32, 1];

export function getPageReveal(reducedMotion) {
    if (reducedMotion) {
        return {
            initial: false,
            animate: {
                opacity: 1,
                filter: "blur(0px)",
                transform: "translateY(0px)",
            },
            transition: { duration: 0 },
        };
    }

    return {
        initial: {
            opacity: 0,
            filter: "blur(4px)",
            transform: "translateY(8px)",
        },
        animate: {
            opacity: 1,
            filter: "blur(0px)",
            transform: "translateY(0px)",
        },
        transition: { duration: 0.24, ease },
    };
}

export function getContentTransition(reducedMotion) {
    if (reducedMotion) {
        return {
            initial: false,
            animate: { opacity: 1, transform: "translateY(0px)" },
            exit: { opacity: 1, transform: "translateY(0px)" },
            transition: { duration: 0 },
        };
    }

    return {
        initial: { opacity: 0, transform: "translateY(6px)" },
        animate: { opacity: 1, transform: "translateY(0px)" },
        exit: { opacity: 0, transform: "translateY(-4px)" },
        transition: { duration: 0.2, ease },
    };
}
