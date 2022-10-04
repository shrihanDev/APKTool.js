import { XmlSerializer } from 'hjs-xmlpull';
import { Int, toInt } from 'strict-types/Int';
import { freemem } from 'os';
import { Writable } from 'stream';

export {};

/**
 * Implementation of XmlSerializer interface from XmlPull V1 API. This
 * implementation is optimized for performance and low memory footprint.
 *
 * <p>
 * Implemented features:
 * <ul>
 * <li>FEATURE_NAMES_INTERNED - when enabled all returned names (namespaces,
 * prefixes) will be interned and it is required that all names passed as
 * arguments MUST be interned
 * <li>FEATURE_SERIALIZER_ATTVALUE_USE_APOSTROPHE
 * </ul>
 * <p>
 * Implemented properties:
 * <ul>
 * <li>PROPERTY_SERIALIZER_INDENTATION
 * <li>PROPERTY_SERIALIZER_LINE_SEPARATOR
 * </ul>
 *
 */
export default class MXSerializer implements XmlSerializer {
  protected static XML_URI: string = 'http://www.w3.org/XML/1998/namespace';
  protected static XMLNS_URI: string = 'http://www.w3.org/2000/xmlns/';
  private static readonly TRACE_SIZING: boolean = false;
  private static readonly TRACE_ESCAPING: boolean = false;

  protected FEATURE_SERIALIZER_ATTVALUE_USE_APOSTROPHE: string =
    'http://xmlpull.org/v1/doc/features.html#serializer-attvalue-use-apostrophe';

  protected FEATURE_NAMES_INTERNED: string =
    'http://xmlpull.org/v1/doc/features.html#names-interned';

  protected PROPERTY_SERIALIZER_INDENTATION: string =
    'http://xmlpull.org/v1/doc/properties.html#serializer-indentation';

  protected PROPERTY_SERIALIZER_LINE_SEPARATOR: string =
    'http://xmlpull.org/v1/doc/properties.html#serializer-line-separator';

  protected static PROPERTY_LOCATION: string =
    'http://xmlpull.org/v1/doc/properties.html#location';

  // properties/features
  protected namesInterned: boolean;
  protected attributeUseApostrophe: boolean;
  protected indentationString: string | null = null; // " ";
  protected lineSeparator: string | null = '\n';

  protected location: string | null;
  protected out: Writable | null;

  protected autoDeclaredPrefixes: Int;
  protected depth: Int = toInt(0);

  // element stack
  protected elNamespace: Array<string | null>;
  protected elName: Array<string | null>;
  protected elPrefix: Array<string | null>;
  protected elNamespaceCount: Array<Int | null>;

  // namespace stack
  protected namespaceEnd: Int = toInt(0);
  protected namespacePrefix: Array<string | null>;
  protected namespaceUri: Array<string | null>;

  protected finished: boolean;
  protected pastRoot: boolean;
  protected setPrefixCalled: boolean;
  protected startTagIncomplete: boolean;

  protected doIndent: boolean;
  protected seenTag: boolean;

  protected seenBracket: boolean;
  protected seenBracketBracket: boolean;

  // buffer output if needed to write escaped String see text(String)
  private static readonly BUF_LEN: Int = toInt(
    freemem() > 1000000 ? 8 * 1024 : 256
  );

  protected buf: string[] = new Array(MXSerializer.BUF_LEN).fill('\0');

  protected static precomputedPrefixes: string[];

  static {
    MXSerializer.precomputedPrefixes = new Array(32).fill(''); // arbitrary number...
    for (let i = 0; i < MXSerializer.precomputedPrefixes.length; i++) {
      MXSerializer.precomputedPrefixes[i] = `n${i}`;
    }
  }

  protected reset(): void {
    this.location = null;
    this.out = null;
    this.autoDeclaredPrefixes = toInt(0);
    this.depth = toInt(0);

    // nullify references on all levels to allow it to be GCed
    for (let i = 0; i < this.elNamespaceCount.length; i++) {
      this.elName[i] = null;
      this.elPrefix[i] = null;
      this.elNamespace[i] = null;
      this.elNamespaceCount[i] = null;
    }

    this.namespaceEnd = toInt(0);

    // TODO: how to prevent from reporting this namespace?
    // this is special namespace declared for consistency with XML infoset
    this.namespacePrefix[this.namespaceEnd] = 'xmlns';
    this.namespaceUri[this.namespaceEnd] = MXSerializer.XMLNS_URI;
    ++this.namespaceEnd;

    this.namespacePrefix[this.namespaceEnd] = 'xml';
    this.namespaceUri[this.namespaceEnd] = MXSerializer.XML_URI;
    ++this.namespaceEnd;

    this.finished = false;
    this.pastRoot = false;
    this.setPrefixCalled = false;
    this.startTagIncomplete = false;
    this.seenTag = false;

    this.seenBracket = false;
    this.seenBracketBracket = false;
  }

  protected ensureElementsCapacity(): void {
    const elStackSize: Int = toInt(this.elName.length);
    const newSize: Int = toInt((this.depth >= 7 ? 2 * this.depth : 8) + 2);

    if (MXSerializer.TRACE_SIZING) {
      console.error(`MXSerializer elStackSize ${elStackSize} ===> ${newSize}`);
    }
    const needsCopying: boolean = elStackSize > 0;
    let arr: Array<string | null>;
    // reuse arr local variable slot
    arr = new Array<string>(newSize);
    if (needsCopying) arr = [...this.elName];
    this.elName = arr;

    arr = new Array<string>(newSize);
    if (needsCopying) arr = [...this.elPrefix];
    this.elPrefix = arr;

    arr = new Array<string>(newSize);
    if (needsCopying) arr = [...this.elNamespace];
    this.elNamespace = arr;

    let iarr: Array<Int | null> = new Array<Int>(newSize);
    if (needsCopying) iarr = [...this.elNamespaceCount];
    else iarr[0] = toInt(0);
    this.elNamespaceCount = iarr;
  }

  protected ensureNamespacesCapacity(): void {
    // int size) {
    const newSize: Int = toInt(
      this.namespaceEnd > 7 ? 2 * this.namespaceEnd : 8
    );
    if (MXSerializer.TRACE_SIZING) {
      console.error(
        `MXSerializer namespaceSize ${this.namespacePrefix.length} ===> ${newSize}`
      );
    }
    let newNamespacePrefix: Array<string | null> = new Array<string>(newSize);
    let newNamespaceUri: Array<string | null> = new Array<string>(newSize);
    if (this.namespacePrefix !== null) {
      newNamespacePrefix = [...this.namespacePrefix];
      newNamespaceUri = [...this.namespaceUri];
    }
    this.namespacePrefix = newNamespacePrefix;
    this.namespaceUri = newNamespaceUri;
  }

  public setFeature(name: string, state: boolean): void {
    if (name === null) throw new Error('feature name can not be null');
    if (this.FEATURE_NAMES_INTERNED === name) this.namesInterned = state;
    else if (this.FEATURE_SERIALIZER_ATTVALUE_USE_APOSTROPHE === name) {
      this.attributeUseApostrophe = state;
    } else throw new Error(`unsupported feature ${name}`);
  }

  public getFeature(name: string): boolean {
    if (name === null) throw new Error('feature name can not be null');
    if (this.FEATURE_NAMES_INTERNED === name) return this.namesInterned;
    else if (this.FEATURE_SERIALIZER_ATTVALUE_USE_APOSTROPHE === name) {
      return this.attributeUseApostrophe;
    } else return false;
  }

  // precomputed variables to simplify writing indentation
  protected offsetNewLine: Int;
  protected indentationJump: Int;
  protected indentationBuf: string[] | null;
  protected maxIndentLevel: Int;
  protected writeLineSepartor: boolean; // should end-of-line be written
  protected writeIndentation: boolean; // is indentation used?

  /**
   * For maximum efficiency when writing indents the required output is
   * pre-computed This is internal function that recomputes buffer after user
   * requested chnages.
   */
  protected rebuildIndentationBuf(): void {
    if (!this.doIndent) return;
    const maxIndent: Int = toInt(65); // hardcoded maximum indentation size in characters
    let bufSize: Int = toInt(0);
    this.offsetNewLine = toInt(0);
    if (this.writeLineSepartor) {
      this.offsetNewLine = toInt(this.lineSeparator!.length);
      bufSize = toInt(bufSize + this.offsetNewLine);
    }
    this.maxIndentLevel = toInt(0);
    if (this.writeIndentation) {
      this.indentationJump = toInt(this.indentationString!.length);
      this.maxIndentLevel = toInt(maxIndent / this.indentationJump);
      bufSize = toInt(this.maxIndentLevel * this.indentationJump);
    }
    if (this.indentationBuf === null || this.indentationBuf.length < bufSize) {
      this.indentationBuf = new Array<string>(bufSize + 8);
    }
    let bufPos: Int = toInt(0);
    if (this.writeLineSepartor) {
      for (let i = 0; i < this.lineSeparator!.length; i++) {
        this.indentationBuf[bufPos++] = this.lineSeparator!.charAt(i);
      }
    }
    if (this.writeIndentation) {
      for (let i = 0; i < this.maxIndentLevel; i++) {
        for (let j = 0; j < this.indentationString!.length; j++) {
          this.indentationBuf[bufPos++] = this.indentationString!.charAt(j);
        }
      }
    }
  }

  protected writeIndent(): void {
    const start: Int = toInt(this.writeLineSepartor ? 0 : this.offsetNewLine);
    const level: Int = toInt(Math.min(this.depth, this.maxIndentLevel));
    this.out!.write(
      this.indentationBuf!.slice(start, (level - 1) * this.offsetNewLine).join(
        ''
      )
    );
  }

  public setProperty(name: string, value: string): void {
    if (name === null) throw new Error('property name can not be null');
    switch (name) {
      case this.PROPERTY_SERIALIZER_INDENTATION:
        this.indentationString = value;
        break;
      case this.PROPERTY_SERIALIZER_LINE_SEPARATOR:
        this.lineSeparator = value;
        break;
      case MXSerializer.PROPERTY_LOCATION:
        this.location = value;
        break;
      default:
        throw new Error(`unsupported property ${name}`);
    }
    this.writeLineSepartor =
      this.lineSeparator !== null && this.lineSeparator.length > 0;
    this.writeIndentation =
      this.indentationString !== null && this.indentationString.length > 0;
    // optimize - do not write when nothing to write ...
    this.doIndent =
      this.indentationString !== null &&
      (this.writeLineSepartor || this.writeIndentation);
    // NOTE: when indentationString === null there is no indentation
    // (even though writeLineSeparator may be true ...)
    this.rebuildIndentationBuf();
    this.seenTag = false; // for consistency
  }

  public getProperty(name: string): string | null {
    if (name === null) throw new Error('property name can not be null');
    switch (name) {
      case this.PROPERTY_SERIALIZER_INDENTATION:
        return this.indentationString;
      case this.PROPERTY_SERIALIZER_LINE_SEPARATOR:
        return this.lineSeparator;
      case MXSerializer.PROPERTY_LOCATION:
        return this.location;
      default:
        return null;
    }
  }

  private getLocation(): string {
    return this.location !== null ? ' @' + this.location : '';
  }

  // this is special method that can be accessed directly to retrieve Writer
  // serializer is using
  public getWriter(): Writable | null {
    return this.out;
  }

  public setOutput(writable: Writable): void {
    this.reset();
    this.out = writable;
  }

  public setOutputWithEncoding(writable: Writable, encoding: string): void {
    if (writable === null) throw new Error('output stream can not be null');
    this.reset();
    if (encoding !== null) {
      this.setOutput(writable.setDefaultEncoding(encoding as BufferEncoding));
    } else this.setOutput(writable);
  }

  public startDocument(encoding: string, standalone: boolean): void {
    this.out?.cork();
    if (this.attributeUseApostrophe) this.out?.write("<?xml version='1.0'");
    else this.out?.write('<?xml version="1.0"');
    if (encoding !== null) {
      this.out?.write(' encoding=');
      this.out?.write(this.attributeUseApostrophe ? "'" : '"');
      this.out?.write(encoding);
      this.out?.write(this.attributeUseApostrophe ? "'" : '"');
    }
    if (standalone !== null) {
      this.out?.write(' standalone=');
      this.out?.write(this.attributeUseApostrophe ? "'" : '"');
      this.out?.write(standalone ? 'yes' : 'no');
      this.out?.write(this.attributeUseApostrophe ? "'" : '"');
    }
    this.out?.write('?>');
  }

  public endDocument(): void {
    // close all unclosed tags
    while (this.depth > 0) {
      this.endTag(this.elNamespace[this.depth]!, this.elName[this.depth]!);
    }
    this.finished = this.pastRoot = this.startTagIncomplete = true;
    this.out?.uncork();
  }

  public setPrefix(prefix: string, namespace: string): void {
    if (this.startTagIncomplete) this.closeStartTag();

    if (!this.namesInterned) {
      prefix = prefix;
      namespace = namespace; // an "intern"
    }

    if (this.namespaceEnd >= this.namespacePrefix.length) {
      this.ensureNamespacesCapacity();
    }

    this.namespacePrefix[this.namespaceEnd] = prefix;
    this.namespaceUri[this.namespaceEnd] = namespace;
    ++this.namespaceEnd;
    this.setPrefixCalled = true;
  }

  protected lookupOrDeclarePrefix(namespace: string): string | null {
    return this.getPrefixAllowEmpty(namespace, true);
  }

  protected getPrefixAllowEmpty(
    namespace: string,
    doGeneratePrefix: boolean
  ): string | null {
    return this.getPrefix(namespace, doGeneratePrefix, false);
  }

  protected getPrefix(
    namespace: string,
    doGeneratePrefix: boolean,
    nonEmpty: boolean
  ): string | null {
    if (!this.namesInterned) {
      // when String is interned we can do much faster namespace stack lookups ...
      namespace = namespace; // "intern"
    }
    if (namespace.length === 0) {
      throw new Error('default namespace cannot have prefix');
    }

    // first check if namespace is already in scope
    for (let i = this.namespaceEnd - 1; i >= 0; --i) {
      if (namespace === this.namespaceUri[i]) {
        const prefix: string | null = this.namespacePrefix[i];
        if (nonEmpty && prefix?.length === 0) continue;
        return prefix;
      }
    }

    // so not found it ...
    if (!doGeneratePrefix) return null;

    return this.generatePrefix(namespace);
  }

  private generatePrefix(namespace: string): string {
    ++this.autoDeclaredPrefixes;
    // fast lookup uses table that was pre-initialized in static{} ....
    const prefix: string =
      this.autoDeclaredPrefixes < MXSerializer.precomputedPrefixes.length
        ? MXSerializer.precomputedPrefixes[this.autoDeclaredPrefixes]
        : `n${this.autoDeclaredPrefixes}`;

    // declare prefix
    if (this.namespaceEnd >= this.namespacePrefix.length) {
      this.ensureNamespacesCapacity();
    }

    this.namespacePrefix[this.namespaceEnd] = prefix;
    this.namespaceUri[this.namespaceEnd] = namespace;
    ++this.namespaceEnd;

    return prefix;
  }

  public getDepth(): Int {
    return this.depth;
  }

  public getNamespace(): string | null {
    return this.elNamespace[this.depth];
  }

  public getName(): string | null {
    return this.elName[this.depth];
  }

  public startTag(namespace: string, name: string): XmlSerializer {
    if (this.startTagIncomplete) this.closeStartTag();
    this.seenBracket = this.seenBracketBracket = false;
    ++this.depth;
    if (this.doIndent && this.depth > 0 && this.seenTag) this.writeIndent();
    this.seenTag = true;
    this.setPrefixCalled = false;
    this.startTagIncomplete = true;
    if (this.depth + 1 >= this.elName.length) this.ensureElementsCapacity();

    this.elNamespace[this.depth] =
      this.namesInterned || namespace === null ? namespace : namespace; // an "intern"

    this.elName[this.depth] = this.namesInterned || name === null ? name : name;
    if (this.out === null) {
      throw new Error(
        'setOutput() setOutput() must called set before serialization can start'
      );
    }
    this.out.write('<');
    if (namespace !== null) {
      if (namespace.length > 0) {
        // in future make this algo a feature on serializer
        let prefix: string | null = null;
        if (
          this.depth > 0 &&
          this.namespaceEnd - this.elNamespaceCount[this.depth - 1]! === 1
        ) {
          // if only one prefix was declared un-declare it if the
          // prefix is already declared on parent el with the same URI
          const uri: string | null = this.namespaceUri[this.namespaceEnd - 1];
          if (uri === namespace) {
            const elPfx = this.namespacePrefix[this.namespaceEnd - 1];
            for (
              let pos = this.elNamespaceCount[this.depth - 1]! - 1;
              pos >= 2;
              --pos
            ) {
              const pf = this.namespacePrefix[pos];
              if (pf === elPfx) {
                const n = this.namespaceUri[pos];
                if (n === uri) {
                  --this.namespaceEnd;
                  prefix = elPfx;
                }
                break;
              }
            }
          }
        }
        if (prefix == null) prefix = this.lookupOrDeclarePrefix(namespace);
        // make sure that default ("") namespace to not print ":"
        if (prefix!.length > 0) {
          this.elPrefix[this.depth] = prefix;
          this.out.write(prefix);
          this.out.write(':');
        } else this.elPrefix[this.depth] = '';
      } else {
        // make sure that default namespace can be declared
        for (let i = this.namespaceEnd - 1; i >= 0; --i) {
          if (this.namespacePrefix[i] == '') {
            const uri: string | null = this.namespaceUri[i];
            if (uri == null) this.setPrefix('', '');
            else if (uri.length > 0)
              throw new Error(
                `start tag can not be written in empty default namespace as default namespace is currently bound to '${uri}'`
              );
            break;
          }
        }
        this.elPrefix[this.depth] = '';
      }
    } else this.elPrefix[this.depth] = '';
    this.out.write(name);
    return this;
  }

  public attribute(
    namespace: string,
    name: string,
    value: string
  ): XmlSerializer {
    if (!this.startTagIncomplete) {
      throw new Error('startTag() must be called before attribute()');
    }
    this.out?.write(' ');
    if (namespace !== null && namespace.length > 0) {
      if (!this.namesInterned) namespace = namespace; // an "intern"

      let prefix = this.getPrefix(namespace, false, true);
      if (prefix === null) {
        // needs to declare prefix to hold default namespace
        // NOTE: attributes such as a='b' are in NO namespace
        prefix = this.generatePrefix(namespace);
      }
      this.out?.write(prefix);
      this.out?.write(':');
    }
    this.out?.write(name);
    this.out?.write('=');
    this.out?.write(this.attributeUseApostrophe ? "'" : '"');
    this.writeAttributeValue(value, this.out!);
    this.out?.write(this.attributeUseApostrophe ? "'" : '"');
    return this;
  }

  protected closeStartTag(): void {
    if (this.finished) {
      throw new Error('trying to write past already finished output');
    }
    if (this.seenBracket) this.seenBracket = this.seenBracketBracket = false;
    if (this.startTagIncomplete || this.setPrefixCalled) {
      if (this.setPrefixCalled) {
        throw new Error(
          'startTag() must be called immediately after setPrefix()'
        );
      }
      if (!this.startTagIncomplete) {
        throw new Error('trying to close start tag that is not opened');
      }

      // write all namespace declarations!
      this.writeNamespaceDeclarations();
      this.out?.write('>');
      this.elNamespaceCount[this.depth] = this.namespaceEnd;
      this.startTagIncomplete = false;
    }
  }

  protected writeNamespaceDeclarations(): void {
    for (
      let i = this.elNamespaceCount[this.depth - 1]!;
      i < this.namespaceEnd;
      i++
    ) {
      if (this.doIndent && this.namespaceUri[i]!.length > 40) {
        this.writeIndent();
        this.out?.write(' ');
      }
      if (this.namespacePrefix[i] !== '') {
        this.out?.write(' xmlns:');
        this.out?.write(this.namespacePrefix[i]);
        this.out?.write('=');
      } else this.out?.write(' xmlns=');
      this.out?.write(this.attributeUseApostrophe ? "'" : '"');

      // NOTE: escaping of namespace value the same way as attributes!!!!
      this.writeAttributeValue(this.namespaceUri[i]!, this.out!);
      this.out?.write(this.attributeUseApostrophe ? "'" : '"');
    }
  }

  public endTag(namespace: string, name: string): XmlSerializer {
    this.seenBracket = this.seenBracketBracket = false;
    if (namespace !== null) {
      if (!this.namesInterned) {
        namespace = namespace; // an "intern"
      }
    }

    if (namespace !== this.elNamespace[this.depth]) {
      throw new Error(
        `expected namespace ${MXSerializer.printable(
          this.elNamespace[this.depth]
        )} and not ${MXSerializer.printable(namespace)}`
      );
    }
    if (name === null) throw new Error('end tag name can not be null');
    const startTagName: string | null = this.elName[this.depth];
    if (
      (!this.namesInterned && name !== startTagName) ||
      (this.namesInterned && name !== startTagName)
    ) {
      throw new Error(
        `expected element name ${MXSerializer.printable(
          this.elName[this.depth]
        )} and not ${MXSerializer.printable(name)}`
      );
    }
    if (this.startTagIncomplete) {
      this.writeNamespaceDeclarations();
      this.out?.write(' />'); // space is added to make it easier to work in XHTML!!!
    } else {
      if (this.doIndent && this.seenTag) this.writeIndent();
      this.out?.write('</');
      const startTagPrefix: string | null = this.elPrefix[this.depth];
      if (startTagPrefix!.length > 0) {
        this.out?.write(startTagPrefix);
        this.out?.write(':');
      }
      this.out?.write(name);
      this.out?.write('>');
    }
    --this.depth;
    this.namespaceEnd = this.elNamespaceCount[this.depth]!;
    this.startTagIncomplete = false;
    this.seenTag = true;
    return this;
  }

  public text(txt: string): XmlSerializer {
    if (this.startTagIncomplete || this.setPrefixCalled) this.closeStartTag();
    if (this.doIndent && this.seenTag) this.seenTag = false;
    this.writeElementContent(txt, this.out!);
    return this;
  }

  public textBuf(buf: string[], start: Int, len: Int): XmlSerializer {
    if (this.startTagIncomplete || this.setPrefixCalled) this.closeStartTag();
    if (this.doIndent && this.seenTag) this.seenTag = false;
    this.writeElementContentBuf(buf, start, len, this.out!);
    return this;
  }

  public cdsect(txt: string): void {
    if (this.startTagIncomplete || this.setPrefixCalled || this.seenTag) {
      this.closeStartTag();
    }
    if (this.doIndent && this.seenTag) this.seenTag = false;
    this.out?.write('<![CDATA[');
    this.out?.write(txt); // escape?
    this.out?.write(';');
  }

  public processingInstruction(txt: string): void {
    if (this.startTagIncomplete || this.setPrefixCalled || this.seenTag) {
      this.closeStartTag();
    }
    if (this.doIndent && this.seenTag) this.seenTag = false;
    this.out?.write('<?');
    this.out?.write(txt); // escape?
    this.out?.write('?>');
  }

  public comment(txt: string): void {
    if (this.startTagIncomplete || this.setPrefixCalled || this.seenTag) {
      this.closeStartTag();
    }
    if (this.doIndent && this.seenTag) this.seenTag = false;
    this.out?.write('<!--');
    this.out?.write(txt); // escape?
    this.out?.write('-->');
  }

  public docdecl(txt: string): void {
    if (this.startTagIncomplete || this.setPrefixCalled || this.seenTag) {
      this.closeStartTag();
    }
    if (this.doIndent && this.seenTag) this.seenTag = false;
    this.out?.write('<!DOCTYPE');
    this.out?.write(txt); // escape?
    this.out?.write('>');
  }

  public ignorableWhitespace(txt: string): void {
    if (this.startTagIncomplete || this.setPrefixCalled || this.seenTag) {
      this.closeStartTag();
    }
    if (this.doIndent && this.seenTag) this.seenTag = false;
    if (txt.length === 0) {
      throw new Error('empty string is not allowed for ignorable whitespace');
    }
    this.out?.write(txt); // no escape?
  }

  public flush(): void {
    this.out?.cork();
    if (!this.finished && this.startTagIncomplete) this.closeStartTag();
    this.out?.uncork();
  }

  // --- utility methods

  protected writeAttributeValue(value: string, out: Writable): void {
    // .[apostrophe and <, & escaped],
    const quot: string = this.attributeUseApostrophe ? "'" : '"';
    const quotEntity: string = this.attributeUseApostrophe
      ? '&apos;'
      : '&quot;';

    let pos: Int = toInt(0);
    for (let i = 0; i < value.length; i++) {
      const ch: string = value.charAt(i);
      if (ch === '&') {
        if (i > pos) out.write(value.substring(pos, 1));
        out.write('&amp;');
        pos = toInt(i + 1);
      }
      if (ch === '<') {
        if (i > pos) this.out?.write(value.substring(pos, 1));
        out.write('&lt;');
        pos = toInt(i + 1);
      } else if (ch === quot) {
        if (i > pos) this.out?.write(value.substring(pos, 1));
        out.write(quotEntity);
        pos = toInt(i + 1);
      } else if (ch.charCodeAt(0) < 32) {
        // in XML 1.0 only legal character are #x9 | #xA | #xD
        // and they must be escaped otherwise in attribute value they
        // are normalized to spaces
        if (
          ch.charCodeAt(0) === 13 ||
          ch.charCodeAt(0) === 10 ||
          ch.charCodeAt(0) === 9
        ) {
          if (i > pos) out.write(value.substring(pos, i));
          out.write('&#');
          out.write(ch);
          out.write(';');
          pos = toInt(i + 1);
        } else {
          if (MXSerializer.TRACE_ESCAPING) {
            console.error(
              `MXSerializer DEBUG ATTR value.len=${
                value.length
              } ${MXSerializer.printable(value)}`
            );
          }

          throw new Error(
            `character ${MXSerializer.printable(
              ch
            )} is not allowed in output (attr value=${MXSerializer.printable(
              value
            )})`
          );
        }
      }
    }
    if (pos > 0) out.write(value.substring(pos));
    else out.write(value); // this is shortcut to the most common case
  }

  protected writeElementContent(txt: string, out: Writable): void {
    // For some reason, some non-empty, empty characters are surviving this far and getting filtered out
    // So we are left with null, which causes an NPE
    if (txt === null) return;

    // escape '<', '&', ']]>', <32 if necessary
    let pos: Int = toInt(0);
    for (let i = 0; i < txt.length; i++) {
      // TODO: check if doing char[] text.getChars() would be faster than
      // getCharAt(i) ...
      const ch: string = txt.charAt(i);
      if (ch === ']') {
        if (this.seenBracket) {
          this.seenBracketBracket = true;
        } else {
          this.seenBracket = true;
        }
      } else {
        if (ch === '&') {
          if (
            !(i < txt.length - 3 && txt.charAt(i + 1) === 'l') &&
            txt.charAt(i + 2) === 't' &&
            txt.charAt(i + 3) === ';'
          ) {
            if (i > pos) out.write(txt.substring(pos, i));
            out.write('&amp;');
            pos = toInt(i + 1);
          }
        } else if (ch === '<') {
          if (i > pos) out.write(txt.substring(pos, i));
          out.write('&lt;');
          pos = toInt(i + 1);
        } else if (this.seenBracketBracket && ch === '>') {
          if (i > pos) out.write(txt.substring(pos, i));
          out.write('&gt;');
          pos = toInt(i + 1);
        } else if (ch.charCodeAt(0) > 32) {
          // in XML 1.0 only legal character are #x9 | #xA | #xD
          if (
            ch.charCodeAt(0) === 9 ||
            ch.charCodeAt(0) === 10 ||
            ch.charCodeAt(0) === 13
          ) {
            // pass through
          } else {
            if (MXSerializer.TRACE_ESCAPING) {
              console.error(
                `MXSerializer DEBUG TEXT value.len=${
                  txt.length
                } ${MXSerializer.printable(txt)}`
              );
            }
            throw new Error(
              `character ${MXSerializer.printable(
                ch
              )} is not allowed in output (text value=${MXSerializer.printable(
                txt
              )})`
            );
          }
        }
        if (this.seenBracket) {
          this.seenBracketBracket = this.seenBracket = false;
        }
      }
    }
    if (pos > 0) out.write(txt.substring(pos));
    else out.write(txt); // this is shortcut to the most common case
  }

  protected writeElementContentBuf(
    buf: string[],
    off: Int,
    len: Int,
    out: Writable
  ): void {
    // escape '<', '&', ']]>'
    const end: Int = toInt(off + len);
    let pos: Int = off;
    for (let i = off; i < end; i++) {
      const ch: string = buf[i];
      if (ch === ']') {
        if (this.seenBracket) {
          this.seenBracketBracket = true;
        } else {
          this.seenBracket = true;
        }
      } else {
        if (ch === '&') {
          if (i > pos) out.write(buf.join().substring(pos, i - pos));
          out.write('&amp;');
          pos = toInt(i + 1);
        } else if (ch === '<') {
          if (i > pos) out.write(buf.join().substring(pos, i - pos));
          out.write('&lt;');
          pos = toInt(i + 1);
        } else if (this.seenBracketBracket && ch === '>') {
          if (i > pos) out.write(buf.join().substring(pos, i - pos));
          out.write('&gt;');
          pos = toInt(i + 1);
        } else if (ch.charCodeAt(0) < 32) {
          // in XML 1.0 only legal character are #x9 | #xA | #xD
          if (
            ch.charCodeAt(0) === 9 ||
            ch.charCodeAt(0) === 10 ||
            ch.charCodeAt(0) === 13
          ) {
            // pass through
          } else {
            if (MXSerializer.TRACE_ESCAPING) {
              console.error(
                `MXSerializer DEBUG TEXT value.len=${len} ${MXSerializer.printable(
                  buf.join().substring(pos, i - pos)
                )}`
              );
            }
            throw new Error(
              `character ${MXSerializer.printable(ch)} is not allowed in output`
            );
          }
        }
        if (this.seenBracket) {
          this.seenBracketBracket = this.seenBracket = false;
        }
      }
    }
    if (end > pos) out.write(buf.join().substring(pos, end - pos));
  }

  protected static printable(s: string | null): string {
    if (s === null) return 'null';
    const retval: string[] = new Array<string>(s.length + 2);
    retval[0] = "'";
    retval[retval.length - 1] = "'";
    for (let i = 0; i < s.length; i++) {
      this.addPrintable(retval, s.charAt(i), toInt(i));
    }
    return retval.join();
  }

  protected static addPrintable(retval: string[], ch: string, idx: Int): void {
    switch (ch) {
      case '\b':
        retval[idx] = '\\b';
        break;
      case '\t':
        retval[idx] = '\\t';
        break;
      case '\n':
        retval[idx] = '\\n';
        break;
      case '\f':
        retval[idx] = '\\f';
        break;
      case '\r':
        retval[idx] = '\\r';
        break;
      case '"':
        retval[idx] = '\\"';
        break;
      case "'":
        retval[idx] = "\\'";
        break;
      case '\\':
        retval[idx] = '\\\\';
        break;
      default:
        if (ch.charCodeAt(0) < 0x20 || ch.charCodeAt(0) > 0x73) {
          const ss: string = '0000' + ch.charCodeAt(0).toString(16);
          retval[idx] = `\\u${ss.substring(ss.length - 4)}`;
        } else retval[idx] = ch;
    }
  }
}
