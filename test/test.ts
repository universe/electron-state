/* global describe, it */
import { Application } from 'spectron';
import * as assert from 'assert';
import * as path from 'path';

describe('Application launch', function() {
  this.timeout(100000);

  beforeEach(function() {
    this.app = new Application({
      path: path.join(require.resolve('electron'), '../dist/Electron.app/Contents/MacOS/Electron'),
      args: [path.join(__dirname, 'app/main.js')],
    });
    return this.app.start();
  });

  afterEach(function() {
    if (this.app && this.app.isRunning()) {
      return this.app.stop();
    }
  });

  it('shows an initial window', function() {
    return this.app.client.getWindowCount().then(function(count: number) {
      assert.strictEqual(count, 1);
    });
  });
});
