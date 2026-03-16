/**
 * Retarde l'exécution de fn jusqu'à ce que ms millisecondes se soient écoulées
 * sans nouvel appel. Chaque nouvel appel réinitialise le délai.
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return function (this: unknown, ...args: Parameters<T>) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            timeoutId = null;
            fn.apply(this, args);
        }, ms);
    };
}
