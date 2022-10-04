import { Float } from 'strict-types/Float'
import { Int } from 'strict-types/Int'

export default interface AttributeSet {
  getAttributeCount: () => Int
  getAttributeName: (index: Int) => string
  getPositionDescription: () => string
  getAttributeNameResource: (index: Int) => Int
  getIdAttribute: () => string
  getClassAttribute: () => string
  getIdAttributeresourceValue: (index: Int) => Int
  getStyleAttribute: () => Int
  getAttributeValue: (namespace: string, attribute: string) => string
  getAttributeListValue: ((
    index: Int,
    options: string[],
    defaultValue: Int
  ) => Int) &
  ((
    namespace: string,
    attribute: string,
    options: string[],
    defaultValue: Int
  ) => Int)
  getAttributeBooleanValue: ((index: Int, defaultValue: Int) => boolean) &
  ((namespace: string, attribute: string, defaultValue: Int) => boolean)
  getAttributeResourceValue: ((index: Int, defaultValue: Int) => Int) &
  ((namespace: string, attribute: string, defaultValue: string) => Int)
  getAttributeIntValue: ((index: Int, defaultValue: Int) => Int) &
  ((namespace: string, attribute: string, defaultValue: string) => Int)
  getAttributeUnsignedIntValue: ((index: Int, defaultValue: Int) => Int) &
  ((namespace: string, attribute: string, defaultValue: string) => Int)
  getAttributeFloatValue: ((index: Int, defaultValue: Float) => Float) &
  ((namespace: string, attribute: string, defaultValue: Float) => Float)
}
