import TypedValue from 'android/util/TypedValue';
import AndrolibException from 'brut/AndrolibException';
import { toFloat } from 'types/Float';
import { Int, toInt } from 'types/Int';
import Duo from 'util/Duo';
import ResPackage from '../ResPackage';
import ResTypeSpec from '../ResTypeSpec';
import ResArrayValue from './ResArrayValue';
import ResAttr from './ResAttr';
import ResBagValue from './ResBagValue';
import ResBoolValue from './ResBoolValue';
import ResColorValue from './ResColorValue';
import ResDimenValue from './ResDimenValue';
import ResEmptyValue from './ResEmptyValue';
import ResFileValue from './ResFileValue';
import ResFloatValue from './ResFloatValue';
import ResFractionValue from './ResFractionValue';
import ResIntBasedValue from './ResIntBasedValue';
import ResIntValue from './ResIntValue';
import ResPluralsValue from './ResPluralsValue';
import ResReferenceValue from './ResReferenceValue';
import ResScalarValue from './ResScalarValue';
import ResStringValue from './ResStringValue';
import ResStyleValue from './ResStyleValue';

export default class ResValueFactory {
  private readonly mPackage: ResPackage;

  constructor(package_: ResPackage) {
    this.mPackage = package_;
  }

  public factory(type: Int, value: Int, rawValue: string): ResScalarValue {
    switch (type) {
      case TypedValue.TYPE_NULL:
        if (value === TypedValue.DATA_NULL_UNDEFINED) {
          // Special case $empty as explicitly defined empty value
          return new ResStringValue('', value);
        } else if (value === TypedValue.DATA_NULL_EMPTY) {
          return new ResEmptyValue(value, rawValue, type);
        }
        return new ResReferenceValue(this.mPackage, toInt(0), '');
      case TypedValue.TYPE_REFERENCE:
        return this.newReference(value, '');
      case TypedValue.TYPE_ATTRIBUTE:
      case TypedValue.TYPE_DYNAMIC_ATTRIBUTE:
        return this.newReference(value, rawValue, true);
      case TypedValue.TYPE_STRING:
        return new ResStringValue(rawValue, value);
      case TypedValue.TYPE_FLOAT:
        return new ResFloatValue(toFloat(value), value, rawValue);
      case TypedValue.TYPE_DIMENSION:
        return new ResDimenValue(value, rawValue);
      case TypedValue.TYPE_FRACTION:
        return new ResFractionValue(value, rawValue);
      case TypedValue.TYPE_INT_BOOLEAN:
        return new ResBoolValue(value === 0, value, rawValue);
      case TypedValue.TYPE_DYNAMIC_REFERENCE:
        return this.newReference(value, rawValue);
    }

    if (type >= TypedValue.TYPE_FIRST_COLOR_INT) {
      return new ResColorValue(value, rawValue);
    }
    if (type >= TypedValue.TYPE_FIRST_INT && type <= TypedValue.TYPE_LAST_INT) {
      return new ResIntValue(value, rawValue, undefined, type);
    }

    throw new AndrolibException(`Invalid value type: ${type}`);
  }

  public factoryStr(value: string, rawValue: Int): ResIntBasedValue {
    if (value === null) {
      return new ResFileValue('', rawValue);
    }
    if (value.startsWith('res/')) {
      return new ResFileValue(value, rawValue);
    }
    if (value.startsWith('r/') || value.startsWith('R/')) {
      return new ResFileValue(value, rawValue);
    }
    return new ResStringValue(value, rawValue);
  }

  public bagFactory(
    parent: Int,
    items: Array<Duo<Int, ResScalarValue>>,
    resTypeSpec: ResTypeSpec
  ): ResBagValue {
    const parentVal: ResReferenceValue = this.newReference(parent, '');

    if (items.length === 0) {
      return new ResBagValue(parentVal);
    }

    const key: Int = items[0].m1;
    if (key === ResAttr.BAG_KEY_ATTR_TYPE) {
      return ResAttr.factory(parentVal, items, this, this.mPackage);
    }

    const resTypeName: string = resTypeSpec.getName();

    // Android O Preview added an unknown enum for c. This is hardcoded as 0 for now.
    if (
      ResTypeSpec.RES_TYPE_NAME_ARRAY === resTypeName ||
      key === ResArrayValue.BAG_KEY_ARRAY_START ||
      key === 0
    ) {
      return new ResArrayValue(parentVal, items);
    }

    if (
      ResTypeSpec.RES_TYPE_NAME_PLURALS === resTypeName ||
      (key >= ResPluralsValue.BAG_KEY_PLURALS_START &&
        key <= ResPluralsValue.BAG_KEY_PLURALS_END)
    ) {
      return new ResPluralsValue(parentVal, items);
    }

    if (ResTypeSpec.RES_TYPE_NAME_ATTR === resTypeName) {
      return new ResAttr(parentVal, toInt(0), null, null, null);
    }

    if (resTypeName.startsWith(ResTypeSpec.RES_TYPE_NAME_STYLES)) {
      return new ResStyleValue(parentVal, items, this);
    }

    throw new AndrolibException(
      'unsupported res type name for bags. Found: ' + resTypeName
    );
  }

  public newReference(
    resID: Int,
    rawValue: string,
    theme: boolean = false
  ): ResReferenceValue {
    return new ResReferenceValue(this.mPackage, resID, rawValue, theme);
  }
}
