export type Float = number & { __float__: void };

export const toFloat = (val: any): Float => parseFloat(val) as Float;
export const isFloat = (num: number): num is Float => num % 1 === 0;
