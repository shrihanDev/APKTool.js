import TypedValue from 'android/util/TypedValue';
import { Int } from 'types/Int';
import ResScalarValue from './ResScalarValue';

export default class ResIntValue extends ResScalarValue {
  protected mValue: Int;
  private readonly type: Int;

  constructor(value: Int, rawValue: string, type?: string, thisType?: Int) {
    super(type ?? 'integer', value, rawValue);
    if (thisType !== undefined) {
      this.type = thisType;
    }
  }

  public getValue(): Int {
    return this.mValue;
  }

  protected override encodeAsResXml(): string {
    const coerced: string | null = TypedValue.coerceToString(
      this.type,
      this.mValue
    );
    if (coerced === null) {
      return '';
    }
    return coerced;
  }
}
