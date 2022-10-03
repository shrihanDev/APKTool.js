import AndrolibException from 'brut/AndrolibException';

export default class OutDirExistsException extends AndrolibException {
  constructor(message?: string) {
    super('OutDirExistsException', message);
  }
}
