import BrutException from 'common/BrutException'

export default class TraversalUnknownFileException extends BrutException {
  constructor (message: string) {
    super(message)
  }
}
