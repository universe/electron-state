
import ElectronState, { main, renderer } from '../../src/index';

export default class TestState extends ElectronState {
  booleanValue = true;
  stringValue = '';
  numValue = 1;
  nullValue = null;

  @main static async multiplyInMain(val1: number, val2: number): Promise<number> {
    return val1 * val2;
  }

  @renderer static async multiplyInRenderer(val1: number, val2: number): Promise<number> {
    return val1 * val2;
  }
}
