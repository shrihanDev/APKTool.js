import { Float } from 'types/Float';
import { Int } from 'types/Int';

export default interface AttributeSet {
  getAttributeCount: () => Int;
  getAttributeName: (index: Int) => string;
  getPositionDescription: () => string;
  getAttributeNameResource: (index: Int) => Int;
  getIdAttribute: () => string | null;
  getClassAttribute: () => string | null;
  getIdAttributeResourceValue: (index: Int) => Int;
  getStyleAttribute: () => Int;
  getAttributeValue: (namespace: string, attribute: string) => string | null;
  getAttributeListValue: (
    namespace: string,
    attribute: string,
    options: string[],
    defaultValue: Int
  ) => Int;
  getAttributeBooleanValue: (
    namespace: string,
    attribute: string,
    defaultValue: boolean
  ) => boolean;
  getAttributeResourceValue: (
    namespace: string,
    attribute: string,
    defaultValue: Int
  ) => Int;
  getAttributeIntValue: (
    namespace: string,
    attribute: string,
    defaultValue: Int
  ) => Int;
  getAttributeUnsignedIntValue: (
    namespace: string,
    attribute: string,
    defaultValue: Int
  ) => Int;
  getAttributeFloatValue: (
    namespace: string,
    attribute: string,
    defaultValue: Float
  ) => Float;
}
