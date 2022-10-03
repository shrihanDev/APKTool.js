export type Int = number & { __int__: void };

export const toInt = (val: any): Int => parseInt(val.toString()) as Int;
export const isInt = (num: number): num is Int => num % 1 === 0;
export const roundToInt = (num: number): Int => toInt(Math.round(num));
