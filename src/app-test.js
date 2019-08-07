describe('Application Server', () => {
  // bootstrap the app
  let app;

  before(() => {
    require('@atmos-inc/io');
    process.argv = ['', '', io.path(__dirname, '../').valueOf()];
    app = require('./app.js');
  });

  after(() => app.server.close());

  const request = require('supertest');

  it('accepts a get request for stream config', done => {
    request(app)
      .get('/config')
      .expect(res => {
        if (!res.text.parse().length) throw new Error('missing config');
      })
      .expect(200, done);
  });

  it('accepts a post request to volume route', done => {
    request(app)
      .post('/volume')
      .send({ id: app.vids[0].id, amt: '0.003' })
      .expect(res => {
        if (app.vids[0].vol !== 0.003) throw new Error('volume not updated');
      })
      .expect(200, done);
  });

  it('fails if volume post is malformed', done => {
    request(app)
      .post('/volume')
      .send({ id: app.vids[0].id, amt: 2 })
      .expect(404, done);
  });

  it('fails if volume post has invalid video id', done => {
    request(app)
      .post('/volume')
      .send({ id: 'nope', amt: 1 })
      .expect(404, done);
  });

  it('fails if volume post is missing video id', done => {
    request(app)
      .post('/volume')
      .send({ amt: 1 })
      .expect(404, done);
  });

  it('returns a list of videos', done => {
    request(app)
      .get('/videos')
      .expect(res => {
        assert(res.body.length > 1);
      })
      .expect(200, done);
  });

  it('returns a thumb for a video', done => {
    request(app)
      .get('/thumb?id=' + app.vids[0].id)
      .expect(res => {
        assert(res.text.length > 1000);
      })
      .expect(200, done);
  });

  it('returns a fallback image with invalid thumb id', done => {
    request(app)
      .get('/thumb?id=novideoexists')
      .expect(res => {
        assert(res.text.length > 1000);
      })
      .expect(200, done);
  });

  it('returns an mp4 stream', done => {
    request(app)
      .get('/video?id=' + app.vids[0].id)
      .expect(res => {
        assert(res.body.length > 1000);
        assert(res.type === 'video/mp4');
      })
      .expect(200, done);
  });

  it('404s on not found video', done => {
    sandbox.stub(console, 'log');
    request(app)
      .get('/video?id=notfound')
      .expect(404, done);
  });
});
