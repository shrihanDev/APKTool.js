import AndrolibException from 'brut/AndrolibException';
import { Int } from 'types/Int';
import ResIntBasedValue from './ResIntBasedValue';

export default class ResFileValue extends ResIntBasedValue {
  private readonly mPath: string;

  constructor(path: string, rawIntValue: Int) {
    super(rawIntValue);
    this.mPath = path;
  }

  public getStrippedPath(): string {
    if (this.mPath.startsWith('res/')) {
      return this.mPath.substring(4);
    }
    if (this.mPath.startsWith('r/') || this.mPath.startsWith('R/')) {
      return this.mPath.substring(2);
    }
    throw new AndrolibException(
      `File path does not start with "res/" or "r/": ${this.mPath}`
    );
  }

  public toString(): string {
    return this.mPath;
  }
}
