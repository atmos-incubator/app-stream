describe('Plugin: Channel Surf', () => {
  const mockPlayer = play => {
    const player = {
      play,
      isPlaying: () => player.play,
      next: sandbox.fake(),
      onPlay: Event.queue()
    };
    return player;
  };

  it('Periodically jumps to the next video', done => {
    const player = mockPlayer(true);
    require('./channel-surf.js')({ interval: 10 }, {}, player, {});

    player.onPlay();

    setTimeout(() => {
      assert.async(player.next.called, done);
    }, 30);
  });

  it('Does not resume playing if paused', done => {
    const player = mockPlayer(false);
    require('./channel-surf.js')({ interval: 10 }, {}, player, {});

    player.onPlay();

    setTimeout(() => {
      assert.async(player.next.notCalled, done);
    }, 60);
  });

  it('Defaults to every minute', () => {
    const player = mockPlayer(false);
    require('./channel-surf.js')({}, {}, player, {});
    assert(player.interval === 60000);
  });
});
