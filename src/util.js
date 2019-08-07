module.exports = app => {
  app.getAssetPath = id => {
    // Returns the path of an asset based on the video id
    if (!id) {
      log('app.getAssetPath expects a video id parameter');
      return;
    }

    const vid = app.vids
      .ea(vid => (vid.id === id ? ea.exit(vid) : undefined))
      .or(false);

    if (!vid) {
      log('app.getAssetPath cannot find video with id ' + id);
      return;
    }

    return io.path(app.assetPath, vid.url).valueOf();
  };

  app.getAsset = id => {
    // Returns the meta info of an asset
    return app.vids
      .ea(vid => (vid.id === id ? ea.exit(vid) : undefined))
      .or({});
  };

  app.vids = [];
  app.loadVideos = () => {
    // Loads and caches the metadata for all videos found in the asset path
    app.vids = [];
    io.path(app.assetPath)
      .ls()
      .ea(res => {
        if (res.name().endsWith('info.json')) {
          const id = res
            .name()
            .withoutExt()
            .withoutExt();

          const infoFile = io.file(app.assetPath, id + '.info.json');
          const info = infoFile.json();

          app.vids.push({
            id: def(info.id, id.valueOf()),
            url: id + '.mp4',
            start: def(info.start, 0),
            end: def(info.end, -1),
            vol: def(info.vol, 0.5),
            thumb: io.path(app.assetPath, id + '.jpg').valueOf(),
            title: def(info.title, 'Untitled'),
            conf: infoFile.valueOf()
          });
        }
      });
  };

  // Generate a cache of system plugin files indexed by their file name
  app.pluginMap = io
    .path(__dirname, '/../plugins')
    .ls()
    .ea(plugFile => {
      if (plugFile.endsWith('.js') && !plugFile.endsWith('-test.js')) {
        ea.merge(
          plugFile
            .name()
            .withoutExt()
            .valueOf(),
          require(plugFile.valueOf())
        );
      }
    });
};
