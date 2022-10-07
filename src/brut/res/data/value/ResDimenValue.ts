import TypedValue from 'android/util/TypedValue';
import { Int } from 'types/Int';
import ResIntValue from './ResIntValue';

export default class ResDimenValue extends ResIntValue {
  constructor(value: Int, rawValue: string) {
    super(value, rawValue, 'dimen');
  }

  protected override encodeAsResXml(): string {
    const coerced: string | null = TypedValue.coerceToString(
      TypedValue.TYPE_DIMENSION,
      this.mValue
    );
    if (coerced === null) {
      return '';
    }
    return coerced;
  }
}
