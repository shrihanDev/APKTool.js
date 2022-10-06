import AndrolibException from 'brut/AndrolibException';
import UndefinedResObjectException from 'brut/err/UndefinedResObjectException';
import ResConfigFlags from './ResConfigFlags';
import ResID from './ResID';
import ResPackage from './ResPackage';
import ResResource from './ResResource';
import ResType from './ResType';
import ResTypeSpec from './ResTypeSpec';

export default class ResResSpec {
  private readonly mId: ResID;
  private readonly mName: string;
  private readonly mPackage: ResPackage;
  private readonly mType: ResTypeSpec;
  private readonly mResources: Map<ResConfigFlags, ResResource> = new Map();

  constructor(id: ResID, name: string, pkg: ResPackage, type: ResTypeSpec) {
    this.mId = id;
    let cleanName: string = '';

    const resResSpec: ResResSpec | undefined = type.getResSpecUnsafe(name);
    if (resResSpec !== null || resResSpec !== undefined) {
      cleanName = `APKTOOL_DUPLICATE_${type.toString()}_${id.toString()}`;
    } else {
      cleanName = name === '' ? `APKTOOL_DUMMYVAL_${id.toString()}` : name;
    }

    this.mName = cleanName;
    this.mPackage = pkg;
    this.mType = type;
  }

  public listResources(): Set<ResResource> {
    return new Set(this.mResources.values());
  }

  public getResourceFromType(config: ResType): ResResource {
    return this.getResource(config.getFlags());
  }

  public getResource(config: ResConfigFlags): ResResource {
    const res: ResResource | undefined = this.mResources.get(config);
    if (res === null || res === undefined) {
      throw new UndefinedResObjectException(
        `resource: spec=${this.toString()}, config=${config.toString()}`
      );
    }
    return res;
  }

  public getDefaultResource(): ResResource {
    return this.getResource(new ResConfigFlags());
  }

  public hasDefaultResources(): boolean {
    return this.mResources.has(new ResConfigFlags());
  }

  public getFullNameRTP(
    relativeToPackage: ResPackage,
    excludeType: boolean
  ): string {
    return this.getFullName(
      this.getPackage().equals(relativeToPackage),
      excludeType
    );
  }

  public getFullName(excludePackage: boolean, excludeType: boolean): string {
    return (
      (excludePackage ? '' : this.getPackage().getName() + ':').toString() +
      (excludeType ? '' : this.getType().getName() + '/').toString() +
      this.getName()
    );
  }

  public getId(): ResID {
    return this.mId;
  }

  public getName(): string {
    return this.mName.replace('"', 'q');
  }

  public getPackage(): ResPackage {
    return this.mPackage;
  }

  public getType(): ResTypeSpec {
    return this.mType;
  }

  public isDummyResSpec(): boolean {
    return this.getName().startsWith('APKTOOL_DUMMY_');
  }

  public addResource(res: ResResource, overwrite: boolean = false): void {
    const flags: ResConfigFlags = res.getConfig().getFlags();
    if (overwrite) {
      this.mResources.set(flags, res);
    } else {
      if (this.mResources.has(flags)) {
        throw new AndrolibException(
          `Multiple resources: spec=${this.toString()}, config=${flags.toString()}`
        );
      }
    }
  }

  public toString(): string {
    return `${this.mId.toString()} ${this.mType.toString()}/${this.mName}`;
  }
}
