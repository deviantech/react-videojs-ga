const installVideoAnalyticsPlugin = function(videojs) {
  videojs.registerPlugin('ga', function(options) {
    // this loads options from the data-setup attribute of the video tag
    let seekEnd;
    if (options == null) { options = {}; }
    let dataSetupOptions = {};

    if (this.options_["data-setup"]) {
      const parsedOptions = JSON.parse(this.options_["data-setup"]);
      if (parsedOptions.ga) { dataSetupOptions = parsedOptions.ga; }
    }

    const defaultsEventsToTrack = [
      'loaded', 'percentsPlayed', 'start',
      'end', 'seek', 'play', 'pause', 'resize',
      'volumeChange', 'error', 'fullscreen'
    ];
    const eventsToTrack = options.eventsToTrack || dataSetupOptions.eventsToTrack || defaultsEventsToTrack;
    const percentsPlayedInterval = options.percentsPlayedInterval || dataSetupOptions.percentsPlayedInterval || 10;

    const eventCategory = options.eventCategory || dataSetupOptions.eventCategory || 'Video';
    // if you didn't specify a name, it will be 'guessed' from the video src after metadatas are loaded
    let eventLabel = options.eventLabel || dataSetupOptions.eventLabel;

    // if debug isn't specified
    options.debug = options.debug || false;

    // init a few variables
    const percentsAlreadyTracked = [];
    let seekStart = (seekEnd = 0);
    let seeking = false;

    const loaded = function() {
      if (!eventLabel) {
        eventLabel = this.currentSrc().split("/").slice(-1)[0].replace(/\.(\w{3,4})(\?.*)?$/i,'');
      }

      if (eventsToTrack.includes("loadedmetadata")) {
        sendbeacon( 'loadedmetadata', true );
      }
    };

    const timeupdate = function() {
      const currentTime = Math.round(this.currentTime());
      const duration = Math.round(this.duration());
      const percentPlayed = Math.round((currentTime/duration)*100);

      for (let percent = 0, step = percentsPlayedInterval; percent <= 99; percent += step) {
        if ((percentPlayed >= percent) && !Array.from(percentsAlreadyTracked).includes(percent)) {

          if (Array.from(eventsToTrack).includes("start") && (percent === 0) && (percentPlayed > 0)) {
            sendbeacon( 'start', true );
          } else if (Array.from(eventsToTrack).includes("percentsPlayed") && (percentPlayed !== 0)) {
            sendbeacon( 'percent played', true, percent );
          }

          if (percentPlayed > 0) {
            percentsAlreadyTracked.push(percent);
          }
        }
      }

      if (eventsToTrack.includes("seek")) {
        seekStart = seekEnd;
        seekEnd = currentTime;
        // if the difference between the start and the end are greater than 1 it's a seek.
        if (Math.abs(seekStart - seekEnd) > 1) {
          seeking = true;
          sendbeacon( 'seek start', false, seekStart );
          sendbeacon( 'seek end', false, seekEnd );
        }
      }

    };

    const end = function() {
      sendbeacon( 'end', true );
    };

    const play = function() {
      const currentTime = Math.round(this.currentTime());
      sendbeacon( 'play', true, currentTime );
      seeking = false;
    };

    const pause = function() {
      const currentTime = Math.round(this.currentTime());
      const duration = Math.round(this.duration());
      if ((currentTime !== duration) && !seeking) {
        sendbeacon( 'pause', false, currentTime );
      }
    };

    // value between 0 (muted) and 1
    const volumeChange = function() {
      const volume = this.muted() === true ? 0 : this.volume();
      sendbeacon( 'volume change', false, volume );
    };

    const resize = function() {
      sendbeacon( `resize - ${this.width()}*${this.height()}`, true );
    };

    const error = function() {
      const currentTime = Math.round(this.currentTime());
      // XXX: Is there some informations about the error somewhere ?
      sendbeacon( 'error', true, currentTime );
    };

    const fullscreen = function() {
      const currentTime = Math.round(this.currentTime());
      if ((typeof this.isFullscreen === 'function' ? this.isFullscreen() : undefined) || (typeof this.isFullScreen === 'function' ? this.isFullScreen() : undefined)) {
        sendbeacon( 'enter fullscreen', false, currentTime );
      } else {
        sendbeacon( 'exit fullscreen', false, currentTime );
      }
    };

    var sendbeacon = function( action, nonInteraction, value ) {
      // console.log('react-videojs-ga: sending beacon for: ', action)

      if (window.ga) {
        ga('send', 'event', {
          'eventCategory'   : eventCategory,
          'eventAction'     : action,
          'eventLabel'      : eventLabel,
          'eventValue'      : value,
          'nonInteraction'  : nonInteraction
        });
      } else if (window._gaq) {
        _gaq.push(['_trackEvent', eventCategory, action, eventLabel, value, nonInteraction]);
      } else if (options.debug) {
        console.log("Google Analytics not detected");
      }
    };

    this.ready(function() {
      this.on("loadedmetadata", loaded);
      this.on("timeupdate", timeupdate);
      if (eventsToTrack.includes("end")) { this.on("ended", end); }
      if (eventsToTrack.includes("play")) { this.on("play", play); }
      if (eventsToTrack.includes("pause")) { this.on("pause", pause); }
      if (eventsToTrack.includes("volumeChange")) { this.on("volumechange", volumeChange); }
      if (eventsToTrack.includes("resize")) { this.on("resize", resize); }
      if (eventsToTrack.includes("error")) { this.on("error", error); }
      if (eventsToTrack.includes("fullscreen")) { return this.on("fullscreenchange", fullscreen); }
    });

    return {'sendbeacon': sendbeacon};
  });
}

export default installVideoAnalyticsPlugin