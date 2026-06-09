const localVideo = document.getElementsByClassName('view_video')[0];
const stateSpan = document.getElementById('state_span');
let localStream = null;
let clientId = null;
let device = null;
let producerTransport = null;
let videoProducer = null;
let audioProducer = null;


console.log(localVideo);
// =========== socket2.io ========== 
let socket2 = null;

let keepAliveInterval = null;
let mediaStartPromise = null;
let isPublishing = false;

// return Promise
function connectSocket2() {
    
  if (socket2) {
    socket2.close();
    socket2 = null;
    clientId = null;
  }

  return new Promise((resolve, reject) => {
    // socket2 = io.connect('/');
    console.log('socket2 - 1 ');
      console.log(convertStringToNumber(sessionStorage.getItem("code")));
    socket2 = io("/dynamic-" + convertStringToNumber(sessionStorage.getItem("code")));//io.connect('/');

    clearInterval(keepAliveInterval);
    console.log('socket2 - 2 ');
    socket2.on('connect', function (evt) {
      console.log('socket2.io connected()');
    });
    socket2.on('error', function (err) {
      console.error('socket2.io ERROR:', err);
      reject(err);
    });
    socket2.on('disconnect', function (evt) {
      console.log('socket2.io disconnect:', evt);
    });
    socket2.on('message', function (message) {
      console.log('socket2.io message:', message);
      if (message.type === 'welcome') {
        if (socket2.id !== message.id) {
          console.warn('WARN: something wrong with clientID', socket2.io, message.id);
        }

        clientId = message.id;
        console.log('connected to server. clientId=' + clientId);
        // Share publisher socket ID so subscriber knows to exclude it.
        sessionStorage.setItem('myPubSocketId', clientId);
        resolve();
      }
      else {
        console.error('UNKNOWN message from server:', message);
      }
    });
    socket2.on('newProducer', async function (message) {
      console.warn('IGNORE socket2.io newProducer:', message);
    });


    keepAliveInterval = setInterval(function () {
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
    clientId = null;
    console.log('socket2.io closed..');
  }
}

function isSocket2Connected() {
  if (socket2) {
    return true;
  }
  else {
    return false;
  }
}

function sendRequest(type, data) {
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
function stopLocalStream(stream) {
  let tracks = stream.getTracks();
  if (!tracks) {
    console.warn('NO tracks');
    return;
  }

  tracks.forEach(track => track.stop());
}

// return Promise
function playVideo(element, stream) {
  if (element.srcObject) {
    console.warn('element ALREADY playing, so ignore');
    return;
  }
  console.log('publish_playvideo');

  element.srcObject = stream;
  element.volume = 0;
  var start_video_inteval = setInterval(() => {
    console.log($(".view_video").get(0).paused);
    if($(".view_video").get(0).paused == true){
      $(".view_video").get(0).play();
      clearInterval(start_video_inteval);
    }else{
      clearInterval(start_video_inteval);
    }
  }, 500);

  return element.play();
}

function pauseVideo(element) {
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

function isRearCameraLabel(label) {
  const normalized = (label || "").toLowerCase();
  return (
    normalized.includes("back") ||
    normalized.includes("rear") ||
    normalized.includes("environment") ||
    normalized.includes("후면")
  );
}

function getDevicesId(){
  if (!navigator.mediaDevices?.enumerateDevices) {
    console.log("enumerateDevices() not supported.");
  } else {
    // List cameras and microphones.
    // alert(JSON.stringify(navigator.mediaDevices.enumerateDevices()));
    navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        let rearCameraId = "";
        let fallbackCameraId = "";
        devices.forEach((device) => {
          if(device.kind === 'videoinput'){
            if (!fallbackCameraId) {
              fallbackCameraId = device.deviceId;
            }

            if (!rearCameraId && isRearCameraLabel(device.label)) {
              rearCameraId = device.deviceId;
            }

            const option = document.createElement("option");
            option.text = device.label;
            option.value = device.deviceId;
            
            // console.log(`${device.kind}: ${device.label} id = ${device.deviceId}`);
            
            // alert(JSON.stringify(device));
            const cameraList = document.getElementById('camera_list');
            // cameraList.appendChild(option);
          }else if(device.kind === 'audioinput'){
            const option = document.createElement("option");
            option.text = device.label;
            option.value = device.deviceId;

            const audioList = document.getElementById('audio_list');
            // audioList.appendChild(option);
          }
        });

        select_deviceid = rearCameraId || fallbackCameraId || "";

        startMedia();
      })
      .catch((err) => {
        console.error(`${err.name}: ${err.message}`);
      });
  }

  

}

function startMedia() {
  if (localStream) {
    console.warn('WARN: local media ALREADY started');
    return Promise.resolve(localStream);
  }

  if (mediaStartPromise) {
    return mediaStartPromise;
  }

  const useVideo = checkUseVideo();
  const useAudio = checkUseAudio();

  const sharingType = 'camera';

  // if(isVideoSwitch){
  //   useVideo = {
  //     deviceId: videoId
  //   }
  // }
  console.log(select_deviceid);
  // { deviceId: { exact: select_deviceid } }
  if(sharingType === 'camera'){
  const videoConstraints = select_deviceid
    ? { deviceId: { exact: select_deviceid } }
    : { facingMode: { ideal: "environment" } };

  mediaStartPromise = navigator.mediaDevices.getUserMedia({ audio: useAudio, video: videoConstraints })
    .then((stream) => {
      localStream = stream;
      playVideo(localVideo, localStream);
      updateButtons();
      publish().catch((err) => {
        console.error("auto publish ERROR:", err);
      });
      return localStream;
    })
    .catch(err => {
      console.error('media ERROR:', err);
      throw err;
    })
    .finally(() => {
      mediaStartPromise = null;
    });

  return mediaStartPromise;
  }else if(sharingType === 'screen'){
    mediaStartPromise = navigator.mediaDevices.getDisplayMedia({ audio: useAudio, video: useVideo })
    .then((stream) => {
      localStream = stream;
      playVideo(localVideo, localStream);
      updateButtons();
      publish().catch((err) => {
        console.error("auto publish ERROR:", err);
      });
      return localStream;
    })
    .catch(err => {
      console.error('media ERROR:', err);
      throw err;
    })
    .finally(() => {
      mediaStartPromise = null;
    });

    return mediaStartPromise;
  }
}

function stopMedia() {
  if (localStream) {
    pauseVideo(localVideo);
    stopLocalStream(localStream);
    localStream = null;
  }
  updateButtons();
}

async function publish() {
  if (isPublishing) {
    console.warn('WARN: publish already in progress');
    return;
  }

  if (producerTransport || videoProducer || audioProducer) {
    const state = producerTransport && producerTransport.connectionState ? producerTransport.connectionState : 'unknown';
    // Do not renegotiate while an existing publish transport is alive.
    if (state === 'new' || state === 'connecting' || state === 'connected') {
      console.warn('WARN: publish transport is active, skip duplicate publish');
      return;
    }

    console.warn('WARN: failed publish state detected, resetting transport');
    if (videoProducer) {
      videoProducer.close();
      videoProducer = null;
    }
    if (audioProducer) {
      audioProducer.close();
      audioProducer = null;
    }
    if (producerTransport) {
      producerTransport.close();
      producerTransport = null;
    }
  }

  isPublishing = true;

  if (!localStream) {
    try {
      await startMedia();
    } catch (err) {
      console.warn('WARN: local media NOT READY');
      isPublishing = false;
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
        
        // --- get capabilities --
        const data = await sendRequest('getRouterRtpCapabilities', {});
        console.log('getRouterRtpCapabilities:', data);
        await loadDevice(data);
      }catch(err){
        console.log(err);
      }
    }

    updateButtons();


  // if(device == null){
  //   alert("카메라가 없습니다.");
  // }

  // --- get transport info ---
  console.log('--- createProducerTransport --');
    const params = await sendRequest('createProducerTransport', {});
    console.log('transport params:', params);
    producerTransport = device.createSendTransport(params);
    console.log('createSendTransport:', producerTransport);

  // --- join & start publish --
  producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
    console.log('--trasnport connect');
    sendRequest('connectProducerTransport', { dtlsParameters: dtlsParameters })
      .then(callback)
      .catch(errback);
  });

  producerTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
    console.log('--trasnport produce');
    try {
      const { id } = await sendRequest('produce', {
        transportId: producerTransport.id,
        kind,
        rtpParameters,
        role: 'webview',
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
        setTimeout(()=>{
          webview_socket_emit();
        }, 2000);
        break;

      case 'failed':
        console.log('failed');
        producerTransport.close();
        reconnect();
        break;

      default:
        break;
    }
  });

    const useVideo = checkUseVideo();
    const useAudio = checkUseAudio();
    if (useVideo) {
      const videoTrack = localStream.getVideoTracks()[0];
      console.log(localStream.getVideoTracks())
      if (videoTrack) {
        const trackParams = { track: videoTrack };
        videoProducer = await producerTransport.produce(trackParams);
      }
    }
    if (useAudio) {
      try {
        await waitForTransportConnected(producerTransport);
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
          const trackParams = { track: audioTrack };
          audioProducer = await producerTransport.produce(trackParams);
        }
      } catch (err) {
        console.warn('audio publish skipped:', err);
      }
    }

    updateButtons();
  } finally {
    isPublishing = false;
  }
}

function disconnect_publish() {
  if (localStream) {
    pauseVideo(localVideo);
    stopLocalStream(localStream);
    localStream = null;
  }
  if (videoProducer) {
    videoProducer.close(); // localStream will stop
    videoProducer = null;
  }
  if (audioProducer) {
    audioProducer.close(); // localStream will stop
    audioProducer = null;
  }
  if (producerTransport) {
    producerTransport.close(); // localStream will stop
    producerTransport = null;
  }

  disconnectSocket2();
  updateButtons();
}

async function loadDevice(routerRtpCapabilities) {
  try {
    const isAndroid = /Android/i.test(navigator.userAgent || "");
    const deviceOptions = isAndroid ? { handlerName: "Chrome74" } : undefined;
    device = deviceOptions
      ? new MediasoupClient.Device(deviceOptions)
      : new MediasoupClient.Device();
  } catch (error) {
    if (error.name === 'UnsupportedError') {
      console.error('browser not supported');
    }
  }
  await device.load({ routerRtpCapabilities });
}


// ---- UI control ----
function updateButtons() {
  if (localStream) {
    disableElement('start_video_button');
    disableElement('use_video');
    disableElement('use_audio');
    if (isSocket2Connected()) {
      disableElement('stop_video_button');
    }
    else {
      enabelElement('stop_video_button');
    }

    if (videoProducer || audioProducer) {
      disableElement('publish_button');
    }
    else {
      enabelElement('publish_button');
    }
  }
  else {
    enabelElement('start_video_button');
    enabelElement('use_video');
    enabelElement('use_audio');
    disableElement('stop_video_button');
    disableElement('publish_button');
  }

  if (isSocket2Connected()) {
    enabelElement('disconnect_button');
  }
  else {
    disableElement('disconnect_button');
  }
}


function enabelElement(id) {
  let element = document.getElementById(id);
  if (element) {
    element.removeAttribute('disabled');
  }
}

function disableElement(id) {
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
    const data = await sendRequest('getRouterRtpCapabilities', {});
    console.log('getRouterRtpCapabilities:', data);
    await loadDevice(data);
  // }

  updateButtons();

  // --- get transport info ---
  console.log('--- createProducerTransport --');
  const params = await sendRequest('createProducerTransport', {});
  console.log('transport params:', params);
  producerTransport = device.createSendTransport(params);
  console.log('createSendTransport:', producerTransport);

  // --- join & start publish --
  producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
    console.log('--trasnport connect');
    sendRequest('connectProducerTransport', { dtlsParameters: dtlsParameters })
      .then(callback)
      .catch(errback);
  });

  producerTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
    console.log('--trasnport produce');
    try {
      const { id } = await sendRequest('produce', {
        transportId: producerTransport.id,
        kind,
        rtpParameters,
        role: 'webview',
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
        reconnect();
        break;

      default:
        break;
    }
  });

  const useVideo = checkUseVideo();
  const useAudio = checkUseAudio();
  
  if (useVideo) {
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      const trackParams = { track: videoTrack };
      videoProducer = await producerTransport.produce(trackParams);
    }
  }
  if (useAudio) {
    try {
      await waitForTransportConnected(producerTransport);
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        const trackParams = { track: audioTrack };
        audioProducer = await producerTransport.produce(trackParams);
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

      // Keep the same RTCPeerConnection and replace tracks to avoid SDP re-negotiation conflicts.
      if (videoProducer && nextVideoTrack) {
        videoProducer.replaceTrack({ track: nextVideoTrack });
      }
      if (audioProducer && nextAudioTrack) {
        audioProducer.replaceTrack({ track: nextAudioTrack });
      }

      if (localStream) {
        pauseVideo(localVideo);
        stopLocalStream(localStream);
      }
      localStream = stream;
      playVideo(localVideo, localStream);
      select_deviceid = nextDeviceId;
      updateButtons();
    })
    .catch(error => {
      console.error('Failed to get user media:', error);
    });
}

function reconnect(){
  disconnect_publish();
  connectSocket2();
  // // setTimeout(()=>{}, )
  // startMedia()
  // publish()
  stopMedia();
  startMedia();
  const checkMediaRunning = setInterval(()=>{
    if(localStream){
      republish();
      clearInterval(checkMediaRunning);
    }
  }, 500)
}

updateButtons();
getDevicesId();
// alert("device");
// publish();
console.log('=== ready ==='); 