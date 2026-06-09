const publish_localVideo = document.getElementsByClassName('send_video')[0];
// const stateSpan = document.getElementById('state_span');
let publish_localStream = null;
let publish_clientId = null;
let publish_device = null;
let producerTransport = null;
let publish_videoProducer = null;
let publish_audioProducer = null;


console.log(publish_localVideo);
// =========== socket2.io ========== 
let socket2 = null;

let publish_keepAliveInterval = null;
let publish_mediaStartPromise = null;
let publish_isPublishing = false;

// return Promise
function connectSocket2() {
  if (socket2) {
    socket2.close();
    socket2 = null;
    publish_clientId = null;
  }

  return new Promise((resolve, reject) => {
    // socket2 = io.connect('/');
    console.log('socket2');
    console.log(convertStringToNumber(sessionStorage.getItem("code")));
    socket2 = io("/dynamic-" + convertStringToNumber(sessionStorage.getItem("code")));//io.connect('/');
    
    clearInterval(publish_keepAliveInterval);
    console.log('socket2 - 1');

    socket2.on('connect', function (evt) {
      console.log('socket2.io connected()');
    });
    socket2.on('error', function (err) {
      console.error('socket2.io ERROR:', err);
      reject(err);
    });
    socket2.on('disconnect', function (evt) {
      console.log('socket2.io _disconnect:', evt);
    });
    socket2.on('message', function (message) {
      console.log('socket2.io message:', message);
      if (message.type === 'welcome') {
        if (socket2.id !== message.id) {
          console.warn('WARN: something wrong with publish_clientID', socket2.io, message.id);
        }

        publish_clientId = message.id;
        console.log('connected to server. publish_clientId=' + publish_clientId);
        // Share publisher socket ID so subscriber knows to exclude it.
        sessionStorage.setItem('myPubSocketId', publish_clientId);
        resolve();
      }
      else {
        console.error('UNKNOWN message from server:', message);
      }
    });
    socket2.on('newProducer', async function (message) {
      console.warn('IGNORE socket2.io newProducer:', message);
    });

    publish_keepAliveInterval = setInterval(function () {
      console.log('hi')
      socket2.emit('readyToConnect', {room: 1});
      socket2.emit('aliveChecker',{})
    }, 3000)

  });
}

function disconnectSocket2() {
  if (socket2) {
    socket2.close();
    socket2 = null;
    publish_clientId = null;
    console.log('socket2.io closed..');
  }
}

function isSocket2Connected() {
  console.log(socket2);
  if (socket2) {
    return true;
  }
  else {
    return false;
  }
}

function publish_sendRequest(type, data) {
  return new Promise((resolve, reject) => {
    socket2.emit(type, data, (err, response) => {
      if (!err) {
        // Success response, so pass the mediasoup response to the local Room.
        resolve(response);
      } else {
        reject(err);
      }
    });
  });
}

// =========== media handling ========== 
function stoppublish_LocalStream(stream) {
  console.log(stream);
  if(stream != null){
    let tracks = stream.getTracks();
    if (!tracks) {
      console.warn('NO tracks');
      return;
    }
  
    tracks.forEach(track => track.stop());
  }
}

// return Promise
function publish_playVideo(element, stream) {
  if (element.srcObject) {
    console.warn('element ALREADY playing, so ignore');
    return;
  }
  // console.log(element);
  // console.log(stream);
  element.srcObject = stream;
  element.volume = 0;
  var start_video_inteval = setInterval(() => {
    if($(".send_video").get(0).paused == true){
      $(".send_video").get(0).play();
      clearInterval(start_video_inteval);
    }else{
      clearInterval(start_video_inteval);
    }
  }, 500);
  return element.play();
}

function _pauseVideo(element) {
  element.pause();
  element.srcObject = null;
}


// ============ UI button ==========

function checkUseVideo() {
  const useVideo = true;
  return useVideo;
}

function checkUseAudio() {
  const useAudio = true;
  return useAudio;
}

function waitForTransportConnected(transport, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    if (transport.connectionState === 'connected') {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      transport.off('connectionstatechange', onStateChange);
      reject(new Error('transport connect timeout'));
    }, timeoutMs);
    const onStateChange = (state) => {
      if (state === 'connected') {
        clearTimeout(timer);
        transport.off('connectionstatechange', onStateChange);
        resolve();
      } else if (state === 'failed' || state === 'closed') {
        clearTimeout(timer);
        transport.off('connectionstatechange', onStateChange);
        reject(new Error('transport ' + state));
      }
    };
    transport.on('connectionstatechange', onStateChange);
  });
}
var select_deviceid = "";
function getDevicesId(){
  var sel = 0;
  if (!navigator.mediaDevices?.enumerateDevices) {
    console.log("enumerateDevices() not supported.");
  } else {
    // List cameras and microphones.
    navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        devices.forEach((device) => {
          console.log(`${device.kind}: ${device.label} id = ${device.deviceId}`);
          if(device.kind === 'videoinput'){
            const option = document.createElement("option");
            option.text = device.label;
            option.value = device.deviceId;

            const cameraList = document.getElementById('camera_list');
            // cameraList.appendChild(option);
          }else if(device.kind === 'audioinput'){
            const option = document.createElement("option");
            option.text = device.label;
            option.value = device.deviceId;
            if(sel == 0 && device.deviceId != "default" && device.deviceId != "communications"){
              select_deviceid = device.deviceId;
              console.log(select_deviceid);
              sel++;
            }

            const audioList = document.getElementById('audio_list');
            // audioList.appendChild(option);
          }
        });
      })
      .catch((err) => {
        console.error(`${err.name}: ${err.message}`);
      });
  }
}

function startMedia() {
  if (publish_localStream) {
    console.warn('WARN: local media ALREADY started');
    return Promise.resolve(publish_localStream);
  }

  if (publish_mediaStartPromise) {
    return publish_mediaStartPromise;
  }

  const useVideo = checkUseVideo();
  const useAudio = checkUseAudio();

  const sharingType = 'screen';

  // if(isVideoSwitch){
  //   useVideo = {
  //     deviceId: videoId
  //   }
  // }
  
  console.log(select_deviceid);

  // if(sharingType === 'camera'){
  publish_mediaStartPromise = navigator.mediaDevices.getUserMedia({ audio: useAudio , video: useVideo  })
    .then((stream) => {
      publish_localStream = stream;
      console.log(publish_localStream)
      publish_playVideo(publish_localVideo, publish_localStream);
      _updateButtons();
      // If external "publish_ready" event does not arrive, still try publishing once.
      publish().catch((err) => {
        console.error('auto publish ERROR:', err);
      });
      return publish_localStream;
    })
    .catch(err => {
      console.error('media ERROR:', err);
      throw err;
    })
    .finally(() => {
      publish_mediaStartPromise = null;
    });

  return publish_mediaStartPromise;
  // }else if(sharingType === 'screen'){
  //   navigator.mediaDevices.getDisplayMedia({ audio: useAudio, video: useVideo })
  //   .then((stream) => {
  //     publish_localStream = stream;
  //     publish_playVideo(publish_localVideo, publish_localStream);
  //     console.log($(publish_localVideo));
  //     _updateButtons();
  //     publish();
  //   })
  //   .catch(err => {
  //     console.error('media ERROR:', err);
  //   });
  // }
}

function _stopMedia() {
  if (publish_localStream) {
    _pauseVideo(publish_localVideo);
    stoppublish_LocalStream(publish_localStream);
    publish_localStream = null;
  }
  _updateButtons();
}

async function publish() {
  if (publish_isPublishing) {
    console.warn('WARN: publish already in progress');
    return;
  }

  if (producerTransport || publish_videoProducer || publish_audioProducer) {
    const state = producerTransport && producerTransport.connectionState ? producerTransport.connectionState : 'unknown';
    // Do not renegotiate while an existing publish transport is alive.
    if (state === 'new' || state === 'connecting' || state === 'connected') {
      console.warn('WARN: publish transport is active, skip duplicate publish');
      return;
    }

    console.warn('WARN: failed publish state detected, resetting transport');
    if (publish_videoProducer) {
      publish_videoProducer.close();
      publish_videoProducer = null;
    }
    if (publish_audioProducer) {
      publish_audioProducer.close();
      publish_audioProducer = null;
    }
    if (producerTransport) {
      producerTransport.close();
      producerTransport = null;
    }
  }

  publish_isPublishing = true;

  if (!publish_localStream) {
    try {
      await startMedia();
    } catch (err) {
      console.warn('WARN: local media NOT READY');
      publish_isPublishing = false;
      return;
    }
  }

  try {
    // --- connect socket2.io ---
    if (!isSocket2Connected()) {
      try{  
        await connectSocket2().catch(err => {
          console.error(err);
          return;
        });


        console.log("connected ");
        // --- get capabilities --
        const data = await publish_sendRequest('getRouterRtpCapabilities', {});
        console.log('getRouterRtpCapabilities:', data);
        await publish_loadDevice(data);
      }catch(err){
        console.log(err);
      }
    }
    

  // console.log(publish_device);
  // if(publish_device == null){
  //   alert("카메라가 없습니다.");
  // }

  console.log("publish");
  _updateButtons();

  // --- get transport info ---
  console.log('--- createProducerTransport --');
    const params = await publish_sendRequest('createProducerTransport', {});
    console.log('transport params:', params);
    producerTransport = publish_device.createSendTransport(params);
    console.log('createSendTransport:', producerTransport);

  // --- join & start publish --
  producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
    console.log('--trasnport connect');
    publish_sendRequest('connectProducerTransport', { dtlsParameters: dtlsParameters })
      .then(callback)
      .catch(errback);
  });

  producerTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
    console.log('--trasnport produce');
    console.log(kind);
    try {
      const { id } = await publish_sendRequest('produce', {
        transportId: producerTransport.id,
        kind,
        rtpParameters,
        role: 'mainpage',
      });
      callback({ id });
    } catch (err) {
      errback(err);
    }
  });

  producerTransport.on('connectionstatechange', (state) => {
    switch (state) {
      case 'connecting':
        console.log('publishing...');
        break;

      case 'connected':
        console.log('published');
        socket_emit();
        break;

      case 'failed':
        console.log('failed');
        producerTransport.close();
        _reconnect();
        break;

      default:
        break;
    }
  });

    const useVideo = true
    const useAudio = checkUseAudio()
    if (useVideo) {
      const videoTrack = publish_localStream.getVideoTracks()[0];
      console.log(publish_localStream.getVideoTracks())
      if (videoTrack) {
        const trackParams = { track: videoTrack };
        publish_videoProducer = await producerTransport.produce(trackParams);
      }
    }
    if (useAudio) {
      try {
        await waitForTransportConnected(producerTransport);
        const audioTrack = publish_localStream.getAudioTracks()[0];
        if (audioTrack) {
          const trackParams = { track: audioTrack };
          publish_audioProducer = await producerTransport.produce(trackParams);
        }
      } catch (err) {
        console.warn('audio publish skipped:', err);
      }
    }

    _updateButtons();
  } finally {
    publish_isPublishing = false;
  }
}

function disconnect_publish() {
  if (publish_localStream) {
    _stopMedia();
    stoppublish_LocalStream(publish_localStream);
    publish_localStream = null;
  }
  if (publish_videoProducer) {
    publish_videoProducer.close(); // publish_localStream will stop
    publish_videoProducer = null;
  }
  if (publish_audioProducer) {
    publish_audioProducer.close(); // publish_localStream will stop
    publish_audioProducer = null;
  }
  if (producerTransport) {
    producerTransport.close(); // publish_localStream will stop
    producerTransport = null;
  }

  clearInterval(publish_keepAliveInterval);

  disconnectSocket2();
  _updateButtons();
}

async function publish_loadDevice(routerRtpCapabilities) {
  try {
    const isAndroid = /Android/i.test(navigator.userAgent || "");
    const deviceOptions = isAndroid ? { handlerName: "Chrome74" } : undefined;
    publish_device = deviceOptions
      ? new MediasoupClient.Device(deviceOptions)
      : new MediasoupClient.Device();
  } catch (error) {
    if (error.name === 'UnsupportedError') {
      console.error('browser not supported');
    }
  }
  await publish_device.load({ routerRtpCapabilities });
}


// ---- UI control ----
function _updateButtons() {
  if (publish_localStream) {
    _disableElement('start_video_button');
    _disableElement('use_video');
    _disableElement('use_audio');
    if (isSocket2Connected()) {
      _disableElement('stop_video_button');
    }
    else {
      _enabelElement('stop_video_button');
    }

    if (publish_videoProducer || publish_audioProducer) {
      _disableElement('publish_button');
    }
    else {
      _enabelElement('publish_button');
    }
  }
  else {
    _enabelElement('start_video_button');
    _enabelElement('use_video');
    _enabelElement('use_audio');
    _disableElement('stop_video_button');
    _disableElement('publish_button');
  }

  if (isSocket2Connected()) {
    _enabelElement('disconnect_button');
  }
  else {
    _disableElement('disconnect_button');
  }
}


function _enabelElement(id) {
  let element = document.getElementById(id);
  if (element) {
    element.removeAttribute('disabled');
  }
}

function _disableElement(id) {
  let element = document.getElementById(id);
  if (element) {
    element.setAttribute('disabled', '1');
  }
}

async function republish(){
  // --- connect socket2.io ---
  // if (!isSocket2Connected()) {
    await connectSocket2().catch(err => {
      console.error(err);
      return;
    });

    // --- get capabilities --
    const data = await publish_sendRequest('getRouterRtpCapabilities', {});
    console.log('getRouterRtpCapabilities:', data);
    await publish_loadDevice(data);
  // }

  _updateButtons();

  // --- get transport info ---
  console.log('--- createProducerTransport --');
  const params = await publish_sendRequest('createProducerTransport', {});
  console.log('transport params:', params);
  producerTransport = publish_device.createSendTransport(params);
  console.log('createSendTransport:', producerTransport);

  // --- join & start publish --
  producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
    console.log('--trasnport connect');
    publish_sendRequest('connectProducerTransport', { dtlsParameters: dtlsParameters })
      .then(callback)
      .catch(errback);
  });

  producerTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
    console.log('--trasnport produce');
    console.log(kind);
    try {
      const { id } = await publish_sendRequest('produce', {
        transportId: producerTransport.id,
        kind,
        rtpParameters,
        role: 'mainpage',
      });
      callback({ id });
    } catch (err) {
      errback(err);
    }
  });

  producerTransport.on('connectionstatechange', (state) => {
    switch (state) {
      case 'connecting':
        console.log('publishing...');
        break;

      case 'connected':
        console.log('published');
        break;

      case 'failed':
        console.log('failed');
        producerTransport.close();
        _reconnect();
        break;

      default:
        break;
    }
  });

  const useVideo = checkUseVideo();
  const useAudio = checkUseAudio();
  if (useVideo) {
    const videoTrack = publish_localStream.getVideoTracks()[0];
    if (videoTrack) {
      const trackParams = { track: videoTrack };
      publish_videoProducer = await producerTransport.produce(trackParams);
    }
  }
  if (useAudio) {
    try {
      await waitForTransportConnected(producerTransport);
      const audioTrack = publish_localStream.getAudioTracks()[0];
      if (audioTrack) {
        const trackParams = { track: audioTrack };
        publish_audioProducer = await producerTransport.produce(trackParams);
      }
    } catch (err) {
      console.warn('audio republish skipped:', err);
    }
  }
}

function onChangeCamera(){
  const nextDeviceId = document.getElementById('camera_list').value;
  console.log(nextDeviceId);
  navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: nextDeviceId } }, audio: checkUseAudio() })
    .then(stream => {
      const nextVideoTrack = stream.getVideoTracks()[0];
      const nextAudioTrack = stream.getAudioTracks()[0];

      // Keep sender/transceiver alive and only swap tracks.
      if (publish_videoProducer && nextVideoTrack) {
        publish_videoProducer.replaceTrack({ track: nextVideoTrack });
      }
      if (publish_audioProducer && nextAudioTrack) {
        publish_audioProducer.replaceTrack({ track: nextAudioTrack });
      }

      if (publish_localStream) {
        _pauseVideo(publish_localVideo);
        stoppublish_LocalStream(publish_localStream);
      }
      publish_localStream = stream;
      publish_playVideo(publish_localVideo, publish_localStream);
      select_deviceid = nextDeviceId;
      _updateButtons();
    })
    .catch(error => {
      console.error('Failed to get user media:', error);
    });
}

function _reconnect(){
  // disconnect_publish();
  // // setTimeout(()=>{}, )
  // startMedia()
  // publish()
  _stopMedia();
  startMedia();
  const checkMediaRunning = setInterval(()=>{
    if(localStream){
      republish();
      clearInterval(checkMediaRunning);
    }
  }, 500)
}


_updateButtons();
getDevicesId();
startMedia();
// publish();
console.log('=== ready ==='); 