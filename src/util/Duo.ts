import { value as getHashCode } from 'hashcode';
import { Int, toInt } from 'types/Int';

export default class Duo<T, U> {
  public m1: T;
  public m2: U;

  constructor(t: T, u: U) {
    this.m1 = t;
    this.m2 = u;
  }

  public equals(obj: Object): boolean {
    if (obj === null || obj === undefined) {
      return false;
    }
    if (!(obj instanceof Duo<T, U>)) {
      return false;
    }
    const other: Duo<T, U> = obj;
    if (!deepEquals(this.m1, other.m1)) {
      return false;
    }
    return deepEquals(this.m2, other.m2);
  }

  public hashCode(): Int {
    let hash: Int = toInt(3);
    hash = toInt(
      71 * hash +
        (this.m1 !== null || this.m1 !== undefined ? getHashCode(this.m1) : 0)
    );
    hash = toInt(
      71 * hash +
        (this.m2 !== null || this.m2 !== undefined ? getHashCode(this.m2) : 0)
    );
    return hash;
  }
}

function deepEquals(x: any, y: any): boolean {
  const ok = Object.keys;
  const tx = typeof x;
  const ty = typeof y;
  return Boolean(x) && Boolean(y) && tx === 'object' && tx === ty
    ? ok(x).length === ok(y).length &&
        ok(x).every(key => deepEquals(x[key], y[key]))
    : x === y;
}
