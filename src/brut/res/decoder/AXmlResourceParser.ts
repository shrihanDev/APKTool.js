import XmlResourceParser from 'android/content/res/XmlResourceParser';
import TypedValue from 'android/util/TypedValue';
import AndrolibException from 'brut/AndrolibException';
import XmlPullParser from 'hjs-xmlpull';
import NumberUtil from 'number-util';
import { SmartBuffer } from 'smart-buffer';
import { Readable, Stream } from 'stream';
import { Float } from 'types/Float';
import { Int, toInt } from 'types/Int';
import ResID from '../data/ResID';
import ResXmlEncoders from '../xml/ResXmlEncoders';
import ResAttrDecoder from './ResAttrDecoder';
import StringBlock from './StringBlock';

/**
 * Binary xml files parser.
 *
 * Parser has only two states: (1) Operational state, which parser
 * obtains after first successful call to next() and retains until
 * open(), close(), or failed call to next(). (2) Closed state, which
 * parser obtains after open(), close(), or failed call to next(). In
 * this state methods return invalid values or throw exceptions.
 *
 * TODO: * check all methods in closed state
 */
export default class AXmlResourceParser implements XmlResourceParser {
  constructor(stream?: Readable) {
    this.resetEventInfo();
    void this.open(stream);
  }

  public getFirstError(): AndrolibException {
    return this.mFirstError;
  }

  public getAttrDecoder(): ResAttrDecoder {
    return this.mAttrDecoder;
  }

  public setAttrDecoder(attrDecoder: ResAttrDecoder): void {
    this.mAttrDecoder = attrDecoder;
  }

  public async open(stream: Readable | undefined): Promise<void> {
    this.close();
    if (stream !== undefined) {
      this.m_reader = SmartBuffer.fromBuffer(await stream2buffer(stream));
    }
  }

  public close(): void {
    if (!this.m_operational) {
      return;
    }
    this.m_operational = false;
    this.m_reader = null;
    this.m_strings = null;
    this.m_resourceIDs = null;
    this.m_namespaces.reset();
    this.resetEventInfo();
  }

  // ///////////////////////////////// iteration
  public next(): Int {
    if (this.m_reader! === null) {
      throw new Error('Parser is not opened.');
    }
    try {
      this.doNext();
      return this.m_event;
    } catch (e) {
      this.close();
      throw e;
    }
  }

  public nextToken(): Int {
    return this.next();
  }

  public nextTag(): Int {
    let eventType: Int = this.next();
    if (eventType === XmlPullParser.TEXT && this.isWhitespace()) {
      eventType = this.next();
    }
    if (eventType !== XmlPullParser.START_TAG && eventType !== XmlPullParser.END_TAG) {
      throw new Error('Expected start or end tag.');
    }
    return eventType;
  }

  public nextText(): string | null {
    if (this.getEventType() !== XmlPullParser.START_TAG) {
      throw new Error('Parser must be on START_TAG to read next text.');
    }
    let eventType: Int = this.next();
    if (eventType === XmlPullParser.TEXT) {
      const result: string | null = this.getText();
      eventType = this.next();
      if (eventType !== XmlPullParser.END_TAG) {
        throw new Error('Event TEXT must be immediately followed by END_TAG.');
      }
      return result;
    } else if (eventType === XmlPullParser.END_TAG) {
      return '';
    } else {
      throw new Error('Parser must be on START_TAG or TEXT to read text.');
    }
  }

  public require(
    type: Int,
    namespace: string | null,
    name: string | null
  ): void {
    if (
      type !== this.getEventType() ||
      (namespace !== null && namespace !== this.getNamespace()) ||
      (name !== null && name !== this.getName())
    ) {
      throw new Error(XmlPullParser.TYPES[type] + ' is expected.');
    }
  }

  public getDepth(): Int {
    return toInt(this.m_namespaces.getDepth() - 1);
  }

  public getEventType(): Int {
    return this.m_event;
  }

  public getLineNumber(): Int {
    return this.m_lineNumber;
  }

  public getName(): string | null {
    if (
      this.m_name === -1 ||
      (this.m_event !== XmlPullParser.START_TAG && this.m_event !== XmlPullParser.END_TAG)
    ) {
      return null;
    }
    return this.m_strings!.getString(this.m_name);
  }

  public getText(): string | null {
    if (this.m_name === -1 || this.m_event !== XmlPullParser.TEXT) {
      return null;
    }
    return this.m_strings!.getString(this.m_name);
  }

  public getTextCharacters(holderForStartAndLength: Int[]): string[] | null {
    const text: string | null = this.getText();
    if (text === null) {
      return null;
    }
    holderForStartAndLength[0] = toInt(0);
    holderForStartAndLength[1] = toInt(text.length);
    const chars: string[] = text.split('');
    return chars;
  }

  public getNamespace(): string | null {
    return this.m_strings!.getString(this.m_namespaceUri);
  }

  public getPrefix(): string | null {
    const prefix: Int = this.m_namespaces.findPrefix(this.m_namespaceUri);
    return this.m_strings!.getString(prefix);
  }

  public getPositionDescription(): string {
    return `XML line #${this.getLineNumber()}`;
  }

  public getNamespaceCount(depth: Int): Int {
    return this.m_namespaces.getAccumulatedCount(depth);
  }

  public getNamespacePrefix(pos: Int): string | null {
    const prefix: Int = this.m_namespaces.getPrefix(pos);
    return this.m_strings!.getString(prefix);
  }

  public getNamespaceUri(pos: Int): string | null {
    const uri: Int = this.m_namespaces.getUri(pos);
    return this.m_strings!.getString(uri);
  }

  // ///////////////////////////////// attributes
  public getClassAttribute(): string | null {
    if (this.m_classAttribute === -1) {
      return null;
    }
    const offset: Int = this.getAttributeOffset(this.m_classAttribute);
    const value: Int = this.m_attributes![offset + XmlPullParser.ATTRIBUTE_IX_VALUE_STRING];
    return this.m_strings!.getString(value);
  }

  public getIdAttribute(): string | null {
    if (this.m_idAttribute === -1) {
      return null;
    }
    const offset: Int = this.getAttributeOffset(this.m_idAttribute);
    const value: Int =
      this.m_attributes![offset + XmlPullParser.ATTRIBUTE_IX_VALUE_STRING];
    return this.m_strings!.getString(value);
  }

  public getIdAttributeResourceValue(defaultValue: Int): Int {
    if (this.m_idAttribute === -1) {
      return defaultValue;
    }
    const offset: Int = this.getAttributeOffset(this.m_idAttribute);
    const valueType: Int = this.m_attributes![offset + XmlPullParser.ATTRIBUTE_IX_VALUE_TYPE];
    if (valueType !== TypedValue.TYPE_REFERENCE) {
      return defaultValue;
    }
    return this.m_attributes![offset + XmlPullParser.ATTRIBUTE_IX_VALUE_DATA]
  }

  public getStyleAttribute(): Int {
    if (this.m_styleAttribute === -1) {
      return toInt(0);
    }
    const offset: Int = this.getAttributeOffset(this.m_styleAttribute);
    return this.m_attributes![offset + XmlPullParser.ATTRIBUTE_IX_VALUE_DATA]
  }

  public getAttributeCount(): Int {
    if (this.m_event !== XmlPullParser.START_TAG) {
      return toInt(-1);
    }
    return toInt(this.m_attributes!.length / XmlPullParser.ATTRIBUTE_LENGTH);
  }

  public getAttributeNamespace(index: Int): string | null {
    const offset: Int = this.getAttributeOffset(index);
    const namespace: Int =
      this.m_attributes![offset + XmlPullParser.ATTRIBUTE_IX_NAMESPACE_URI];
    if (namespace === -1) {
      return '';
    }

    // Minifiers like removing the namespace, so we will default to default namespace
    // unless the pkgId of the resource is private. We will grab the non-standard one.
    let value: string | null = this.m_strings!.getString(namespace);

    if (value!.length === 0) {
      const resourceId: ResID = new ResID(this.getAttributeNameResource(index));
      if (resourceId.package_ === AXmlResourceParser.PRIVATE_PKG_ID) {
        value = this.getNonDefaultNamespaceUri(offset);
      } else {
        value = this.android_ns;
      }
    }

    return value;
  }

  private getNonDefaultNamespaceUri(offset: Int): string | null {
    const prefix: string | null = this.m_strings!.getString(
      this.m_namespaces.getPrefix(offset)
    );
    if (prefix !== null || prefix !== '') {
      return this.m_strings!.getString(this.m_namespaces.getUri(offset));
    }

    // If we are here. There is some clever obfuscation going on. Our reference points to the namespace are gone.
    // Normally we could take the index * attributeCount to get an offset.
    // That would point to the URI in the StringBlock table, but that is empty.
    // We have the namespaces that can't be touched in the opening tag.
    // Though no known way to correlate them at this time.
    // So return the res-auto namespace.
    return 'http://schemas.android.com/apk/res-auto';
  }

  public getAttributePrefix(index: Int): string | null {
    const offset: Int = this.getAttributeOffset(index);
    const uri: Int = this.m_attributes![offset + XmlPullParser.ATTRIBUTE_IX_NAMESPACE_URI];
    const prefix: Int = this.m_namespaces.findPrefix(uri);
    if (prefix === -1) {
      return '';
    }
    return this.m_strings!.getString(index);
  }

  public getAttributeName(index: Int): string {
    const offset: Int = this.getAttributeOffset(index);
    const name: Int = this.m_attributes![offset + XmlPullParser.ATTRIBUTE_IX_NAME];
    if (name === -1) {
      return '';
    }
    let value: string | null = this.m_strings!.getString(name);
    const namespace: string | null = this.getAttributeNamespace(index);

    // If attribute name is lacking or a private namespace emerges,
    // retrieve the exact attribute name by its id.
    if (value === null || value.length === 0) {
      try {
        value = this.mAttrDecoder.decodeManifestAttr(this.getAttributeNameResource(index));
        if (value === null) {
          value = '';
        }
      } catch (e) {
        value = '';
      }
    } else if (namespace !== this.android_ns) {
      try {
        const obfuscatedName: string | null = this.mAttrDecoder.decodeManifestAttr(this.getAttributeNameResource(index));
        if (!(obfuscatedName === null || obfuscatedName === value)) {
          value = obfuscatedName;
        }
      } catch (ignored) {}
    }
    return value;
  }

  public getAttributeNameResource(index: Int): Int {
    const offset: Int = this.getAttributeOffset(index);
    const name: Int = this.m_attributes![offset + XmlPullParser.ATTRIBUTE_IX_NAME];
    if (this.m_resourceIDs == null || name < 0 || name >= this.m_resourceIDs.length) {
      return toInt(0);
    }
    return this.m_resourceIDs[name];
  }

  public getAttributeValueType(index: Int): Int {
    const offset: Int = this.getAttributeOffset(index);
    return this.m_attributes![offset + XmlPullParser.ATTRIBUTE_IX_VALUE_TYPE];
  }

  public getAttributeValueData(index: Int): Int {
    const offset: Int = this.getAttributeOffset(index);
    return this.m_attributes![offset + XmlPullParser.ATTRIBUTES_IX_VALUE_DATA];
  }

  public getAttributeValueByIndex(index: Int): string | null {
    const offset: Int = this.getAttributeOffset(index);
    const valueType: Int = this.m_attributes![offset + XmlPullParser.ATTRIBUTE_IX_VALUE_TYPE];
    const valueData: Int = this.m_attributes![offset + XmlPullParser.ATTRIBUTE_IX_VALUE_DATA];
    const valueRaw: Int = this.m_attributes![offset + XmlPullParser.ATTRIBUTE_IX_VALUE_STRING];

    if (this.mAttrDecoder !== null) {
      try {
        let value: string | null =
          valueRaw === -1
            ? null
            : ResXmlEncoders.escapeXmlChars(this.m_strings!.getString(valueRaw)!);
        const obfuscatedValue: string | null =
          this.mAttrDecoder.decodeManifestAttr(valueData);
        if (!(value === null || obfuscatedValue === null)) {
          const slashPos: Int = toInt(value.lastIndexOf('/'));

          if (slashPos !== -1) {
            // Handle a value with a format of "@yyy/xxx"
            const dir: string = value.substring(0, slashPos);
            value = dir + '/' + obfuscatedValue;
          } else if (value !== obfuscatedValue) {
            value = obfuscatedValue;
          }
        }

        return this.mAttrDecoder.decode(
          valueType,
          valueData,
          value,
          this.getAttributeNameResource(index)
        );
      } catch (ex) {
        this.setFirstError(ex as AndrolibException);
        console.warn(
          `Could not decode attr value, using undecoded value instead: ns=${this.getAttributePrefix(
            index
          )!}, name=${this.getAttributeName(
            index
          )}, value=0x${valueData.toString(16)}\n${
            (ex as AndrolibException).stack ?? ''
          }`
        );
      }
    }
    return TypedValue.coerceToString(valueType, valueData);
  }

  public getAttributeBooleanValueByIndex(index: Int, defaultValue: boolean): boolean {
    return this.getAttributeIntValueByIndex(index, defaultValue ? toInt(1) : toInt(0)) !== 0;
  }

  public getAttributeFloatValueByIndex(index: Int, defaultValue: Float): Float {
    const offset: Int = this.getAttributeOffset(index);
    const valueType: Int = this.m_attributes![offset + XmlPullParser.ATTRIBUTE_IX_VALUE_TYPE];
    if (valueType === TypedValue.TYPE_FLOAT) {
      const valueData: Int = this.m_attributes![offset + XmlPullParser.ATTRIBUTE_IX_VALUE_DATA];
      return NumberUtil.intBitsToFloat(valueData);
    }
    return defaultValue;
  }

  public getAttributeIntValueByIndex(index: Int, defaultValue: Int): Int {
    const offset: Int = this.getAttributeOffset(index);
    const valueType: Int = this.m_attributes![offset + XmlPullParser.ATTRIBUTE_IX_VALUE_TYPE];
    if (valueType >= TypedValue.TYPE_FIRST_INT && valueType <= TypedValue.TYPE_LAST_INT) {
      return this.m_attributes![offset + XmlPullParser.ATTRIBUTE_IX_VALUE_DATA];
    }
    return defaultValue;
  }

  public getAttributeUnsignedIntValueByIndex(index: Int, defaultValue: Int): Int {
    return this.getAttributeIntValueByIndex(index, defaultValue);
  }

  public getAttributeResourceValueByIndex(index: Int, defaultValue: Int): Int {
    const offset: Int = this.getAttributeOffset(index);
    const valueType: Int = this.m_attributes![offset + XmlPullParser.ATTRIBUTE_IX_VALUE_TYPE];
    if (valueType === TypedValue.TYPE_REFERENCE) {
      return this.m_attributes![offset + XmlPullParser.ATTRIBUTE_IX_VALUE_DATA];
    }
    return defaultValue;
  }

  public getAttributeValue(namespace: string, attribute: string): string | null {
    const index: Int = this.findAttribute(namespace, attribute);
    if (index === -1) {
      return '';
    }
    return this.getAttributeValueByIndex(index);
  }

  public getAttributeBooleanValue(namespace: string, attribute: string, defaultValue: boolean): boolean {
    const index: Int = this.findAttribute(namespace, attribute);
    if (index === -1) {
      return defaultValue;
    }
    return this.getAttributeBooleanValueByIndex(index, defaultValue);
  }

  public getAttributeFloatValue(namespace: string, attribute: string, defaultValue: Float): Float {
    const index: Int = this.findAttribute(namespace, attribute);
    if (index === -1) {
      return defaultValue;
    }
    return this.getAttributeFloatValueByIndex(index, defaultValue);
  }

  public getAttributeIntValue(namespace: string, attribute: string, defaultValue: Int): Int {
    const index: Int = this.findAttribute(namespace, attribute);
    if (index === -1) {
      return defaultValue;
    }
    return this.getAttributeIntValueByIndex(index, defaultValue);
  }

  public getAttributeUnsignedIntValue(namespace: string, attribute: string, defaultValue: Int): Int {
    const index: Int = this.findAttribute(namespace, attribute);
    if (index === -1) {
      return defaultValue;
    }
    return this.getAttributeUnsignedIntValueByIndex(index, defaultValue);
  }

  public getAttributeResourceValue(namespace: string, attribute: string, defaultValue: Int): Int {
    const index: Int = this.findAttribute(namespace, attribute);
    if (index === -1) {
      return defaultValue;
    }
    return this.getAttributeResourceValueByIndex(index, defaultValue);
  }

  public getAttributeListValueByIndex(index: Int, options: string[], defaultValue: Int): Int {
    // TODO implement
    return toInt(0);
  }

  public getAttributeListValue(namespace: string, attribute: string, options: string[], defaultValue: Int): Int {
    // TODO implement
    return toInt(0);
  }

  public getAttributeType(index: Int): string {
    return 'CDATA';
  }

  public isAttributeDefault(index: Int): boolean {
    return false;
  }

  // ///////////////////////////////// dummies
  public setInput(stream: Readable, inputEncoding: string): void {
    void this.open(stream);
  }

  public setInputReader(reader: SmartBuffer): void {
    throw new Error(AXmlResourceParser.E_NOT_SUPPORTED);
  }

  public getInputEncoding(): string | null {
    return null;
  }

  public getColumnNumber(): Int {
    return toInt(-1);
  }

  public isEmptyElementTag(): boolean {
    return false;
  }

  public isWhitespace(): boolean {
    return false;
  }

  public defineEntityReplacementText(entityName: string, replacementText: string): void {
    throw new Error(AXmlResourceParser.E_NOT_SUPPORTED);
  }

  public getNamespaceByPrefix(prefix: string) {
    throw new Error(AXmlResourceParser.E_NOT_SUPPORTED);
  }

  public getProperty(name: string): Object | null {
    return null;
  }

  public setProperty(name: string, value: Object | null): void {
    throw new Error(AXmlResourceParser.E_NOT_SUPPORTED);
  }

  public getFeature(feature: string): boolean {
    return false;
  }

  public setFeature(name: string, value: boolean): void {
    throw new Error(AXmlResourceParser.E_NOT_SUPPORTED);
  }

  // /////////////////////////////////////////// implementation
  private getAttributeOffset(index: Int): Int {
    if (this.m_event !== XmlPullParser.START_TAG) {
      throw new Error('Current event is not START_TAG.');
    }
    const offset: Int = toInt(index * XmlPullParser.ATTRIBUTE_LENGTH);
    if (offset >= this.m_attributes!.length) {
      throw new Error(`Invalid attribute index (${index}).`)
    }
    return offset;
  }

  private findAttribute(namespace: string | null, attribute: string | null): Int {
    if (this.m_strings! === null || attribute === null) {
      return toInt(-1);
    }
    const name: Int = this.m_strings.find(attribute);
    if (name === -1) {
      return toInt(-1);
    }
    const uri: Int = (namespace !== null) ? this.m_strings.find(namespace) : toInt(-1);
    for (let o = 0; o !== this.m_attributes!.length; o += XmlPullParser.ATTRIBUTE_LENGTH) {
      if (name === this.m_attributes![o + XmlPullParser.ATTRIBUTE_IX_NAME] && (uri === -1 || uri === this.m_attributes![o + XmlPullParser.ATTRIBUTE_IX_NAMESPACE_URI])) {
        return toInt(o / XmlPullParser.ATTRIBUTE_LENGTH);
      }
    }
    return toInt(-1);
  }

  private resetEventInfo(): void {
    this.m_event = toInt(-1);
    this.m_lineNumber = toInt(-1);
    this.m_name = toInt(-1);
    this.m_namespaceUri = toInt(-1);
    this.m_attributes = null;
    this.m_idAttribute = toInt(-1);
    this.m_classAttribute = toInt(-1);
    this.m_styleAttribute = toInt(-1);
  }

  private doNext(): void {
    // Delayed initialization.
    if (this.m_strings! === null) {
      const got: Int = toInt(this.m_reader!.readInt32LE());
      if (got !== AXmlResourceParser.CHUNK_AXML_FILE && got !== AXmlResourceParser.CHUNK_AXML_FILE_BROKEN) {
        throw new Error(`Expected: 0x${AXmlResourceParser.CHUNK_AXML_FILE.toString(16)} or 0x${AXmlResourceParser.CHUNK_AXML_FILE_BROKEN.toString(16)}, got: ${got.toString(16)}`)
      }

      /*
       * chunkSize
       */
      this.m_reader!.readInt32LE();
      this.m_strings = StringBlock.read(this.m_reader!);
      this.m_namespaces.increaseDepth();
      this.m_operational = true;
    }

    if (this.m_event === XmlPullParser.END_DOCUMENT) {
      return;
    }

    while (true) {
      if (this.m_decreaseDepth) {
        this.m_decreaseDepth = false;
        this.m_namespaces.decreaseDepth();
      }

      // Fake END_DOCUMENT event
      if (XmlPullParser.event === XmlPullParser.END_TAG && this.m_namespaces.getDepth() === 1 && this.m_namespaces.getCurrentCount() === 0) {
        this.m_event = XmlPullParser.END_DOCUMENT;
        break;
      }

      let chunkType: Int;
      if (XmlPullParser.event === XmlPullParser.START_DOCUMENT) {
        // fake event, see CHUNK_XML_START_TAG handler.
        chunkType = AXmlResourceParser.CHUNK_XML_START_TAG;
      } else {
        chunkType = toInt(this.m_reader!.readInt32LE());
      }

      if (chunkType === AXmlResourceParser.CHUNK_RESOURCEIDS) {
        const chunkSize: Int = toInt(this.m_reader!.readInt32LE());
        if (chunkSize < 8 || (chunkSize % 4) !== 0) {
          throw new Error(`Invalid resource ids size (${chunkSize}).`)
        }
        for (let i = 0; i <= chunkSize / 4 - 2; i++) {
          this.m_resourceIDs!.push(toInt(this.m_reader!.readInt32LE()));
        }
        continue;
      }

      if (chunkType < AXmlResourceParser.CHUNK_XML_FIRST || chunkType > AXmlResourceParser.CHUNK_XML_LAST) {
        throw new Error(`Invalid chunk type (${chunkType}).`)
      }

      // Fake START_DOCUMENT event.
      if (chunkType === AXmlResourceParser.CHUNK_XML_START_TAG && XmlPullParser.event === -1) {
        this.m_event = XmlPullParser.START_DOCUMENT;
        break;
      }

      // Common header.
      /* chunkSize */this.m_reader!.readInt32LE();
      const lineNumber: Int = toInt(this.m_reader!.readInt32LE());
      /* 0xFFFFFFFF */this.m_reader!.readInt32LE();

      if (chunkType === AXmlResourceParser.CHUNK_XML_START_NAMESPACE || chunkType === AXmlResourceParser.CHUNK_XML_END_NAMESPACE) {
        if (chunkType === AXmlResourceParser.CHUNK_XML_START_NAMESPACE) {
          const prefix: Int = toInt(this.m_reader!.readInt32LE());
          const uri: Int = toInt(this.m_reader!.readInt32LE());
          this.m_namespaces.push(prefix, uri);
        } else {
          /* prefix */this.m_reader!.readInt32LE();
          /* uri */this.m_reader!.readInt32LE();
          this.m_namespaces.pop();
        }
        continue;
      }

      this.m_lineNumber = lineNumber;

      if (chunkType === AXmlResourceParser.CHUNK_XML_START_TAG) {
        this.m_namespaceUri = toInt(this.m_reader!.readInt32LE());
        this.m_name = toInt(this.m_reader!.readInt32LE());
        /* flags? */this.m_reader!.readInt32LE();
        let attributeCount = this.m_reader!.readInt32LE();
        this.m_idAttribute = toInt((attributeCount >>> 16) - 1);
        attributeCount &= 0xFFFF;
        this.m_classAttribute = toInt(this.m_reader!.readInt32LE());
        this.m_styleAttribute = toInt((this.m_classAttribute >>> 16) - 1);
        this.m_classAttribute = toInt((this.m_classAttribute & 0xFFFF) - 1);
        for (let i = 0; i <= attributeCount * XmlPullParser.ATTRIBUTE_LENGTH; i++) {
          this.m_attributes!.push(toInt(this.m_reader!.readInt32LE()));
        }
        for (let i = XmlPullParser.ATTRIBUTE_IX_VALUE_TYPE; i < this.m_attributes!.length;) {
          this.m_attributes![i] = toInt((this.m_attributes![i] >>> 24));
          i += XmlPullParser.ATTRIBUTE_LENGTH;
        }
        this.m_namespaces.increaseDepth();
        this.m_event = XmlPullParser.START_TAG;
        break;
      }

      if (chunkType === AXmlResourceParser.CHUNK_XML_END_TAG) {
        this.m_namespaceUri = toInt(this.m_reader!.readInt32LE());
        this.m_name = toInt(this.m_reader!.readInt32LE());
        this.m_event = XmlPullParser.END_TAG;
        this.m_decreaseDepth = true;
        break;
      }

      if (chunkType === AXmlResourceParser.CHUNK_XML_TEXT) {
        this.m_name = toInt(this.m_reader!.readInt32LE());
        /* ? */this.m_reader!.readInt32LE();
        /* ? */this.m_reader!.readInt32LE();
        this.m_event = XmlPullParser.TEXT;
        break;
      }
    }
  }

  private setFirstError(ex: AndrolibException): void {
    if (this.mFirstError === null) {
      this.mFirstError = ex;
    }
  }

  // ///////////////////////////////// data
  /*
   * All values are essentially indices, e.g. m_name is an index of name in
   * m_strings.
   */

  private m_reader: SmartBuffer | null;
  private mAttrDecoder: ResAttrDecoder;
  private mFirstError: AndrolibException;

  private m_operational: boolean = false;
  private m_strings: StringBlock | null;
  private m_resourceIDs: Int[] | null;
  private readonly m_namespaces: NamespaceStack = new NamespaceStack();
  private readonly android_ns: string = 'http://schemas.android.com/apk/res/android';
  private m_decreaseDepth: boolean;
  private m_event: Int;
  private m_lineNumber: Int;
  private m_name: Int;
  private m_namespaceUri: Int;
  private m_attributes: Int[] | null;
  private m_idAttribute: Int;
  private m_classAttribute: Int;
  private m_styleAttribute: Int;

  private static readonly E_NOT_SUPPORTED: string = 'Method is not supported.';
  private static readonly ATTRIBUTE_IX_NAMESPACE_URI: Int = toInt(0);
  private static readonly ATTRIBUTE_IX_NAME: Int = toInt(1);
  private static readonly ATTRIBUTE_IX_VALUE_STRING: Int = toInt(2);
  private static readonly ATTRIBUTE_IX_VALUE_TYPE: Int = toInt(3);
  private static readonly ATTRIBUTE_IX_VALUE_DATA: Int = toInt(4);
  private static readonly ATTRIBUTE_LENGTH: Int = toInt(5);

  private static readonly CHUNK_AXML_FILE: Int = toInt(0x00080003);
  private static readonly CHUNK_AXML_FILE_BROKEN: Int = toInt(0x00080001);
  private static readonly CHUNK_RESOURCEIDS: Int = toInt(0x00080180);
  private static readonly CHUNK_XML_FIRST: Int = toInt(0x00100100);
  private static readonly CHUNK_XML_START_NAMESPACE: Int = toInt(0x00100100);
  private static readonly CHUNK_XML_END_NAMESPACE: Int = toInt(0x00100101);
  private static readonly CHUNK_XML_START_TAG: Int = toInt(0x00100102);
  private static readonly CHUNK_XML_END_TAG: Int = toInt(0x00100103);
  private static readonly CHUNK_XML_TEXT: Int = toInt(0x00100104);
  private static readonly CHUNK_XML_LAST: Int = toInt(0x00100104);

  private static readonly PRIVATE_PKG_ID: Int = toInt(0x7F);
}

async function stream2buffer(stream: Stream): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const _buf = Array<any>();
    stream.on('data', (chunk: any) => _buf.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(_buf)));
    stream.on('error', (err: Error) => reject(err));
  });
}

class NamespaceStack {
  private m_data: Int[];
  private m_dataLength: Int;
  private m_depth: Int;

  constructor() {
    this.m_data = new Array<Int>(32);
  }

  public reset(): void {
    this.m_dataLength = toInt(0);
    this.m_depth = toInt(0);
  }

  public getCurrentCount(): Int {
    if (this.m_dataLength === 0) {
      return toInt(0);
    }
    const offset: Int = toInt(this.m_dataLength - 1);
    return this.m_data[offset];
  }

  public getAccumulatedCount(depth: Int): Int {
    if (this.m_dataLength === 0 || depth < 0) {
      return toInt(0);
    }
    if (depth > this.m_depth) {
      depth = this.m_depth;
    }
    let accumulatedCount = 0;
    let offset = 0;
    for (; depth !== 0; --depth) {
      const count = this.m_data[offset];
      accumulatedCount += count;
      offset += 2 + count * 2;
    }
    return toInt(accumulatedCount);
  }

  public push(prefix: Int, uri: Int): void {
    if (this.m_depth === 0) {
      this.increaseDepth();
    }
    this.ensureDataCapacity(2);
    const offset = this.m_dataLength - 1;
    const count = this.m_data[offset];
    this.m_data[offset - 1 - count * 2] = toInt(count + 1);
    this.m_data[offset] = prefix;
    this.m_data[offset + 1] = uri;
    this.m_data[offset + 2] = toInt(count + 1);
    this.m_dataLength = toInt(this.m_dataLength + 2);
  }

  public pop(): boolean {
    if (this.m_dataLength === 0) {
      return false;
    }
    let offset = this.m_dataLength - 1;
    let count = this.m_data[offset] as number;
    if (count === 0) {
      return false;
    }
    count -= 1;
    offset -= 2;
    this.m_data[offset] = toInt(count);
    offset -= 1 + count * 2;
    this.m_data[offset] = toInt(count);
    this.m_dataLength = toInt(this.m_dataLength + 2);
    return true;
  }

  public getPrefix(index: Int): Int {
    return this.get(index, true);
  }

  public getUri(index: Int): Int {
    return this.get(index, false);
  }

  public findPrefix(uri: Int): Int {
    return this.get(uri, true);
  }

  public getDepth(): Int {
    return this.m_depth
  }

  public increaseDepth(): void {
    this.ensureDataCapacity(2);
    const offset = this.m_dataLength;
    this.m_data[offset] = toInt(0);
    this.m_data[offset + 1] = toInt(0);
    this.m_dataLength = toInt(this.m_dataLength + 2);
    this.m_depth += 1;
  }

  public decreaseDepth(): void {
    if (this.m_dataLength === 0) {
      return;
    }
    const offset = this.m_dataLength - 1;
    const count = this.m_data[offset];
    if ((offset - 1 - count * 2) === 0) {
      return;
    }
    this.m_dataLength = toInt(this.m_dataLength - (2 + count * 2));
    this.m_depth = toInt(this.m_depth - 1);
  }

  private ensureDataCapacity(capacity: Int): void {
    const available = (this.m_data.length - this.m_dataLength);
    if (available > capacity) {
      return;
    }
    const newLength = (this.m_data.length + available) * 2;
    this.m_data.length = newLength;
  }

  private find(prefixOrUri: Int, prefix: boolean): Int {
    if (this.m_dataLength === 0) {
      return toInt(-1);
    }
    let offset = this.m_dataLength - 1;
    for (let i = this.m_depth; i !== 0; --i) {
      let count = this.m_data[offset];
      offset -= 2;
      for (; count !== 0; --count) {
        if (prefix) {
          if (this.m_data[offset] === prefixOrUri) {
            return this.m_data[offset + 1];
          }
        } else {
          if (this.m_data[offset + 1] === prefixOrUri) {
            return this.m_data[offset];
          }
        }
        offset -= 2;
      }
    }
    return toInt(-1);
  }

  private get(index: Int, prefix: boolean): Int {
    if (this.m_dataLength === 0 || index < 0) {
      return toInt(-1);
    }
    let offset = 0;
    for (let i = this.m_depth; i !== 0; --i) {
      const count = this.m_data[offset];
      if (index >= count) {
        index = toInt(index - count);
        offset += (2 + count * 2);
        continue;
      }
      offset += (1 + index * 2);
      if (!prefix) {
        offset += 1;
      }
      return this.m_data[offset];
    }
    return toInt(-1);
  }
}
