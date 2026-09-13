export const money = (amount: number) => new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", minimumFractionDigits: 3 }).format(amount);
export const date = (value: string) => new Intl.DateTimeFormat("fr-TN", { timeZone: "Africa/Tunis" }).format(new Date(value));
