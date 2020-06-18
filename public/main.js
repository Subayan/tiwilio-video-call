let muteAudio, videoMute;
(async () => {
  try {
    let query = window.location.search;
    let name = new URLSearchParams(query).get('name');
    console.log(name);
    if(!name){
      return alert('Put your name into URL ');
    }
    const Video = Twilio.Video;
    
    var videoElement = document.querySelector('video#videoinputpreview');
    let token = await fetch('/token?identity='+name).then(response => response.text())
    let device = await getDeviceSelectionOptions();
    addToSelecElement('audiooutput',device.audiooutput)
    addToSelecElement('audioinput',device.audioinput)
    addToSelecElement('videoinput',device.videoinput)
    console.log(device);
    await displayLocalVideo(videoElement);
    let room = await Video.connect(token, {
      name: 'subayan-room',
      audio: {
        name: 'microphone'
      },
      video: {
        name: 'camera'
      },
      networkQuality: {
        local: 3,
        remote: 3
      }
    })
    // }).then(function (room) {
    //   console.log(room);
    window.room =  room;  
  
    // console.log(room)
    room.localParticipant.tracks.forEach(function (publication) {
      console.log('The LocalTrack "' + publication.trackName + '" was successfully published');
    });
  //   room.on('participantConnected', participant => {
  //     console.log('New Conneted to Room');
  //     console.log(participant);
  //     participantConnected(participant, room);
  // });

  room.participants.forEach(participantConnected);
  room.on('participantConnected', participantConnected);

  room.on('participantDisconnected', participantDisconnected);
  room.once('disconnected', error => room.participants.forEach(participantDisconnected));
    // }).catch(error => {
    //   console.log('Could not connect to the Room:', error.message);
    // });

    // participantConnected(room.participants);

    function displayLocalVideo(video) {
      return Video.createLocalVideoTrack().then(function (localTrack) {
        localTrack.attach(video);
      });
    }

    function participantConnected(participant) {
      console.log('Participant "%s" connected', participant.identity);

      const div = document.createElement('div');
      div.id = participant.sid;
      div.innerText = participant.identity;
      console.log(participant.sid);
      div.classList.add("callVideo");
      participant.on('trackSubscribed', track => trackSubscribed(div, track));
      participant.on('trackUnsubscribed', trackUnsubscribed);

      participant.tracks.forEach(publication => {
        if (publication.isSubscribed) {
          trackSubscribed(div, publication.track);
        }
      });

      document.body.appendChild(div);
    }

    function participantDisconnected(participant) {
      console.log('Participant "%s" disconnected', participant.identity);
      document.getElementById(participant.sid).remove();
    }

    function trackSubscribed(div, track) {
      div.appendChild(track.attach());
    }

    function trackUnsubscribed(track) {
      track.detach().forEach(element => element.remove());
    }

    /**
     * Replace the existing LocalAudioTrack or LocalVideoTrack with
     * a new one in the Room.
     * @param {Room} room - The Room you have joined
     * @param {LocalAudioTrack|LocalVideoTrack} track - The LocalTrack you want to switch to
     * @returns {void}
     */
    function switchLocalTracks(room, track) {
      room.localParticipant.tracks.forEach(function (trackPublication) {
        if (trackPublication.kind === track.kind) {
          trackPublication.track.stop();
          room.localParticipant.unpublishTrack(trackPublication.track);
        }
      });
      room.localParticipant.publishTrack(track);
    }

    /**
   * Ensure that media permissions are obtained.
   * @returns {Promise<void>}
   */
  function ensureMediaPermissions() {
    return navigator.mediaDevices.enumerateDevices().then(function(devices) {
      return devices.every(function(device) {
        return !(device.id && device.label);
      });
    }).then(function(shouldAskForMediaPermissions) {
      if (shouldAskForMediaPermissions) {
        return navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(function(mediaStream) {
          mediaStream.getTracks().forEach(function(track) {
            track.stop();
          });
        });
      }
    });
  }

  /**
   * Get the list of available media devices.
   * @returns {Promise<DeviceSelectionOptions>}
   * @typedef {object} DeviceSelectionOptions
   * @property {Array<MediaDeviceInfo>} audioinput
   * @property {Array<MediaDeviceInfo>} audiooutput
   * @property {Array<MediaDeviceInfo>} videoinput
   */
  function getDeviceSelectionOptions() {
    // before calling enumerateDevices, get media permissions (.getUserMedia)
    // w/o media permissions, browsers do not return device Ids and/or labels.
    return ensureMediaPermissions().then(function() {
      return navigator.mediaDevices.enumerateDevices().then(function(deviceInfos) {
        var kinds = ['audioinput', 'audiooutput', 'videoinput'];
        return kinds.reduce(function(deviceSelectionOptions, kind) {
          deviceSelectionOptions[kind] = getDevicesOfKind(deviceInfos, kind);
          console.log(deviceSelectionOptions)
          return deviceSelectionOptions;
        }, {});
      });
    });
  }

  /**
   * Get the list of available media devices of the given kind.
   * @param {Array<MediaDeviceInfo>} deviceInfos
   * @param {string} kind - One of 'audioinput', 'audiooutput', 'videoinput'
   * @returns {Array<MediaDeviceInfo>} - Only those media devices of the given kind
   */
  function getDevicesOfKind(deviceInfos, kind) {
    return deviceInfos.filter(function(deviceInfo) {
      return deviceInfo.kind === kind;
    });
  }


  /**
  * Mute/unmute your media in a Room.
  * @param {Room} room - The Room you have joined
  * @param {'audio'|'video'} kind - The type of media you want to mute/unmute
   * @param {'mute'|'unmute'} action - Whether you want to mute/unmute
  */
  function muteOrUnmuteYourMedia(room, kind, action) {
    const publications = kind === 'audio'
      ? room.localParticipant.audioTracks
      : room.localParticipant.videoTracks;

      publications.forEach(function(publication) {
      if (action === 'mute') {
        publication.track.disable();
      } else {
        publication.track.enable();
      }
    });
  }

  let audioMuteStatus = 'mute'
  let videoMuteStatus = 'mute'
  muteAudio = function(){
    audioMuteStatus =  audioMuteStatus=='mute'?'unmute':'mute';
    muteOrUnmuteYourMedia(room, 'audio', audioMuteStatus)
    document.getElementById('buttonMute').innerHTML = 'Audio ' + audioMuteStatus;
  }
  videoMute = function(){
    videoMuteStatus =  videoMuteStatus=='mute'?'unmute':'mute';
    muteOrUnmuteYourMedia(room, 'video', videoMuteStatus)
    document.getElementById('buttonMute2').innerHTML = 'Video ' + videoMuteStatus;
  }

  muteAudio();
  videoMute();

  function addToSelecElement(id,options){
          let select = document.getElementById(id);
          for (let index = 0; index < options.length; index++) {
            const opt = options[index];
            if(id==opt.kind){ 
              let el = document.createElement("option");
              el.textContent = opt.label;
              el.value = opt.deviceId;
              el.dataset.groupId = opt.groupId;
              select.appendChild(el);
            }
          }
        }
  } catch (error) {
    console.log(error)
  }
})()