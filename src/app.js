require('@atmos-inc/io');

// Startup an express server
const app = require('@atmos-inc/express').init({
  basePath: io.path(__dirname, '..').valueOf(),
  openBrowser: process.argv.includes('open'),
  port: ea(process.argv, v => ea.exitIf(v.isNumeric(), v)).or(80)
});

// look through args for a path, or default to cwd
app.assetPath = process.argv
  .afterIdx(1)
  .ea(v => ea.exitIf(io.path(v).exists(), v))
  .or(process.cwd())
  .path();

// look for a 'stream' / 'assets' folder
['stream', 'assets'].ea(seg => {
  if (io.path(app.assetPath, seg).exists()) {
    ea.exit(app.assetPath.push(seg));
  }
});

// Extend app with some utility helpers
require('./util.js')(app, app.assetPath);

app.loadVideos();

// Load configuration for this stream
const appConfPath = io.file(app.assetPath, 'index.js');
// @TODO: require.catch(appConfPath.valueOf()).or({});
app.conf = appConfPath.exists() ? require(appConfPath.valueOf()) : {};

app.get('/config', (req, res) => {
  // Send the source of each registered plugin to the client
  res.send(
    ea(app.conf.plugins, (plugConf, key) => {
      // @TODO: ea.returnIf(app.pluginMap.has(key), { src ... });
      if (app.pluginMap.has(key)) {
        return { src: app.pluginMap[key], conf: plugConf };
      }
    }).or([]).stringify()
  );
});

app.post('/volume', (req, res, next) => {
  // @DOC: Allow adjusting the default volume for the video for normalized playback validate inputs
  if (!req.body.id || req.body.amt === undefined) return next();
  const conf = app.getAsset(req.body.id).conf;
  const amt = req.body.amt.toFloat();
  if (!conf || !amt.between(0, 1)) return next();
  // update data store
  io.file(conf).json((res, save) => {
    res.vol = amt;
    save();
  });
  res.ok();
});

app.get('/videos', (req, res) => {
  // @DOC: Get the list of videos provided on this stream
  app.loadVideos();
  res.json(app.vids);
});

app.get('/thumb', (req, res, next) => {
  // @DOC: Get a thumbnail for the queried video id
  const asset = app.getAsset(req.query.id);
  const fallback = io.path(__dirname, '../public/poster.png').valueOf();
  res.stream(io.path(asset.thumb).exists() ? asset.thumb : fallback);
});

app.get('/video', function(req, res, next) {
  // @DOC: Get a stream for a video by id (generally queried by html5 media element)
  const asset = app.getAssetPath(req.query.id);
  if (!asset) return alert('Video not found') && next();
  // @HACK: html5 video player can be a bit noisy.
  (() => log('playing ', asset)).onPause(1000);
  res.mp4(asset);
});

module.exports = app;
