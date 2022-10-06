import { Int } from 'strict-types/Int';
import ResValue from './ResValue';

export default class ResIntBasedValue extends ResValue {
  private readonly mRawIntValue: Int;

  protected constructor(rawIntValue: Int) {
    super();
    this.mRawIntValue = rawIntValue;
  }

  public getRawIntValue(): Int {
    return this.mRawIntValue;
  }
}
