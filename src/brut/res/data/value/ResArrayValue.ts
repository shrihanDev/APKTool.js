import ResValuesXmlSerializable from 'brut/res/xml/ResValuesXmlSerializable';
import { XmlSerializer } from 'hjs-xmlpull';
import { Int, toInt } from 'types/Int';
import Duo from 'util/Duo';
import ResResource from '../ResResource';
import ResBagValue from './ResBagValue';
import ResReferenceValue from './ResReferenceValue';
import ResScalarValue from './ResScalarValue';

export default class ResArrayValue
  extends ResBagValue
  implements ResValuesXmlSerializable
{
  private readonly mItems: ResScalarValue[];
  private readonly AllowedArrayTypes: string[] = ['string', 'integer'];
  public static BAG_KEY_ARRAY_START: Int = toInt(0x02000000);
  constructor(
    parent: ResReferenceValue,
    items: Array<Duo<Int, ResScalarValue>> | ResScalarValue[]
  ) {
    super(parent);

    if (items instanceof Array<ResScalarValue>) {
      this.mItems = items as ResScalarValue[];
    } else {
      const xItems = items as Array<Duo<Int, ResScalarValue>>;
      this.mItems = new Array<ResScalarValue>(xItems.length);
      for (let i = 0; i < xItems.length; i++) {
        this.mItems[i] = xItems[i].m2;
      }
    }
  }

  public override serializeToResValuesXml(
    serializer: XmlSerializer,
    res: ResResource
  ): void {
    let type: string | null = this.getType();
    type = (type === null ? '' : type + '-') + 'array';
    serializer.startTag(null, type);
    serializer.attribute(null, 'name', res.getResSpec().getName());

    // lets check if we need to add formatted="false" to this array
    for (const item of this.mItems) {
      if (item.hasMultipleNonPositionalSubstitutions()) {
        serializer.attribute(null, 'formatted', 'false');
        break;
      }
    }

    // add <item>'s
    for (const mItem of this.mItems) {
      serializer.startTag(null, 'item');
      serializer.text(mItem.encodeAsResXmlNonEscapedItemValue());
      serializer.endTag(null, 'item');
    }
    serializer.endTag(null, type);
  }

  public getType(): string | null {
    if (this.mItems.length === 0) {
      return null;
    }
    const type = this.mItems[0].getType();
    for (const mItem of this.mItems) {
      if (mItem.encodeAsResXmlItemValue().startsWith('@string')) {
        return 'string';
      } else if (mItem.encodeAsResXmlItemValue().startsWith('@drawable')) {
        return null;
      } else if (mItem.encodeAsResXmlItemValue().startsWith('@integer')) {
        return 'integer';
      } else if (type !== 'string' && type !== 'integer') {
        return null;
      } else if (type !== mItem.getType()) {
        return null;
      }
    }
    if (this.AllowedArrayTypes.includes(type)) {
      return 'string';
    }

    return null;
  }
}
