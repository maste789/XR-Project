    const webviewremoteContainer = document.getElementsByClassName("send_video")[0];
    // const stateSpan = document.getElementById("state_span");
    let webview_localStream = null;
    let webview_clientId = null;
    let webview_device = null;
    let webview_consumerTransport = null;
    let webview_videoConsumer = null;
    let webview_audioConsumer = null;

    let statsInterval = null;
    let fps = 0;
    let traffic = 0;
    let totalProcessingDelay = 0;

    console.log(webviewremoteContainer);

    // ---- TODO ----
    //  DONE - (check can consumer for subcribe) --> subscribe before publish
    //  DONE - audio track
    //  - multiple rooms

    // =========== socket3.io ==========
    let socket3 = null;

    let webview_keepAliveInterval = null;

    // return Promise
    function connectSocket3() {
      if (socket3) {
        socket3.close();
        socket3 = null;
        webview_clientId = null;
      }

      clearInterval(webview_keepAliveInterval);

      return new Promise((resolve, reject) => {
        // socket3 = io.connect("/");
        socket3 =  io("/dynamic-" + convertStringToNumber(sessionStorage.getItem("code"))); //io.connect("/");

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
                "WARN: something wrong with webview_clientID",
                socket3.io,
                message.id
              );
            }

            webview_clientId = message.id;
            console.log("connected to server. webview_clientId=" + webview_clientId);
            resolve();
          } else {
            console.error("UNKNOWN message from server:", message);
          }
        });
        socket3.on("newProducer", async function (message) {
          console.log("socket3.io newProducer:", message);
          if (!webview_consumerTransport) {
            // Transport not ready yet — kick off full subscribe flow.
            subscribe().catch((err) => console.error("newProducer subscribe ERROR:", err));
            return;
          }
          if (message.kind === "video") {
            webview_videoConsumer = await consumeAndResume(
              webview_consumerTransport,
              message.kind
            );
          } else if (message.kind === "audio") {
            webview_audioConsumer = await consumeAndResume(
              webview_consumerTransport,
              message.kind
            );
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
            if (webview_videoConsumer) {
              webview_videoConsumer.close();
              webview_videoConsumer = null;
            }
          } else if (kind === "audio") {
            if (webview_audioConsumer) {
              webview_audioConsumer.close();
              webview_audioConsumer = null;
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
              // subscribe();
              }
            });
            
            if (socket3) {
              webview_keepAliveInterval = setInterval(function () {
                socket3.emit("aliveChecker", {});
              }, 3000);
            }
            
          });
          
    }

    

    function disconnectSocket3() {
      if (socket3) {
        socket3.close();
        socket3 = null;
        webview_clientId = null;
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

    function webview_sendRequest(type, data) {
      console.log(type,data);

      return new Promise((resolve, reject) => {
        console.log("11111");
        socket3.emit(type, data, (err, response) => {
          if (!err) {
            console.log(response);
            // Success response, so pass the mediasoup response to the local Room.
            resolve(response);
          } else {
            console.log(err);
            reject(err);
          }
        });
      });
    }

    // =========== media handling ==========
    /*
  function stopwebview_localStream(stream) {
    let tracks = stream.getTracks();
    if (!tracks) {
      console.warn('NO tracks');
      return;
    }
    tracks.forEach(track => track.stop());
  }
  */

    // return Promise
    function webview_playVideo(element, stream) {
        if (element.srcObject) {
            console.warn("element ALREADY playing, so ignore");
            return;
        }
        console.log('webview_playvideo');
        $(".view_video").attr("muted");
        element.srcObject = stream; 
        console.log(element.srcObject);
    //   $(".view_video").attr("muted" , true);
      return element.play();
    }

    function _pauseVideo(element) {
      element.pause();
      element.srcObject = null;
    }

    function addRemoteTrack(id, track) {
      let video = webviewremoteContainer;
    //   console.log(video); 
      if (!video) {
        video = webviewremoteContainer;
      }

      if (video.srcObject) {
        video.srcObject.addTrack(track);
        return;
      }

      const newStream = new MediaStream();
      newStream.addTrack(track);

          webview_playVideo(video, newStream)
            .then(() => {
              $(".view_video").removeAttr("muted");
              video.volume = 1.0;
              console.log(video.volume);
              console.log(video.volume);
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
    //   webviewremoteContainer.appendChild(element);
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
        webviewremoteContainer.removeChild(element);
      } else {
        console.log("child element NOT FOUND");
      }
    }

    function removeAllRemoteVideo() {
      while (webviewremoteContainer.firstChild) {
        webviewremoteContainer.firstChild.pause();
        webviewremoteContainer.firstChild.srcObject = null;
        webviewremoteContainer.removeChild(webviewremoteContainer.firstChild);
      }
    }

    // ============ UI button ==========

    async function subscribe() {
      console.log('1234');
      if (!isSocket3Connected()) {
        // console.log(isSocket3Connected())
        await connectSocket3().catch((err) => {
          console.error(err);
          return;
        });

        // --- get capabilities --
        const data = await webview_sendRequest("getRouterRtpCapabilities", {});
        console.log("getRouterRtpCapabilities:", data);
        await loadwebview_Device(data);
      }

      

      _updateButtons();

      // --- prepare transport ---
      console.log("--- createwebview_ConsumerTransport --");
      const params = await webview_sendRequest("createConsumerTransport", {});
      console.log("transport params:", params);
      webview_consumerTransport = webview_device.createRecvTransport(params);
      console.log("createwebview_ConsumerTransport:", webview_consumerTransport);

      // --- NG ---
      //webview_sendRequest('connectwebview_ConsumerTransport', { dtlsParameters: dtlsParameters })
      //  .then(callback)
      //  .catch(errback);

      // --- try --- not well
      //webview_sendRequest('connectwebview_ConsumerTransport', { dtlsParameters: params.dtlsParameters })
      //  .then(() => console.log('connectwebview_ConsumerTransport OK'))
      //  .catch(err => console.error('connectwebview_ConsumerTransport ERROR:', err));

      // --- join & start publish --
      webview_consumerTransport.on(
        "connect",
        async ({ dtlsParameters }, callback, errback) => {
          console.log("--consumer trasnport connect");
          webview_sendRequest("connectConsumerTransport", {
            dtlsParameters: dtlsParameters,
          })
            .then(callback)
            .catch(errback);

          //consumer = await consumeAndResume(webview_consumerTransport);
        }
      );

      webview_consumerTransport.on("connectionstatechange", (state) => {
        switch (state) {
          case "connecting":
            console.log("subscribing...");
            break;

          case "connected":
            console.log("subscribed");
            break;

          case "failed":
            console.log("failed");
            _reconnect();

            producerTransport.close();
            break;

          default:
            break;
        }
      });

      // Get subscription stats every 2 seconds
      // startGetStatsPer2Sec(webview_consumerTransport);

      webview_videoConsumer = await consumeAndResume(webview_consumerTransport, "video");
      webview_audioConsumer = await consumeAndResume(webview_consumerTransport, "audio");

      _updateButtons();
    }

    async function consumeAndResume(transport, kind) {
      console.log(kind)

      const consumer = await _consume(webview_consumerTransport, kind);
      if (consumer) {
        console.log("-- track exist, consumer ready. kind=" + kind);
        _updateButtons();
        console.log("-- resume kind=" + kind);
        webview_sendRequest("resume", { kind: kind })
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

    function webview_disconnect() {
      if (webview_videoConsumer) {
        webview_videoConsumer.close();
        webview_videoConsumer = null;
      }
      if (webview_audioConsumer) {
        webview_audioConsumer.close();
        webview_audioConsumer = null;
      }
      if (webview_consumerTransport) {
        webview_consumerTransport.close();
        webview_consumerTransport = null;
        console.log("null-------------------------")
      }
      // stopGetStatsPer2Sec();

      removeAllRemoteVideo();
      // disconnect_publish();
      disconnectSocket3();
      _updateButtons();
    }

    async function loadwebview_Device(routerRtpCapabilities) {
      try {
        const isAndroid = /Android/i.test(navigator.userAgent || "");
        const deviceOptions = isAndroid ? { handlerName: "Chrome74" } : undefined;
        webview_device = deviceOptions
          ? new MediasoupClient.Device(deviceOptions)
          : new MediasoupClient.Device();
        console.log(webview_device);
      } catch (error) {
        if (error.name === "UnsupportedError") {
          console.error("browser not supported");
        }
      }
      await webview_device.load({ routerRtpCapabilities });
    }

    async function _consume(transport, trackKind) {
      console.log("--start of consume --kind=" + trackKind);
      const { rtpCapabilities } = webview_device;
      //const data = await socket3.request('consume', { rtpCapabilities });
      const data = await webview_sendRequest("consume", {
        rtpCapabilities: rtpCapabilities,
        kind: trackKind,
        wantRole: 'mainpage',
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

        addRemoteTrack(webview_clientId, consumer.track);

        console.log("--end of consume");
        //return stream;

        return consumer;
      } else {
        console.warn("--- remote producer NOT READY");

        return null;
      }
    }

    // ---- UI control ----
    function _updateButtons() {
      if (isSocket3Connected()) {
        _enabelElement("disconnect_button");
      } else {
        _disableElement("disconnect_button");
      }

      if (webview_consumerTransport) {
        _disableElement("subscribe_button");
      } else {
        _enabelElement("subscribe_button");
      }
    }

    function _enabelElement(id) {
      let element = document.getElementById(id);
      if (element) {
        element.removeAttribute("disabled");
      }
    }

    function _disableElement(id) {
      let element = document.getElementById(id);
      if (element) {
        element.setAttribute("disabled", "1");
      }
    }

    // // start get status of webrtc
    // function startGetStatsPer2Sec(transport) {
    //   statsInterval = setInterval(async () => {
    //     transport.getStats(null).then((stats) => {
    //       stats.forEach((report) => {
    //         if (
    //           report.type === "inbound-rtp" &&
    //           report.kind === "video" &&
    //           report.framesPerSecond
    //         ) {
    //           let prevTraffic = traffic;
    //           fps = report.framesPerSecond;
    //           traffic = report.bytesReceived;
    //           totalProcessingDelay = report.totalProcessingDelay;
    //           // console.log(`FPS: ${fps}`);
    //           // console.log(`PrevTraffic: ${prevTraffic}`);
    //           // console.log(`Traffic: ${traffic}`);
    //           // console.log(`totalProcessingDelay: ${totalProcessingDelay}ms`);
    //         }
    //       });
    //     });
    //   }, 2000);
    // }

    // // stop get status of webrtc
    // function stopGetStatsPer2Sec() {
    //   clearInterval(statsInterval);
    //   fps = 0;
    //   traffic = 0;
    //   totalProcessingDelay = 0;
    // }

    _updateButtons();

    function _reconnect() {
      console.log("try _reconnect");
      webview_disconnect();
      connectSocket3();
      subscribe();
    }

    // subscribe() is triggered from webview_page.html inline script after all scripts load.

    console.log("=== ready ===");


    // connectSocket3()

      // subscribe();

    // subscribe();