import AndrolibException from 'brut/AndrolibException';

export default class CantFind9PatchChunkException extends AndrolibException {
  constructor(message?: string) {
    super('CantFind9PatchChunkException', message);
  }
}
