describe('Plugin: shuffle mode', () => {
  let player;
  let app;

  before(() => {
    player = {
      onNext: Event.queue()
    };
    app = {
      curVid: { id: 0 },
      videos: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4, isDeleted: true }]
    };
  });

  it('returns a random video via onNext', function() {
    // .random() could serve back a sequential order by chance
    this.retries(3);

    require('./shuffle.js')({}, app, player);

    const ids = [];

    ids.push(player.onNext()[0].id);
    ids.push(player.onNext()[0].id);
    ids.push(player.onNext()[0].id);

    // assert this isn't the original videos order
    assert(ids.join('') !== '123');

    // assert that id:4 is not included
    (100).ea(() => ids.push(player.onNext()[0].id));
    assert(ids.join('').includes('4') === false);
  });
});
