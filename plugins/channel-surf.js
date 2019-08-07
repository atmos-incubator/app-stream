// @DOC: Channel-surf plugin jumps to the next video on a regular interval.
// @CONFIG: channelSurf: 60
module.exports = (config, app, player) => {
  player.interval = config.interval || 60 * 1000;

  const checkNext = () => {
    if (player.isPlaying()) {
      player.next();
    }
  };

  player.onPlay(() => {
    // last vid, no need to click next
    setTimeout(checkNext, player.interval);
  });
};
