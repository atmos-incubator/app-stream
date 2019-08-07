describe('Server Utility Functions', () => {
  const u = require('./util.js');
  let app;

  before(() => {
    app = {
      assetPath: io.path(__dirname, '../assets').valueOf()
    };
    u(app);
  });

  it('extends an app with utility functions', () => {
    assert(app.getAssetPath);
    assert(app.vids.isa('array'));
  });

  it('can load videos from our assetPath', () => {
    app.loadVideos();
    assert(app.vids.length > 0);
  });

  it('can return find videos by id', () => {
    app.loadVideos();
    const id = app.vids.last().id;
    assert.equal(app.getAsset(id).id, id);
  });

  it('can return an assets mp4 path', () => {
    app.loadVideos();
    assert.ok(app.getAssetPath(app.vids[1].id).endsWith('.mp4'));
    sandbox.stub(console, 'log');
    assert.bad(app.getAssetPath(''));
    assert.bad(app.getAssetPath('notrealid'));
  });

  it('loads plugins from plugin folder', () => {
    assert(Object.keys(app.pluginMap).length > 1);
    assert(isa(app.pluginMap['channel-surf'], 'function'));
  });
});
