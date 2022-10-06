import { Int } from 'strict-types/Int';
import ResIntValue from './ResIntValue';

export default class ResColorValue extends ResIntValue {
  constructor(value: Int, rawValue: string) {
    super(value, rawValue, 'color');
  }

  protected override encodeAsResXml(): string {
    return `#${(parseInt(this.mValue.toString(), 10) >>> 0).toString(16)}`;
  }
}
