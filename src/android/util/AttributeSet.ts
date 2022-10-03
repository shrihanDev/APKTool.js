import { Float } from 'strict-types/Float';
import { Int } from 'strict-types/Int';

export default interface AttributeSet {
  getAttributeCount(): Int;
  getAttributeName(index: Int): string;
  getPositionDescription(): string;
  getAttributeNameResource(index: Int): Int;
  getAttributeListValue(index: Int, options: string[], defaultValue: Int): Int;
  getAttributeBooleanValue(index: Int, defaultValue: Int): boolean;
  getAttributeResourceValue(index: Int, defaultValue: Int): Int;
  getAttributeIntValue(index: Int, defaultValue: Int): Int;
  getAttributeUnsignedIntValue(index: Int, defaultValue: Int): Int;
  getAttributeFloatValue(index: Int, defaultValue: Float): Float;
  getIdAttribute(): string;
  getClassAttribute(): string;
  getIdAttributeresourceValue(index: Int): Int;
  getStyleAttribute(): Int;
  getAttributeValue(namespace: string, attribute: string): string;
  getAttributeListValue(
    namespace: string,
    attribute: string,
    options: string[],
    defaultValue: Int
  ): Int;
  getAttributeBooleanValue(
    namespace: string,
    attribute: string,
    defaultValue: Int
  ): boolean;
  getAttributeResourceValue(
    namespace: string,
    attribute: string,
    defaultValue: string
  ): Int;
  getAttributeIntValue(
    namespace: string,
    attribute: string,
    defaultValue: string
  ): Int;
  getAttributeUnsignedIntValue(
    namespace: string,
    attribute: string,
    defaultValue: string
  ): Int;
  getAttributeFloatValue(
    namespace: string,
    attribute: string,
    defaultValue: Float
  ): Float;
}
