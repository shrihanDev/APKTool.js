import ResResSpec from './ResResSpec';
import ResType from './ResType';
import ResValue from './value/ResValue';

export default class ResResource {
  private readonly mConfig: ResType;
  private readonly mResSpec: ResResSpec;
  private readonly mValue: ResValue;

  constructor(config: ResType, spec: ResResSpec, value: ResValue) {
    this.mConfig = config;
    this.mResSpec = spec;
    this.mValue = value;
  }

  public getFilePath(): string {
    return (
      this.mResSpec.getType().getName() +
      this.mConfig.getFlags().getQualifiers() +
      '/' +
      this.mResSpec.getName()
    );
  }

  public getConfig(): ResType {
    return this.mConfig;
  }

  public getResSpec(): ResResSpec {
    return this.mResSpec;
  }

  public getValue(): ResValue {
    return this.mValue;
  }

  public replace(value: ResValue): void {
    const res: ResResource = new ResResource(
      this.mConfig,
      this.mResSpec,
      value
    );
    this.mConfig.addResource(res, true);
    this.mResSpec.addResource(res, true);
  }

  public toString(): string {
    return this.getFilePath();
  }
}
