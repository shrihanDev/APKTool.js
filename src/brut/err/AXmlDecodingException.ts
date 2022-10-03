import AndrolibException from 'brut/AndrolibException';

export default class AXmlDecodingException extends AndrolibException {
  constructor(message?: string) {
    super('AXmlDecodingException', message);
  }
}
