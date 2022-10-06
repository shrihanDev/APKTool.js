import { Int } from 'strict-types/Int';
import ResScalarValue from './ResScalarValue';

export default class ResEmptyValue extends ResScalarValue {
  protected mValue: Int;
  protected type: Int;

  constructor(value: Int, rawValue: string, thisType: Int) {
    super('integer', value, rawValue);
    if (thisType !== undefined) {
      this.type = thisType;
    }
    if (value !== 1) {
      throw new Error('UnsupportedOperationException');
    }
    this.mValue = value;
  }

  public getValue(): Int {
    return this.mValue;
  }

  protected override encodeAsResXml(): string {
    return '@empty';
  }
}
