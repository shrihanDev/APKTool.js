import ResValuesXmlSerializable from 'brut/res/xml/ResValuesXmlSerializable';
import ResXmlEncoders from 'brut/res/xml/ResXmlEncoders';
import { XmlSerializer } from 'hjs-xmlpull';
import { Int, toInt } from 'types/Int';
import Duo from 'util/Duo';
import ResResource from '../ResResource';
import ResBagValue from './ResBagValue';
import ResReferenceValue from './ResReferenceValue';
import ResScalarValue from './ResScalarValue';

export default class ResPluralsValue
  extends ResBagValue
  implements ResValuesXmlSerializable
{
  private readonly mItems: ResScalarValue[];
  public static BAG_KEY_PLURALS_START: Int = toInt(0x01000004);
  public static BAG_KEY_PLURALS_END: Int = toInt(0x01000009);
  private static readonly QUANTITY_MAP: string[] = [
    'other',
    'zero',
    'one',
    'two',
    'few',
    'many'
  ];

  constructor(
    parent: ResReferenceValue,
    items: Array<Duo<Int, ResScalarValue>>
  ) {
    super(parent);
    this.mItems = new Array<ResScalarValue>(8);
    for (const item of items) {
      this.mItems[item.m1 - ResPluralsValue.BAG_KEY_PLURALS_START] = item.m2;
    }
  }

  public override serializeToResValuesXml(
    serializer: XmlSerializer,
    res: ResResource
  ): void {
    serializer.startTag(null, 'plurals');
    serializer.attribute(null, 'name', res.getResSpec().getName());
    for (let i = 0; i < this.mItems.length; i++) {
      const item: ResScalarValue = this.mItems[i];
      if (item === null || item === undefined) {
        continue;
      }

      serializer.startTag(null, 'item');
      serializer.attribute(null, 'quantity', ResPluralsValue.QUANTITY_MAP[i]);
      serializer.text(
        ResXmlEncoders.enumerateNonPositionalSubstitutionsIfRequired(
          item.encodeAsResXmlNonEscapedItemValue()
        )
      );
      serializer.endTag(null, 'item');
    }
  }
}
