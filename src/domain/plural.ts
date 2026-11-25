/** "1 doctor", "3 doctors": a count with its noun (regular English plurals). */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
