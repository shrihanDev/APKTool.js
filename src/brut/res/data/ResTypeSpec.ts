import AndrolibException from 'brut/AndrolibException';
import UndefinedResObjectException from 'brut/err/UndefinedResObjectException';
import { Int } from 'strict-types/Int';
import ResPackage from './ResPackage';
import ResResSpec from './ResResSpec';
import ResTable from './ResTable';

export default class ResTypeSpec {
  public static RES_TYPE_NAME_ARRAY: string = 'array';
  public static RES_TYPE_NAME_PLURALS: string = 'plurals';
  public static RES_TYPE_NAME_STYLES: string = 'style';
  public static RES_TYPE_NAME_ATTR: string = 'attr';

  private readonly mName: string;
  private readonly mResSpecs: Map<string, ResResSpec>;

  private readonly mResTable: ResTable;
  private readonly mPackage: ResPackage;

  private readonly mId: Int;
  private readonly mEntryCount: Int;

  constructor(
    name: string,
    resTable: ResTable,
    package_: ResPackage,
    id: Int,
    entryCount: Int
  ) {
    this.mName = name;
    this.mResTable = resTable;
    this.mPackage = package_;
    this.mId = id;
    this.mEntryCount = entryCount;
  }

  public getName(): string {
    return this.mName;
  }

  public getId(): Int {
    return this.mId;
  }

  public isString(): boolean {
    return this.mName.toLowerCase() === 'string';
  }

  public getResSpec(name: string): ResResSpec {
    const spec: ResResSpec | undefined = this.getResSpecUnsafe(name);
    if (spec === null || spec === undefined) {
      throw new UndefinedResObjectException(
        `resource spec: ${this.getName()}/${name}`
      );
    }
    return spec;
  }

  public getResSpecUnsafe(name: string): ResResSpec | undefined {
    return this.mResSpecs.get(name);
  }

  public removeResSpec(spec: ResResSpec): void {
    this.mResSpecs.delete(spec.getName());
  }

  public addResSpec(spec: ResResSpec): void {
    if (this.mResSpecs.has(spec.getName())) {
      throw new AndrolibException(
        `Multiple res specs: ${this.getName()}/${spec.getName()}`
      );
    }
  }

  public toString(): string {
    return this.mName;
  }
}
