import { value as getHashCode } from 'hashcode';
import { Int, toInt } from 'types/Int';
import ResPackage from './ResPackage';
import ResResource from './ResResource';
import ResType from './ResType';
import ResTypeSpec from './ResTypeSpec';

export default class ResValuesFile {
  private readonly mPackage: ResPackage;
  private readonly mType: ResTypeSpec;
  private readonly mConfig: ResType;
  private readonly mResources: Set<ResResource> = new Set();

  constructor(pkg: ResPackage, type: ResTypeSpec, config: ResType) {
    this.mPackage = pkg;
    this.mType = type;
    this.mConfig = config;
  }

  public getPath(): string {
    return `values${this.mConfig
      .getFlags()
      .getQualifiers()}/${this.mType.getName()}${
      this.mType.getName().endsWith('s') ? '' : 's'
    }.xml`;
  }

  public listResources(): Set<ResResource> {
    return this.mResources;
  }

  public getType(): ResTypeSpec {
    return this.mType;
  }

  public isSynthesized(res: ResResource): boolean {
    return this.mPackage.isSynthesized(res.getResSpec().getId());
  }

  public addResource(res: ResResource): void {
    this.mResources.add(res);
  }

  public equals(object: Object): boolean {
    if (object === null || object === undefined) {
      return false;
    }
    if (!(object instanceof ResValuesFile)) {
      return false;
    }
    const other: ResValuesFile = object;
    if (!deepEquals(this.mType, other.mType)) {
      return false;
    }
    return deepEquals(this.mConfig, other.mConfig);
  }

  public hashCode(): Int {
    let hash: Int = toInt(17);
    hash = toInt(
      31 * hash +
        (this.mType !== null || this.mType !== undefined
          ? getHashCode(this.mType)
          : 0)
    );
    hash = toInt(
      31 * hash +
        (this.mConfig !== null || this.mConfig !== undefined
          ? getHashCode(this.mConfig)
          : 0)
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
