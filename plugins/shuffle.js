module.exports = (config, app, player, controls) => {
  player.onNext(() => {
    ea.exit(
      app.videos
        .ea(v => (!v.isDeleted && v.id !== (app.curVid || {}).id ? v : undefined))
        .random()
    );
  });
};
