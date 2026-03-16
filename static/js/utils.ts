// Fonctions utilitaires pour le deck et le DOM
export function getDeckGridRows(gridSelector: string, cols: number): HTMLElement[][] {
    const grid = document.querySelector(gridSelector) as HTMLElement | null;
    if (!grid) return [];
    const children = Array.from(grid.children) as HTMLElement[];
    const rowCount = Math.floor((children.length - cols) / cols);
    const rows: HTMLElement[][] = [];
    for (let r = 0; r < rowCount; r++) {
        const rowCells = children.slice(cols + r * cols, cols + (r + 1) * cols) as HTMLElement[];
        rows.push(rowCells);
    }
    return rows;
}

export function getLastGridRow(gridSelector: string, cols: number): HTMLElement[] | null {
    const grid = document.querySelector(gridSelector) as HTMLElement | null;
    if (!grid) return null;
    const children = Array.from(grid.children) as HTMLElement[];
    const rowCount = Math.floor((children.length - cols) / cols);
    if (rowCount === 0) return null;
    const start = cols + (rowCount - 1) * cols;
    const end = start + cols;
    return children.slice(start, end);
}
