import { Int } from 'strict-types/Int';
import ResScalarValue from './ResScalarValue';

export default class ResBoolValue extends ResScalarValue {
  private readonly mValue: boolean;

  constructor(value: boolean, rawIntValue: Int, rawValue: string) {
    super('bool', rawIntValue, rawValue);
    this.mValue = value;
  }

  public getValue(): boolean {
    return this.mValue;
  }

  protected override encodeAsResXml(): string {
    return this.mValue ? 'true' : 'false';
  }
}
