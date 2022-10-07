import { Int, isInt, toInt } from 'types/Int';

export interface PTE {
  package_: Int;
  type: Int;
  entry: Int;
}

export default class ResID {
  public package_: Int;
  public type: Int;
  public entry: Int;

  public id: Int;

  constructor(data: Int | PTE) {
    if ('__int__' in data && data?.__int__ && isInt(data as number)) {
      this._constructorOnlyId(data);
    } else if ('package_' in data) {
      this._trueConstructor(
        data.package_,
        data.type,
        data.entry,
        toInt((data.package_ << 24) + (data.type << 16) + data.entry)
      );
    }
  }

  private _constructorOnlyId(id: Int): void {
    this._trueConstructor(
      toInt((id >> 24) & 0xff),
      toInt((id >> 16) & 0x000000ff),
      toInt(id & 0x0000ffff),
      id
    );
  }

  private _trueConstructor(
    package_: Int,
    type: Int,
    entry: Int,
    id: Int
  ): void {
    this.package_ = package_ === 0 ? toInt(2) : package_;
    this.type = type;
    this.entry = entry;
    this.id = id;
  }

  public toString(): string {
    return this.id.toString(16);
  }

  public hashCode(): Int {
    let hash: Int = toInt(17);
    hash = toInt(31 * hash + this.id);
    return hash;
  }

  public equals(object: Object): boolean {
    if (object === null) {
      return false;
    }
    if (!(object instanceof ResID)) {
      return false;
    }
    const other: ResID = object;
    return this.id === other.id;
  }
}
