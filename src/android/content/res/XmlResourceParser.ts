import AttributeSet from 'android/util/AttributeSet';
import { XmlPullParser } from 'hjs-xmlpull';

/**
 * The XML parsing interface returned for an XML resource. This is a standard
 * XmlPullParser interface, as well as an extended AttributeSet interface and an
 * additional close() method on this interface for the client to indicate when
 * it is done reading the resource.
 */
export default interface XmlResourceParser extends XmlPullParser, AttributeSet {
  /**
   * Close this interface to the resource. Calls on the interface are no
   * longer value after this call.
   */
  close(): void;
}
