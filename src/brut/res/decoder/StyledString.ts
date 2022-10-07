import { extendIterator } from 'iterable-has-next';
import { Int, toInt } from 'types/Int';
import ResXmlEncoders from '../xml/ResXmlEncoders';

export default class StyledString {
  private readonly mText: string;
  private readonly mSpans: Span[];

  constructor(text: string, spans: Span[]) {
    this.mText = text;
    this.mSpans = spans;
  }

  getText(): string {
    return this.mText;
  }

  getSpans(): Span[] {
    return this.mSpans;
  }

  public toString(): string {
    return new Decoder().decode(this);
  }
}

export class Span {
  private readonly tag: string;
  private readonly firstChar: Int;
  private readonly lastChar: Int;

  constructor(tag: string, firstChar: Int, lastChar: Int) {
    this.tag = tag;
    this.firstChar = firstChar;
    this.lastChar = lastChar;
  }

  public getTag(): string {
    return this.tag;
  }

  public getFirstChar(): Int {
    return this.firstChar;
  }

  public getLastChar(): Int {
    return this.lastChar;
  }

  public getName(): string {
    const separatorIdx = this.tag.indexOf(';');
    return separatorIdx === -1 ? this.tag : this.tag.substring(0, separatorIdx);
  }

  public getAttributes(): Map<string, string> | null {
    const separatorIdx = this.tag.indexOf(';');
    return separatorIdx === -1
      ? null
      : new Map<string, string>(
        ((): Array<[string, string]> => {
          const str = this.tag.substring(
            separatorIdx + 1,
            this.tag.endsWith(';') ? this.tag.length - 1 : this.tag.length
          );
          const obj: { [key: string]: string } = {};
          for (const entry of str.split(';')) {
            const pair = entry.split('=');
            obj[pair[0]] = pair[1];
          }
          return Object.entries(obj);
        })()
      );
  }

  public static compare(o1: Span, o2: Span): 0 | 1 | -1 {
    const res: { fc: 0 | 1 | -1; lc: 0 | 1 | -1; tag: 0 | 1 | -1 } = {
      fc: 0,
      lc: 0,
      tag: 0
    };

    if (o1.firstChar === o2.firstChar) {
      res.fc = 0;
    } else if (o1.firstChar < o2.firstChar) {
      res.fc = -1;
    } else if (o1.firstChar > o2.firstChar) {
      res.fc = 1;
    }

    if (o1.lastChar === o2.lastChar) {
      res.lc = 0;
    } else if (o1.lastChar < o2.lastChar) {
      res.lc = 1;
    } else if (o1.lastChar > o2.lastChar) {
      res.lc = -1;
    }

    if (o1.tag === o2.tag) {
      res.tag = 0;
    } else if (o1.tag.length < o2.tag.length) {
      res.tag = 1;
    } else if (o1.tag.length > o2.tag.length) {
      res.tag = -1;
    }

    if (res.fc !== 0) {
      return res.fc;
    }

    if (res.lc !== 0) {
      return res.lc;
    }

    return res.tag;
  }
}

class Decoder {
  private text: string;
  private xmlValue: string;
  private lastOffset: Int;

  public decode(styledString: StyledString): string {
    this.text = styledString.getText();
    this.xmlValue = '';
    this.lastOffset = toInt(0);

    // recurse top-level tags
    const it: PeekingIterator<Span> = styledString
      .getSpans()
      .entries() as unknown as PeekingIterator<Span>;
    while (it.hasNext()) {
      void this.decodeIterate(it);
    }

    // write the remaining encoded raw text
    if (this.lastOffset < this.text.length) {
      this.xmlValue += ResXmlEncoders.escapeXmlChars(
        this.text.substring(this.lastOffset)
      );
    }
    return this.xmlValue;
  }

  private async decodeIterate(it: PeekingIterator<Span>): Promise<void> {
    const span: Span = (await it.next()).value;
    const name: string = span.getName();
    const attributes: Map<string, string> | null = span.getAttributes();
    const spanStart = span.getFirstChar();
    const spanEnd = span.getLastChar() + 1;

    // write encoded raw text preceding the opening tag
    if (spanStart > this.lastOffset) {
      this.xmlValue += `${ResXmlEncoders.escapeXmlChars(
        this.text.substring(this.lastOffset, spanStart)
      )}`;
    }
    this.lastOffset = spanStart;

    // write opening tag
    this.xmlValue += `<${name}`;
    if (attributes !== null) {
      for (const attr of attributes) {
        this.xmlValue += ` ${attr[0]}="${ResXmlEncoders.escapeXmlChars(
          attr[1]
        )}"`;
      }
    }
    // if an opening tag is followed by a matching closing tag, write as an empty-element tag
    if (spanStart === spanEnd) {
      this.xmlValue += '/>';
      return;
    }
    this.xmlValue += '>';

    // recurse nested tags
    while (
      it.hasNext() &&
      (it.peek()!.value as Span).getFirstChar() < spanEnd
    ) {
      void this.decodeIterate(it);
    }

    // write encoded raw text preceding the closing tag
    if (spanEnd > this.lastOffset) {
      this.xmlValue += ResXmlEncoders.escapeXmlChars(
        this.text.substring(this.lastOffset, spanEnd)
      );
    }
    this.lastOffset = toInt(spanEnd);

    // write closing tag
    this.xmlValue += `</${name}>`;
  }
}

class PeekingIterator<T> implements AsyncIterableIterator<T> {
  private iterator: AsyncIterableIterator<T> & { hasNext: () => boolean };
  private nextVal: IteratorResult<T, any> | null;

  constructor(iterator: AsyncIterableIterator<T>) {
    void (async () => {
      this.iterator = await extendIterator(iterator);
      this.nextVal = await (this.iterator.hasNext()
        ? this.iterator.next()
        : null);
    })();
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    throw new Error('Method not implemented.');
  }

  return?(value?: any): Promise<IteratorResult<T, any>> {
    throw new Error('Method not implemented.');
  }

  throw?(e?: any): Promise<IteratorResult<T, any>> {
    throw new Error('Method not implemented.');
  }

  public peek(): IteratorResult<T, any> | null {
    return this.nextVal;
  }

  public next(...args: [] | [undefined]): Promise<IteratorResult<T, any>>;
  public async next(
    ..._whoCares: [] | [undefined]
  ): Promise<IteratorResult<T, any> | null> {
    const nVal: IteratorResult<T, any> | null = this.nextVal;
    this.nextVal = await (this.iterator.hasNext()
      ? this.iterator.next()
      : null);
    return nVal;
  }

  public hasNext(): boolean {
    return !(this.nextVal == null);
  }
}
