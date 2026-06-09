    const remoteContainer = document.getElementsByClassName("view_video")[0];
    const stateSpan = document.getElementById("state_span");
    let localStream = null;
    let clientId = null;
    let device = null;
    let consumerTransport = null;
    let videoConsumer = null;
    let audioConsumer = null;

    let statsInterval = null;
    let fps = 0;
    let traffic = 0;
    let totalProcessingDelay = 0;

    console.log(remoteContainer);

    // ---- TODO ----
    //  DONE - (check can consumer for subcribe) --> subscribe before publish
    //  DONE - audio track
    //  - multiple rooms

    // =========== socket3.io ==========
    let socket3 = null;

    let keepAliveInterval = null;

    // return Promise
    function connectSocket3() {
      if (socket3) {
        socket3.close();
        socket3 = null;
        clientId = null;
      }

      clearInterval(keepAliveInterval);

      return new Promise((resolve, reject) => {
        // socket3 = io.connect("/");
        socket3 = io("/dynamic-" + convertStringToNumber(sessionStorage.getItem("code"))
         ); //io.connect("/");

        socket3.on("connect", function (evt) {
          console.log("socket3.io connected()");
        });
        socket3.on("error", function (err) {
          console.error("socket3.io ERROR:", err);
          reject(err);
        });
        socket3.on("disconnect", function (evt) {
          console.log("socket3.io disconnect:", evt);
        });
        socket3.on("message", function (message) {
          console.log("socket3.io message:", message);
          if (message.type === "welcome") {
            if (socket3.id !== message.id) {
              console.warn(
                "WARN: something wrong with clientID",
                socket3.io,
                message.id
              );
            }

            clientId = message.id;
            console.log("connected to server. clientId=" + clientId);
            resolve();
          } else {
            console.error("UNKNOWN message from server:", message);
          }
        });
        socket3.on("newProducer", async function (message) {
          console.log("socket3.io newProducer:", message);
          if (!consumerTransport) {
            subscribe().catch((err) => console.error("newProducer subscribe ERROR:", err));
            return;
          }
          if (message.kind === "video") {
            videoConsumer = await consumeAndResume(consumerTransport, message.kind);
          } else if (message.kind === "audio") {
            audioConsumer = await consumeAndResume(consumerTransport, message.kind);
          }
        });

        socket3.on("producerClosed", function (message) {
          console.log("socket3.io producerClosed:", message);
          const localId = message.localId;
          const remoteId = message.remoteId;
          const kind = message.kind;
          console.log(
            "--try removeConsumer remoteId=" +
              remoteId +
              ", localId=" +
              localId +
              ", kind=" +
              kind
          );
          if (kind === "video") {
            if (videoConsumer) {
              videoConsumer.close();
              videoConsumer = null;
            }
          } else if (kind === "audio") {
            if (audioConsumer) {
              audioConsumer.close();
              audioConsumer = null;
            }
          }

          if (remoteId) {
            removeRemoteVideo(remoteId);
          } else {
            removeAllRemoteVideo();
          }
        });

        socket3.on("publisherReady", function (data) {
          if (!document.getElementsByTagName("video")[0] && data.room === 1) {
            subscribe();
          }
        });

        if (socket3) {
          keepAliveInterval = setInterval(function () {
            socket3.emit("aliveChecker", {});
          }, 3000);
        }

      });
    }

    function disconnectSocket3() {
      if (socket3) {
        socket3.close();
        socket3 = null;
        clientId = null;
        console.log("socket3.io closed..");
      }
    }

    function isSocket3Connected() {
      if (socket3) {
        return true;
      } else {
        return false;
      }
    }

    function sendRequest(type, data) {
      return new Promise((resolve, reject) => {
        socket3.emit(type, data, (err, response) => {
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
    /*
  function stopLocalStream(stream) {
    let tracks = stream.getTracks();
    if (!tracks) {
      console.warn('NO tracks');
      return;
    }
    tracks.forEach(track => track.stop());
  }
  */

    // return Promise
    function playVideo(element, stream) {
        if (element.srcObject) {
            console.warn("element ALREADY playing, so ignore");
            return;
        }
        $(".view_video").attr("muted");
        element.srcObject = stream; 
    //   $(".view_video").attr("muted" , true);
      return element.play();
    }

    function pauseVideo(element) {
      element.pause();
      element.srcObject = null;
    }

    function addRemoteTrack(id, track) {
      let video = remoteContainer;
    //   console.log(video); 
      if (!video) {
        video = remoteContainer;
      }

      if (video.srcObject) {
        video.srcObject.addTrack(track);
        return;
      }

      const newStream = new MediaStream();
      newStream.addTrack(track);

          playVideo(video, newStream)
            .then(() => {
              $(".view_video").removeAttr("muted");
              video.volume = 1.0;
            })
            .catch((err) => {
              console.error("media ERROR:", err);
            });
    }

    function addRemoteVideo(id) {
      let existElement = findRemoteVideo(id);
      if (existElement) {
        console.warn("remoteVideo element ALREADY exist for id=" + id);
        return existElement;
      }

      let element = document.getElementsByClassName("view_video")[0];
    //   remoteContainer.appendChild(element);
        element.id = "remote_" + id;
        console.log(element);
    //   element.width = 480;
    //   element.height = 360;
        element.volume = 0;
      //element.controls = true;
    //   element.style = "border: solid black 1px;";
      return element;
    }

    function findRemoteVideo(id) {
      let element = document.getElementById("remote_" + id);
      return element;
    }

    function removeRemoteVideo(id) {
      console.log(" ---- removeRemoteVideo() id=" + id);
      let element = document.getElementById("remote_" + id);
      if (element) {
        element.pause();
        element.srcObject = null;
        remoteContainer.removeChild(element);
      } else {
        console.log("child element NOT FOUND");
      }
    }

    function removeAllRemoteVideo() {
      while (remoteContainer.firstChild) {
        remoteContainer.firstChild.pause();
        remoteContainer.firstChild.srcObject = null;
        remoteContainer.removeChild(remoteContainer.firstChild);
      }
    }

    // ============ UI button ==========

    async function subscribe() {
      if (consumerTransport) {
        console.warn("subscribe: already subscribed, skip");
        return;
      }

      if (!isSocket3Connected()) {
        await connectSocket3().catch((err) => {
          console.error(err);
          return;
        });

        // --- get capabilities --
        const data = await sendRequest("getRouterRtpCapabilities", {});
        console.log("getRouterRtpCapabilities:", data);
        await loadDevice(data);
      }

      updateButtons();

      // --- prepare transport ---
      console.log("--- createConsumerTransport --");
      const params = await sendRequest("createConsumerTransport", {});
      console.log("transport params:", params);
      consumerTransport = device.createRecvTransport(params);
      console.log("createConsumerTransport:", consumerTransport);

      // --- NG ---
      //sendRequest('connectConsumerTransport', { dtlsParameters: dtlsParameters })
      //  .then(callback)
      //  .catch(errback);

      // --- try --- not well
      //sendRequest('connectConsumerTransport', { dtlsParameters: params.dtlsParameters })
      //  .then(() => console.log('connectConsumerTransport OK'))
      //  .catch(err => console.error('connectConsumerTransport ERROR:', err));

      // --- join & start publish --
      consumerTransport.on(
        "connect",
        async ({ dtlsParameters }, callback, errback) => {
          console.log("--consumer trasnport connect");
          sendRequest("connectConsumerTransport", {
            dtlsParameters: dtlsParameters,
          })
            .then(callback)
            .catch(errback);

          //consumer = await consumeAndResume(consumerTransport);
        }
      );

      consumerTransport.on("connectionstatechange", (state) => {
        switch (state) {
          case "connecting":
            console.log("subscribing...");
            break;

          case "connected":
            console.log("subscribed");
            break;

          case "failed":
            console.log("failed");
            reconnect();
            producerTransport.close();
            break;

          default:
            break;
        }
      });

      // Get subscription stats every 2 seconds
      // startGetStatsPer2Sec(consumerTransport);

      videoConsumer = await consumeAndResume(consumerTransport, "video");
      audioConsumer = await consumeAndResume(consumerTransport, "audio");

      updateButtons();
    }

    async function consumeAndResume(transport, kind) {
      const consumer = await consume(consumerTransport, kind);
      if (consumer) {
        console.log("-- track exist, consumer ready. kind=" + kind);
        updateButtons();
        console.log("-- resume kind=" + kind);
        sendRequest("resume", { kind: kind })
          .then(() => {
            console.log("resume OK");
            return consumer;
          })
          .catch((err) => {
            console.error("resume ERROR:", err);
            return consumer;
          });
      } else {
        console.log("-- no consumer yet. kind=" + kind);
        return null;
      }
    }

    function disconnect() {
      if (videoConsumer) {
        videoConsumer.close();
        videoConsumer = null;
      }
      if (audioConsumer) {
        audioConsumer.close();
        audioConsumer = null;
      }
      if (consumerTransport) {
        consumerTransport.close();
        consumerTransport = null;
      }
      // stopGetStatsPer2Sec();
      pauseVideo(remoteContainer);
      clearInterval(keepAliveInterval);
      removeAllRemoteVideo();
      disconnect_publish();
      disconnectSocket3();
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
        if (error.name === "UnsupportedError") {
          console.error("browser not supported");
        }
      }
      await device.load({ routerRtpCapabilities });
    }

    async function consume(transport, trackKind) {
      console.log("--start of consume --kind=" + trackKind);
      const { rtpCapabilities } = device;
      //const data = await socket3.request('consume', { rtpCapabilities });
      const data = await sendRequest("consume", {
        rtpCapabilities: rtpCapabilities,
        kind: trackKind,
        wantRole: 'webview',
      }).catch((err) => {
        console.error("consume ERROR:", err);
      });
      const { producerId, id, kind, rtpParameters } = data;
      // console.log(data);
      if (producerId) {
        let codecOptions = {};
        const consumer = await transport.consume({
          id,
          producerId,
          kind,
          rtpParameters,
          codecOptions,
        });
        //const stream = new MediaStream();
        //stream.addTrack(consumer.track);

        // Get subscription stats every 2 seconds
        // setInterval(async () => {
        //   const stats = await consumer.getStats();
        //   // console.log(stats); //.get("inbound-rtp")
        //   const inboundRtpStats = stats.filter((stats) => {
        //     console.log(stats.type, stats.trackId);
        //     return (
        //       stats.type === "inbound-rtp" &&
        //       stats.trackId === consumer.track.id
        //     );
        //   });
        //   if (inboundRtpStats) {
        //     console.log(`FPS: ${inboundRtpStats.framesPerSecond}`);
        //     console.log(`Traffic: ${inboundRtpStats.bytesReceived}`);
        //   }
        //   s;
        // }, 2000);

        addRemoteTrack(clientId, consumer.track);

        console.log("--end of consume");
        //return stream;

        return consumer;
      } else {
        console.warn("--- remote producer NOT READY");

        return null;
      }
    }

    // ---- UI control ----
    function updateButtons() {
      if (isSocket3Connected()) {
        enabelElement("disconnect_button");
      } else {
        disableElement("disconnect_button");
      }

      if (consumerTransport) {
        disableElement("subscribe_button");
      } else {
        enabelElement("subscribe_button");
      }
    }

    function enabelElement(id) {
      let element = document.getElementById(id);
      if (element) {
        element.removeAttribute("disabled");
      }
    }

    function disableElement(id) {
      let element = document.getElementById(id);
      if (element) {
        element.setAttribute("disabled", "1");
      }
    }

    // start get status of webrtc
    function startGetStatsPer2Sec(transport) {
      statsInterval = setInterval(async () => {
        transport.getStats(null).then((stats) => {
          stats.forEach((report) => {
            if (
              report.type === "inbound-rtp" &&
              report.kind === "video" &&
              report.framesPerSecond
            ) {
              let prevTraffic = traffic;
              fps = report.framesPerSecond;
              traffic = report.bytesReceived;
              totalProcessingDelay = report.totalProcessingDelay;
              // console.log(`FPS: ${fps}`);
              // console.log(`PrevTraffic: ${prevTraffic}`);
              // console.log(`Traffic: ${traffic}`);
              // console.log(`totalProcessingDelay: ${totalProcessingDelay}ms`);
            }
          });
        });
      }, 2000);
    }

    // stop get status of webrtc
    function stopGetStatsPer2Sec() {
      clearInterval(statsInterval);
      fps = 0;
      traffic = 0;
      totalProcessingDelay = 0;
    }

    function reconnect() {
      console.log("try reconnect");
      disconnect();
      connectSocket3();
      // subscribe();
    }


    updateButtons();

    console.log("=== ready ===");


    function video_control(obj){
      
      // if(join_check == true){
        
                if($(obj).hasClass("start_video") == true){
                  $(obj).removeClass("start_video");
                  $(obj).find('img').attr("src" , "../images/started_video.svg");
                  disconnect();
                  _stopMedia();
                  disconnect_publish();
                  disconnected_xr();
                }else{
                  $(obj).addClass("start_video");
                  $(obj).find('img').attr("src" , "../images/cancel_video.svg");
                  console.log($(obj).find('img'));
                  
                  publish();
                }

      // }else{
      //   alert("유저가 아직 접속하지않았습니다.");
      // }


    }

    var ismuted = false;
    function muted_setting(obj){
      var imgobj = $(obj).children()[0];
      if(ismuted == false){
        const audio = document.querySelector('.view_video');
        audio.volume = 0;
        $(imgobj).attr("src" , "../images/sound.svg");
        ismuted = true;

      }else{
        const audio = document.querySelector('.view_video');
        audio.volume = 1.0;
        $(imgobj).attr("src" , "../images/active_voice.svg");
        ismuted = false;
      }
    }


    var micismuted = false;
    function micmuted_setting(obj){
      var imgobj = $(obj).children()[0];
      var senddata = {
        "room" : room,
        'micismuted' : micismuted,
      }
      if(micismuted == false){
        const audio = document.querySelector('.view_video');
        audio.volume = 0;
        $(imgobj).attr("src" , "../images/voice.svg");
        socket.emit("muted" , senddata);
        micismuted = true;

      }else{
        const audio = document.querySelector('.view_video');
        audio.volume = 1.0;
        $(imgobj).attr("src" , "../images/acrive_mic.svg");
        socket.emit("muted" , senddata);
        micismuted = false;
      }
    }

    var editisactive = false;
    function edit_control(obj){
      var imgobj = $(obj).children()[0];
      if(editisactive == false){
        $(".canvasbox").css("display", "none");
        $(imgobj).attr("src" , "../images/edit.svg");
        editisactive = true;

      }else{
        $(".canvasbox").css("display", "flex");
        $(imgobj).attr("src" , "../images/active_edit.svg");
        editisactive = false;
      }
    }