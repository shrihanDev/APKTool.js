import ResValuesXmlSerializable from 'brut/res/xml/ResValuesXmlSerializable';
import { XmlSerializer } from 'hjs-xmlpull';
import { Int } from 'types/Int';
import Duo from 'util/Duo';
import ResResource from '../ResResource';
import ResResSpec from '../ResResSpec';
import ResAttr from './ResAttr';
import ResBagValue from './ResBagValue';
import ResReferenceValue from './ResReferenceValue';
import ResScalarValue from './ResScalarValue';
import ResValue from './ResValue';
import ResValueFactory from './ResValueFactory';

export default class ResStyleValue
  extends ResBagValue
  implements ResValuesXmlSerializable
{
  private readonly mItems: Array<
    Duo<ResReferenceValue | undefined, ResScalarValue>
  >;

  constructor(
    parent: ResReferenceValue,
    items: Array<Duo<Int, ResScalarValue>>,
    factory: ResValueFactory | null
  ) {
    super(parent);

    this.mItems = new Array<Duo<any, any>>(items.length);
    for (let i = 0; i < items.length; i++) {
      this.mItems[i] = new Duo(
        factory?.newReference(items[i].m1, ''),
        items[i].m2
      );
    }
  }

  public override serializeToResValuesXml(
    serializer: XmlSerializer,
    res: ResResource
  ): void {
    serializer.startTag(null, 'style');
    serializer.attribute(null, 'name', res.getResSpec().getName());
    if (!this.mParent.isNull() && !this.mParent.referentIsNull()) {
      serializer.attribute(null, 'parent', this.mParent.encodeAsResXmlAttr());
    } else if (res.getResSpec().getName().includes('.')) {
      serializer.attribute(null, 'parent', '');
    }
    for (const mItem of this.mItems) {
      const spec: ResResSpec | null = mItem.m1!.getReferent();

      if (spec === null) {
        console.log(
          `null reference: m1=0x${mItem
            .m1!.getRawIntValue()
            .toString(16)}(${mItem.m1!.getType()}), m2=0x${mItem.m2
            .getRawIntValue()
            .toString(16)}(${mItem.m2.getType()})`
        );
        continue;
      }

      let name: string;
      let value: string | null = '';

      const resource: ResValue | undefined = spec
        .getDefaultResource()
        .getValue();
      if (resource instanceof ResReferenceValue) {
        continue;
      } else if (resource instanceof ResAttr) {
        const attr: ResAttr = resource;
        value = attr.convertToResXmlFormat(mItem.m2);
        name = spec.getFullNameRTP(res.getResSpec().getPackage(), true);
      } else {
        name = `@${spec.getFullNameRTP(res.getResSpec().getPackage(), false)}`;
      }

      if (value === '') {
        value = mItem.m2.encodeAsResXmlValue();
      }

      if (value === '') {
        continue;
      }

      serializer.startTag(null, 'item');
      serializer.attribute(null, 'name', name);
      serializer.text(value);
      serializer.endTag(null, 'item');
    }
    serializer.endTag(null, 'style');
  }
}
