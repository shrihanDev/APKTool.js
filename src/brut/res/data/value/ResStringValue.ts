import ResXmlEncoders from 'brut/res/xml/ResXmlEncoders';
import { Int } from 'strict-types/Int';
import ResScalarValue from './ResScalarValue';

export default class ResStringValue extends ResScalarValue {
  constructor(value: string, rawValue: Int, type: string = 'string') {
    super(value, rawValue, type);
  }

  public override encodeAsResXmlAttr(): string {
    return this.checkIfStringIsNumeric(
      ResXmlEncoders.encodeAsResXmlAttr(this.mRawValue)
    );
  }

  public override encodeAsResXmlItemValue(): string {
    return ResXmlEncoders.enumerateNonPositionalSubstitutionsIfRequired(
      ResXmlEncoders.encodeAsXmlValue(this.mRawValue)
    );
  }

  public override encodeAsResXmlValue(): string {
    return ResXmlEncoders.encodeAsXmlValue(this.mRawValue);
  }

  protected encodeAsResXml(): string {
    throw new Error('UnsupportedOperationException');
  }

  private checkIfStringIsNumeric(val: string): string {
    if (val === '') {
      return val;
    }
    const match: RegExpMatchArray | null = val.match(/\d{9,}/);
    return match !== null && match.length > 0 ? `\\ ${val}` : val;
  }
}
