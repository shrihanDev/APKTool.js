import ResValuesXmlSerializable from 'brut/res/xml/ResValuesXmlSerializable';
import ResXmlEncodable from 'brut/res/xml/ResXmlEncodable';
import ResXmlEncoders from 'brut/res/xml/ResXmlEncoders';
import { XmlSerializer } from 'hjs-xmlpull';
import { Int } from 'strict-types/Int';
import ResResource from '../ResResource';
import ResIntBasedValue from './ResIntBasedValue';

export default abstract class ResScalarValue
  extends ResIntBasedValue
  implements ResXmlEncodable, ResValuesXmlSerializable
{
  protected mType: string;
  protected mRawValue: string;

  constructor(type: string, rawIntValue: Int, rawValue: string) {
    super(rawIntValue);
    this.mType = type;
    this.mRawValue = rawValue;
  }

  public encodeAsResXmlAttr(): string {
    if (this.mRawValue !== null && this.mRawValue !== undefined) {
      return this.mRawValue;
    }
    return this.encodeAsResXml();
  }

  public encodeAsResXmlItemValue(): string {
    return this.encodeAsResXmlValue();
  }

  public encodeAsResXmlValue(): string {
    if (this.mRawValue !== null && this.mRawValue !== undefined) {
      return this.mRawValue;
    }
    return this.encodeAsResXml();
  }

  public encodeAsResXmlNonEscapedItemValue(): string {
    return this.encodeAsResXmlValue()
      .replace('&amp;', '&')
      .replace('&lt;', '<');
  }

  public hasMultipleNonPositionalSubstitutions(): boolean {
    return ResXmlEncoders.hasMultipleNonPositionalSubstitutions(this.mRawValue);
  }

  public serializeToResValuesXml(
    serializer: XmlSerializer,
    res: ResResource
  ): void {
    const type: string = res.getResSpec().getType().getName();
    let item: boolean = this.mType === 'reference' && type === this.mType;

    let body: string = this.encodeAsResXmlValue();

    // check for resource reference
    if (type.toLowerCase() === 'color') {
      if (body.includes('@')) {
        if (!res.getFilePath().includes('string')) {
          item = true;
        }
      }
    }

    // Dummy attributes should be <item> with type attribute
    if (res.getResSpec().isDummyResSpec()) {
      item = true;
    }

    // Android does not allow values (false) for ids.xml anymore
    // https://issuetracker.google.com/issues/80475496
    // But it decodes as a ResBoolean, which makes no sense. So force it to empty
    if (type.toLowerCase() === 'id' && body !== '') {
      body = '';
    }

    // check for using attrib as node or item
    const tagName = item ? 'item' : type;

    serializer.startTag(null, tagName);
    if (item) {
      serializer.attribute(null, 'type', type);
    }
    serializer.attribute(null, 'name', res.getResSpec().getName());

    if (!body.isEmpty()) {
      serializer.ignorableWhitespace(body);
    }

    serializer.endTag(null, tagName);
  }

  public getType(): string {
    return this.mType;
  }

  protected serializeExtraXmlAttrs(
    serializer: XmlSerializer,
    res: ResResource
  ): void {}

  protected abstract encodeAsResXml(): string;
}
