import { value } from 'hashcode';
import { Float } from 'types/Float';
import { Int } from 'types/Int';
import ResScalarValue from './ResScalarValue';

export default class ResFloatValue extends ResScalarValue {
  private readonly mValue: Float;

  constructor(value: Float, rawIntValue: Int, rawValue: string) {
    super('float', rawIntValue, rawValue);
    this.mValue = value;
  }

  public getValue(): Float {
    return this.mValue;
  }

  protected encodeAsResXml(): string {
    return value.toString();
  }
}
