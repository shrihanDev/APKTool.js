import UndefinedResObjectException from 'brut/err/UndefinedResObjectException';
import { Int } from 'types/Int';
import ResPackage from '../ResPackage';
import ResResSpec from '../ResResSpec';
import ResIdValue from './ResIdValue';
import ResIntValue from './ResIntValue';

export default class ResReferenceValue extends ResIntValue {
  private readonly mPackage: ResPackage;
  private readonly mTheme: boolean;

  constructor(
    package_: ResPackage,
    value: Int,
    rawValue: string,
    theme: boolean = false
  ) {
    super(value, rawValue, 'reference');
    this.mPackage = package_;
    this.mTheme = theme;
  }

  public override encodeAsResXml(): string {
    if (this.isNull()) {
      return '@null';
    }

    const spec: ResResSpec | null = this.getReferent();
    if (spec === null) {
      return '@null';
    }
    const newId: boolean =
      spec.hasDefaultResources() &&
      spec.getDefaultResource().getValue() instanceof ResIdValue;

    // generate the beginning to fix @android
    const mStart = (this.mTheme ? '?' : '@') + (newId ? '+' : '');

    return (
      mStart +
      spec.getFullNameRTP(
        this.mPackage,
        this.mTheme && spec.getType().getName() === 'attr'
      )
    );
  }

  public getReferent(): ResResSpec | null {
    try {
      return this.mPackage.getResTable().getResSpec(this.getValue());
    } catch (ex) {
      if (ex instanceof UndefinedResObjectException) {
        return null;
      }
    }
    return null;
  }

  public isNull(): boolean {
    return this.mValue === 0;
  }

  public referentIsNull(): boolean {
    return this.getReferent() === null;
  }
}
