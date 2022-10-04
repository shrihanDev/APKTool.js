import AndrolibException from 'brut/AndrolibException';
import UndefinedResObjectException from 'brut/err/UndefinedResObjectException';
import { Int, toInt } from 'strict-types/Int';
import ResConfigFlags from './ResConfigFlags';
import ResID from './ResID';
import ResResource from './ResResource';
import ResResSpec from './ResResSpec';
import ResTable from './ResTable';
import ResType from './ResType';
import ResTypeSpec from './ResTypeSpec';
import ResValuesFile from './ResValuesFile';
import ResFileValue from './value/ResFileValue';
import ResValueFactory from './value/ResValueFactory';

export default class ResPackage {
  private readonly mResTable: ResTable;
  private readonly mId: Int;
  private readonly mName: string;
  private readonly mResSpecs: Map<ResID, ResResSpec> = new Map();
  private readonly mConfigs: Map<ResConfigFlags, ResType> = new Map();
  private readonly mTypes: Map<string, ResTypeSpec> = new Map();
  private readonly mSynthesizedRes: Set<ResID> = new Set();

  private mValueFactory: ResValueFactory;

  constructor(resTable: ResTable, id: Int, name: string) {
    this.mResTable = resTable;
    this.mId = id;
    this.mName = name;
  }

  public listResSpecs(): ResResSpec[] {
    return Array.from(this.mResSpecs.values());
  }

  public hasResSpec(resID: ResID): boolean {
    return this.mResSpecs.has(resID);
  }

  public getResSpec(resID: ResID): ResResSpec {
    const spec = this.mResSpecs.get(resID);
    if (spec === null || spec === undefined) {
      throw new UndefinedResObjectException(
        `resource spec: ${resID.toString()}`
      );
    }
    return spec;
  }

  public getResSpecCount(): Int {
    return toInt(this.mResSpecs.size);
  }

  public getOrCreateConfig(flags: ResConfigFlags): ResType {
    let config: ResType = this.mConfigs.get(flags);
    if (config === null || config === undefined) {
      config = new ResType(flags);
      this.mConfigs.set(flags, config);
    }
    return config;
  }

  public getType(typeName: string): ResTypeSpec {
    const type: ResTypeSpec = this.mTypes.get(typeName);
    if (type === null || type === undefined) {
      throw new UndefinedResObjectException(`type: ${typeName}`);
    }
    return type;
  }

  public listFiles(): Set<ResResource> {
    const ret: Set<ResResource> = new Set();
    for (const spec of this.mResSpecs.values()) {
      for (const res of spec.listResources()) {
        if (res.getValue() instanceof ResFileValue) {
          ret.add(res);
        }
      }
    }
    return ret;
  }

  public listValuesFile(): ResValuesFile[] {
    // pass through
  }

  public getResTable(): ResTable {
    return this.mResTable;
  }

  public getId(): Int {
    return this.mId;
  }

  public getName(): string {
    return this.mName;
  }

  public isSynthesized(resId: ResID): boolean {
    return this.mSynthesizedRes.has(resId);
  }

  public removeResSpec(spec: ResResSpec): void {
    this.mResSpecs.delete(spec.getId());
  }

  public addResSpec(spec: ResResSpec): void {
    if (this.mResSpecs.has(spec.getId())) {
      throw new AndrolibException(
        `Multiple resource specs: ${spec.toString()}`
      );
    } else {
      this.mResSpecs.set(spec.getId(), spec);
    }
  }

  public addType(type: ResTypeSpec): void {
    if (this.mTypes.has(type.getName())) {
      console.warn(`Multiple types detected! ${type.toString()} ignored!`);
    } else {
      this.mTypes.set(type.getName(), type);
    }
  }

  public addSynthesizedRes(resId: Int): void {
    this.mSynthesizedRes.add(new ResID(resId));
  }

  public toString(): string {
    return this.mName;
  }

  public equals(object: Object): boolean {
    if (object === null || object === undefined) {
      return false;
    }
    if (!(object instanceof ResPackage)) {
      return false;
    }
    const other: ResPackage = object;
    return this.mId === other.mId;
  }

  public hashCode(): Int {
    let hash: Int = toInt(17);
    hash = toInt(
      31 * hash +
        (this.mResTable !== null || this.mResTable !== undefined
          ? this.mResTable.hashCode()
          : 0)
    );
    hash = toInt(31 * hash + this.mId);
    return hash;
  }

  public getValueFactory(): ResValueFactory {
    if (this.mValueFactory === null || this.mValueFactory === undefined) {
      this.mValueFactory = new ResValueFactory(this);
    }
    return this.mValueFactory;
  }
}
