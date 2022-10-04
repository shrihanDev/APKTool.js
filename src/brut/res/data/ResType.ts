import AndrolibException from 'brut/AndrolibException';
import UndefinedResObjectException from 'brut/err/UndefinedResObjectException';
import ResConfigFlags from './ResConfigFlags';
import ResResource from './ResResource';
import ResResSpec from './ResResSpec';

export default class ResType {
  private readonly mFlags: ResConfigFlags;
  private readonly mResources: Map<ResResSpec, ResResource> = new Map();

  constructor(flags: ResConfigFlags) {
    this.mFlags = flags;
  }

  public getResource(spec: ResResSpec): ResResource {
    const res: ResResource | undefined = this.mResources.get(spec);
    if (res === null || res === undefined) {
      throw new UndefinedResObjectException(
        `resource: spec=${spec.toString()}, config=${this.toString()}`
      );
    }
    return res;
  }

  public getFlags(): ResConfigFlags {
    return this.mFlags;
  }

  public addResource(res: ResResource, overwrite: boolean): void {
    const spec: ResResSpec = res.getResSpec();
    if (this.mResources.has(spec) && !overwrite) {
      throw new AndrolibException(
        `Multiple resources: spec=${spec.toString()}, config=${this.toString()}`
      );
    }
  }

  public toString(): string {
    return this.mFlags.toString();
  }
}
