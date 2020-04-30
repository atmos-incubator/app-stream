// istanbul ignore file until we have a couple of modules in place first.
// @TODO: Create a proxy that can watch for and report on all actions taken upon the object.  So watch.foo() would report
// that a function foo was called with no arguments. Actions should be in a sequenced log. A watch should return a
// structure that can be compared against subsequent actions for similarity. Then we can compare ui.fullscreen.show.called
// when onFullscreenChange() is invoked.
// @TODO: Finish lib/standard:window/el:invoke() logic to allow for event simulation in tests.
const app = {
  load: () => {
    on('hashchange', () => {
      // Allow easy reset of the progress data
      if ((window.location.hash || '').includes('reset')) {
        localStorage.clear();
        history.replaceState('', document.title, window.location.pathname + window.location.search);
        location.reload();
      }
    });

    app.getAppConfig().then(function() {
      app
        .getAllVideos()
        .then(function() {
          on('resize', ui.resize);
          onFullscreenChange(() => {
            const isFull = isFullscreen() ? 'inline-flex' : false;
            ui.exitFullscreen.show(isFull);
            ui.fullscreen.show(!isFull);
            ui.player.onFullscreenChange(isFullscreen());
          });

          app.onReady();
          ui.player.next();
        })
        .catch((e) => ui.showError(e));
    });
  },
  onReady: Event.queue(true),
  videos: [],
  getVid: (id) => app.videos.ea((v) => ea.exitIf(v.id === id, v)),
  remVid: (id) => {
    // remove video from list
    // @FUTURE: Only delete the video based on configuration setting
    app.getVid(id).isDeleted = true;
    app.saveProgress(id, 0);
  },
  nextVid: (vid) => {
    if (vid == null) return app.videos[0];
    let idx = app.videos.indexOf(vid);
    if (idx + 1 === app.videos.length) {
      idx = -1;
    }
    return app.videos[idx + 1];
  },
  playCount: () => {
    return app.videos.ea((v) => (v.isDeleted ? 0 : 1)).sum();
  },
  hasPlayable: () => {
    return app.videos.find((v) => v.isDeleted != true);
  },
  saveProgress: (id, amt) => {
    if (amt === undefined) return; // @NOTE: the video player will report undefined for a few ms at the start of a video

    const vid = app.getVid(id || app.curVid.id);
    vid.progress = amt;

    // store progress meta to localStorage for persistence across page refresh
    localStorage.setItem(
      vid.id,
      ea(vid).slice(['progress', 'isDeleted']).stringify()
    );
  },
  setVidVolume: (id, amt) => {
    // update volume and server side meta if real change
    if (app.getVid(id).vol == amt || amt == 0) return;
    ui.player.setVolume(amt);
    fetch.post('/volume', { id, amt });
  },

  // A list of previously viewed video ids for jumping to previous video
  prevs: [],

  getAppConfig: () => {
    return fetch
      .latest('/config')
      .then((res) => res.text())
      .then((res) => {
        app.config = res.parse();
        app.config.ea((plug) => {
          app.onReady(() => plug.src(plug.conf, app, ui.player, ui.controls));
        });
      })
      .catch((err) => ui.showError(err));
  },
  getAllVideos: () => {
    return fetch.latest
      .json('/videos')
      .catch((err) => ui.showError(err))
      .then((res) => {
        app.videos = res;
        app.curVid = null;
      })
      .then(() => {
        app.videos.ea((v) => {
          ea((localStorage.getItem(v.id) || '{}').parse() || {}, (val, key) => {
            v[key] = val;
          });
        });
      });
  }
};

const ui = {
  controls: find('#controls'),
  player: find('#player'),
  error: find('#error'),
  title: find('#title'),
  pause: find('#pause'),
  play: find('#play'),
  name: find('#title .name'),
  progress: find('#title .progress'),
  volume: find('#volume'),
  volOn: find('#volOn'),
  volOff: find('#volOff'),
  fullscreen: find('#fullscreen'),
  exitFullscreen: find('#exitFullscreen'),
  vp: find('#vp'),
  hideTitle: () => ui.title.classList.add('hide'),
  showTitle: (dur) => {
    try {
      ui.name.innerText = app.curVid.title;
      if (app.curVid.duration) {
        ui.progress.innerText =
          app.curVid.progress.duration('s').toString() +
          ' / ' +
          (app.curVid.duration || 0).duration('s').toString();
      } else {
        ui.progress.innerText = app.curVid.duration
          ? app.curVid.duration.duration()
          : '';
      }
      ui.title.className = '';
      if (dur) setTimeout(ui.hideTitle, dur);
    } catch (e) {
      ui.showError(e);
    }
  },
  showError: (e) => {
    ui.error.innerText = isa(e, 'error') ? e.code + ': ' + e.message : e;
    ui.error.className = '';
    setTimeout(() => ui.error.classList.add('hide'), 5000);
  },
  resize: () => {
    // @NOTE: Keeps the controls in the viewport since something has to crop
    window.scrollTo(0, document.body.scrollHeight);
  }
};

ui.vp.on({
  resize: () => setTimeout(ui.resize, 100),
  ended: () => {
    app.remVid(app.curVid.id);
    ui.player.next();
  },
  loadedmetadata: (e) => {
    app.curVid.duration = ui.vp.duration;
  },
  timeupdate: () => {
    // record the amount of video we just watched
    app.saveProgress(app.curVid.id, ui.vp.currentTime);

    // Allow `end` property to skip over advertisements at end of videos
    if (
      app.curVid.end &&
      app.curVid.end > 1 &&
      ui.vp.currentTime > app.curVid.end
    ) {
      app.remVid(app.curVid.id);
      ui.player.next();
    }
  }
});

Object.assign(ui.player, {
  onPlay: Event.queue(),
  onPause: Event.queue(),
  onNext: Event.queue(),
  onProgress: Event.queue(),
  onFullscreenChange: Event.queue(),

  isPlaying: () => ui.vp.isPlaying,
  playVid: (id) => {
    ui.vp.src = '/video?id=' + id;
    ui.vp.load();

    ui.vp.currentTime = app.curVid.progress || (app.curVid.start ? app.curVid.start * 60 : 0);

    ui.player.play().then(() => {
      // hide thumb
      ui.player.style.backgroundImage = 'none';

      // show controls and player on start
      [ui.vp, ui.controls].ea('visible')(true);

      // @NOTE: playback rate can only be set while playing
      ui.vp.playbackRate = app.getVid(id).playbackRate || 1;
    });
  },

  play: () => {
    if (!app.curVid.id) return;

    // update ui
    ui.showTitle(1000);

    return ui.vp
      .play()
      .catch((e) => {
        // @NOTE: invalid/unsupported video format errors
        if (e.code === 9 || e.code === 3 || e.code === 4) {
          app.remVid(app.curVid.id);
          ui.player.next();
        }

        // @NOTE: Probably a Lack of user interaction or network error
        // Reset the UI via pause
        ui.player.pause();
      })
      .then(() => {
        ui.player.onPlay(app.curVid);
        ui.pause.show('inline-flex');
        ui.play.show(false);
      })
      .catch((e) => alert(e));
  },
  pause: () => {
    ui.play.show();
    ui.pause.show(false);
    ui.showTitle();
    ui.vp.pause();
  },
  skip: (n) => {
    ui.vp.currentTime = ui.vp.currentTime + n;
  },
  next: (dir) => {
    if (!app.hasPlayable()) {
      ui.controls.show(false);
      return ui.showError('There are no more videos.');
    }

    // pause the video before changing the src
    let wasPaused = false;
    if (ui.vp.isPlaying) {
      ui.vp.pause();
      wasPaused = true;
    }
    let nextVid;
    let tries = app.videos.length;
    while (tries--) {
      if (dir === -1) {
        if (!app.prevs.length) {
          ui.showError('This is the first video of the series');
          if (wasPaused) ui.vp.play();
          return;
        }
        nextVid = app.getVid(app.prevs.pop());
      } else {
        // allow plugin to decide player.onNext() logic
        nextVid = ea(ui.player.onNext()[0]).or(
          // or default to the next vid
          app.nextVid(nextVid || app.curVid)
        );
      }
      if (!nextVid.isDeleted) break;
    }

    if (tries === 0 || !nextVid || !nextVid.id) {
      if (wasPaused) ui.vp.play();
      return ui.showError(
        'Unable to find a suitable video to play, check active plugins for onNext() bugs.'
      );
    } else if (dir !== -1 && app.curVid) {
      app.prevs.push(app.curVid.id);
    }

    // Load the new vid
    if (nextVid !== app.curVid) {
      app.curVid = nextVid;

      // Set volume and tracker
      if (ui.volume.value > 0) {
        ui.player.setVolume(app.curVid.vol || 1);
      }

      // show title for video
      ui.showTitle(2000);

      // Show thumbnail instead of video container for a sec, then start video
      ui.vp.visible(false);
      ui.player.style.backgroundImage = `url('/thumb?id=${app.curVid.id}')`;
      if (app.curVid.id) {
        setTimeout(ui.player.playVid, 1000, app.curVid.id);
      }
    }
  },
  setVolume: (amt) => {
    ui.vp.volume = amt;
    app.curVid.vol = amt;
    ui.volume.value = amt;
    ui.volOn.show(amt != 0);
    ui.volOn.title = ui.volume.value * 100 + '%';
    ui.volOff.show(amt == 0);
  }
});

(function() {
  let canHide = true;
  ui.controls.on({
    init: () => {
      const hideControls = () => {
        if (!canHide) return;
        ui.controls.classList.add('hide');
        ui.controls.hideVolume();
      };
      document.body.on('mousemove', () => {
        ui.controls.className = '';
        setTimeout(hideControls, 1000);
      });
    },
    click: (e) => {
      e.stopPropagation();
      e.preventDefault();
      const id = e.target.parent('button').id;
      switch (id) {
        case 'fullscreen':
          // @NOTE: going full screen on a wrapper hides the native player controls
          return setFullscreen(ui.player);
        case 'exitFullscreen':
          return setFullscreen(false);
        case 'nextVideo':
          return ui.player.next();
        case 'prevVideo':
          return ui.player.next(-1);
        case 'skip30':
          return ui.player.skip(30);
        case 'rewind30':
          return ui.player.skip(-30);
        case 'play':
          return ui.player.play();
        case 'pause':
          return ui.player.pause();
        case 'volControl':
          return ui.controls.showVolume(e.target.id);
      }
    },
    mouseleave: () => (canHide = true),
    mouseenter: () => (canHide = false)
  });
  ui.controls.hideVolume = () => ui.volume.visible(false);
  ui.controls.showVolume = () => ui.volume.visible(!ui.volume.visible());
  ui.volume.on('input', () => app.setVidVolume(app.curVid.id, ui.volume.value));
})();

app.load();
