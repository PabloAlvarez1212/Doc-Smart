export async function completeReviewAfterSuccess(operation, closeReview) {
    const completed = await operation();

    if (!completed) return false;

    closeReview();
    return true;
}

export function createSingleFlight() {
    let running = false;

    return {
        async run(operation) {
            if (running) return false;

            running = true;

            try {
                return await operation();
            } finally {
                running = false;
            }
        },
    };
}
