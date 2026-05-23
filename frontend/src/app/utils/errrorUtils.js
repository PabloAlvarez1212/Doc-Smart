export const obtenerPrimerError = (obj) => {

    if (!obj) return null;

    if (typeof obj === 'string') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obtenerPrimerError(obj[0]);
    }

    if (typeof obj === 'object') {

        const primerValor = Object.values(obj)[0];

        return obtenerPrimerError(primerValor);
    }

    return null;
}