
var lc;
var lastNormalizedDrawSnapshot = null;

// 영상 실제 표시 영역(object-fit: contain 기준)을 좌표 기준으로 사용
function getVideoContentRect() {
  var video = document.querySelector(".view_video");
  var container =
    document.querySelector(".canvasbox") ||
    document.querySelector(".videobox");
  var drawing = document.querySelector(".lc-drawing");

  if (!container) {
    var fallbackW = drawing ? drawing.clientWidth : 1;
    var fallbackH = drawing ? drawing.clientHeight : 1;
    return { offsetX: 0, offsetY: 0, width: fallbackW, height: fallbackH };
  }

  var containerW = container.clientWidth;
  var containerH = container.clientHeight;
  var videoW = video && video.videoWidth ? video.videoWidth : containerW;
  var videoH = video && video.videoHeight ? video.videoHeight : containerH;

  if (!videoW || !videoH) {
    return { offsetX: 0, offsetY: 0, width: containerW, height: containerH };
  }

  var containerRatio = containerW / containerH;
  var videoRatio = videoW / videoH;
  var displayW;
  var displayH;
  var offsetX;
  var offsetY;

  if (containerRatio > videoRatio) {
    displayH = containerH;
    displayW = containerH * videoRatio;
    offsetX = (containerW - displayW) / 2;
    offsetY = 0;
  } else {
    displayW = containerW;
    displayH = containerW / videoRatio;
    offsetX = 0;
    offsetY = (containerH - displayH) / 2;
  }

  return {
    offsetX: offsetX,
    offsetY: offsetY,
    width: displayW,
    height: displayH,
  };
}

function normCoord(x, y, ref) {
  return [
    (x - ref.offsetX) / ref.width,
    (y - ref.offsetY) / ref.height,
  ];
}

function denormCoord(nx, ny, ref) {
  return {
    x: ref.offsetX + nx * ref.width,
    y: ref.offsetY + ny * ref.height,
  };
}

function normSize(size, ref) {
  return size / ref.width;
}

function denormSize(size, ref) {
  return size * ref.width;
}

function normalizeShapeData(data, className, ref) {
  var d = JSON.parse(JSON.stringify(data));
  var pair;
  var i;

  switch (className) {
    case "Rectangle":
    case "Ellipse":
      pair = normCoord(d.x, d.y, ref);
      d.x = pair[0];
      d.y = pair[1];
      d.width = d.width / ref.width;
      d.height = d.height / ref.height;
      d.strokeWidth = normSize(d.strokeWidth, ref);
      break;
    case "Line":
      pair = normCoord(d.x1, d.y1, ref);
      d.x1 = pair[0];
      d.y1 = pair[1];
      pair = normCoord(d.x2, d.y2, ref);
      d.x2 = pair[0];
      d.y2 = pair[1];
      d.strokeWidth = normSize(d.strokeWidth, ref);
      break;
    case "LinePath":
    case "ErasedLinePath":
      if (d.pointCoordinatePairs) {
        for (i = 0; i < d.pointCoordinatePairs.length; i++) {
          pair = normCoord(
            d.pointCoordinatePairs[i][0],
            d.pointCoordinatePairs[i][1],
            ref
          );
          d.pointCoordinatePairs[i] = pair;
        }
      }
      if (d.smoothedPointCoordinatePairs) {
        for (i = 0; i < d.smoothedPointCoordinatePairs.length; i++) {
          pair = normCoord(
            d.smoothedPointCoordinatePairs[i][0],
            d.smoothedPointCoordinatePairs[i][1],
            ref
          );
          d.smoothedPointCoordinatePairs[i] = pair;
        }
      }
      if (d.points) {
        for (i = 0; i < d.points.length; i++) {
          d.points[i].data = normalizeShapeData(
            d.points[i].data,
            d.points[i].className,
            ref
          );
        }
      }
      if (d.pointSize) {
        d.pointSize = normSize(d.pointSize, ref);
      }
      break;
    case "Point":
      pair = normCoord(d.x, d.y, ref);
      d.x = pair[0];
      d.y = pair[1];
      d.size = normSize(d.size, ref);
      break;
    case "Polygon":
      for (i = 0; i < d.pointCoordinatePairs.length; i++) {
        pair = normCoord(
          d.pointCoordinatePairs[i][0],
          d.pointCoordinatePairs[i][1],
          ref
        );
        d.pointCoordinatePairs[i] = pair;
      }
      d.strokeWidth = normSize(d.strokeWidth, ref);
      break;
    case "Text":
      pair = normCoord(d.x, d.y, ref);
      d.x = pair[0];
      d.y = pair[1];
      if (d.forcedWidth) {
        d.forcedWidth = d.forcedWidth / ref.width;
      }
      if (d.forcedHeight) {
        d.forcedHeight = d.forcedHeight / ref.height;
      }
      if (d.font) {
        d.font = d.font.replace(/(\d+(?:\.\d+)?)px/, function (_, n) {
          return normSize(parseFloat(n), ref) + "px";
        });
      }
      break;
    case "Image":
      pair = normCoord(d.x, d.y, ref);
      d.x = pair[0];
      d.y = pair[1];
      break;
  }

  return d;
}

function denormalizeShapeData(data, className, normRef, targetRef) {
  var d = JSON.parse(JSON.stringify(data));
  var pair;
  var i;
  var point;

  switch (className) {
    case "Rectangle":
    case "Ellipse":
      point = denormCoord(d.x, d.y, targetRef);
      d.x = point.x;
      d.y = point.y;
      d.width = d.width * targetRef.width;
      d.height = d.height * targetRef.height;
      d.strokeWidth = denormSize(d.strokeWidth, targetRef);
      break;
    case "Line":
      point = denormCoord(d.x1, d.y1, targetRef);
      d.x1 = point.x;
      d.y1 = point.y;
      pair = denormCoord(d.x2, d.y2, targetRef);
      d.x2 = pair.x;
      d.y2 = pair.y;
      d.strokeWidth = denormSize(d.strokeWidth, targetRef);
      break;
    case "LinePath":
    case "ErasedLinePath":
      if (d.pointCoordinatePairs) {
        for (i = 0; i < d.pointCoordinatePairs.length; i++) {
          point = denormCoord(
            d.pointCoordinatePairs[i][0],
            d.pointCoordinatePairs[i][1],
            targetRef
          );
          d.pointCoordinatePairs[i] = [point.x, point.y];
        }
      }
      if (d.smoothedPointCoordinatePairs) {
        for (i = 0; i < d.smoothedPointCoordinatePairs.length; i++) {
          point = denormCoord(
            d.smoothedPointCoordinatePairs[i][0],
            d.smoothedPointCoordinatePairs[i][1],
            targetRef
          );
          d.smoothedPointCoordinatePairs[i] = [point.x, point.y];
        }
      }
      if (d.points) {
        for (i = 0; i < d.points.length; i++) {
          d.points[i].data = denormalizeShapeData(
            d.points[i].data,
            d.points[i].className,
            normRef,
            targetRef
          );
        }
      }
      if (d.pointSize) {
        d.pointSize = denormSize(d.pointSize, targetRef);
      }
      break;
    case "Point":
      point = denormCoord(d.x, d.y, targetRef);
      d.x = point.x;
      d.y = point.y;
      d.size = denormSize(d.size, targetRef);
      break;
    case "Polygon":
      for (i = 0; i < d.pointCoordinatePairs.length; i++) {
        point = denormCoord(
          d.pointCoordinatePairs[i][0],
          d.pointCoordinatePairs[i][1],
          targetRef
        );
        d.pointCoordinatePairs[i] = [point.x, point.y];
      }
      d.strokeWidth = denormSize(d.strokeWidth, targetRef);
      break;
    case "Text":
      point = denormCoord(d.x, d.y, targetRef);
      d.x = point.x;
      d.y = point.y;
      if (d.forcedWidth) {
        d.forcedWidth = d.forcedWidth * targetRef.width;
      }
      if (d.forcedHeight) {
        d.forcedHeight = d.forcedHeight * targetRef.height;
      }
      if (d.font) {
        d.font = d.font.replace(/(\d+(?:\.\d+)?)px/, function (_, n) {
          return denormSize(parseFloat(n), targetRef) + "px";
        });
      }
      break;
    case "Image":
      point = denormCoord(d.x, d.y, targetRef);
      d.x = point.x;
      d.y = point.y;
      break;
  }

  return d;
}

function normalizeSnapshot(snapshot) {
  var ref = getVideoContentRect();
  var normalized = JSON.parse(JSON.stringify(snapshot));
  var i;

  normalized.coordSpace = "normalized-v1";
  normalized.refRect = {
    width: ref.width,
    height: ref.height,
    offsetX: ref.offsetX,
    offsetY: ref.offsetY,
  };
  normalized.imageSize = { width: 1, height: 1 };
  delete normalized.scale;
  delete normalized.position;

  if (normalized.shapes) {
    for (i = 0; i < normalized.shapes.length; i++) {
      normalized.shapes[i].data = normalizeShapeData(
        normalized.shapes[i].data,
        normalized.shapes[i].className,
        ref
      );
    }
  }
  if (normalized.backgroundShapes) {
    for (i = 0; i < normalized.backgroundShapes.length; i++) {
      normalized.backgroundShapes[i].data = normalizeShapeData(
        normalized.backgroundShapes[i].data,
        normalized.backgroundShapes[i].className,
        ref
      );
    }
  }

  return normalized;
}

function denormalizeSnapshot(snapshot) {
  var targetRef = getVideoContentRect();
  var local = JSON.parse(JSON.stringify(snapshot));
  var normRef = { offsetX: 0, offsetY: 0, width: 1, height: 1 };
  var i;

  if (local.shapes) {
    for (i = 0; i < local.shapes.length; i++) {
      local.shapes[i].data = denormalizeShapeData(
        local.shapes[i].data,
        local.shapes[i].className,
        normRef,
        targetRef
      );
    }
  }
  if (local.backgroundShapes) {
    for (i = 0; i < local.backgroundShapes.length; i++) {
      local.backgroundShapes[i].data = denormalizeShapeData(
        local.backgroundShapes[i].data,
        local.backgroundShapes[i].className,
        normRef,
        targetRef
      );
    }
  }

  local.imageSize = {
    width: targetRef.width,
    height: targetRef.height,
  };
  delete local.scale;
  delete local.position;
  delete local.coordSpace;
  delete local.refRect;

  return local;
}

function applyLegacyScale(set_data) {
  var drawing = document.querySelector(".lc-drawing");
  var my_width = drawing ? drawing.clientWidth : $(".view_video").innerWidth();
  var my_height = drawing ? drawing.clientHeight : $(".view_video").innerHeight();
  var sourceW = set_data.imageSize ? set_data.imageSize.width : my_width;
  var sourceH = set_data.imageSize ? set_data.imageSize.height : my_height;
  var scaleX = my_width / sourceW;
  var scaleY = my_height / sourceH;

  set_data.scale = Math.min(scaleX, scaleY);
  return set_data;
}

function prepareDrawPayload(snapshot) {
  return JSON.stringify(normalizeSnapshot(snapshot));
}

function applyDrawPayload(rawData) {
  if (!lc) {
    return;
  }

  var parsed =
    typeof rawData === "string" ? JSON.parse(rawData) : JSON.parse(JSON.stringify(rawData));
  var localSnapshot;

  if (parsed.coordSpace === "normalized-v1") {
    lastNormalizedDrawSnapshot = parsed;
    localSnapshot = denormalizeSnapshot(parsed);
  } else {
    lastNormalizedDrawSnapshot = null;
    localSnapshot = applyLegacyScale(parsed);
  }

  lc.loadSnapshot(localSnapshot);
  lc.respondToSizeChange();
}

function emitDrawSnapshot(snapshot) {
  if (!socket || !room) {
    return;
  }

  socket.emit("draw", {
    room: room,
    drawdata: prepareDrawPayload(snapshot),
  });
}

window.redrawCanvasForCurrentView = function () {
  if (lastNormalizedDrawSnapshot) {
    applyDrawPayload(lastNormalizedDrawSnapshot);
    return;
  }
  if (lc && lc.respondToSizeChange) {
    lc.respondToSizeChange();
  }
};

setTimeout(() => {
  lc = LC.init(
                  $(".canvasbox")[0],
                  {
                      // disable panning
                      keyboardShortcuts: false,
                      tools: [LC.tools.Pencil, LC.tools.Eraser, LC.tools.Line,
                        LC.tools.Rectangle, LC.tools.Text, LC.tools.Eyedropper]
                  }
                  
              );
              if(location.href.includes("webview") != true){
                lc.on('drawEnd', function() {
                  emitDrawSnapshot(lc.getSnapshot());
                });
              }

              var viewVideo = document.querySelector(".view_video");
              if (viewVideo) {
                viewVideo.addEventListener("loadedmetadata", function () {
                  if (lastNormalizedDrawSnapshot) {
                    applyDrawPayload(lastNormalizedDrawSnapshot);
                  }
                });
              }

              var layoutTarget =
                document.querySelector(".videobox") ||
                document.querySelector(".canvasbox");
              if (layoutTarget && typeof ResizeObserver !== "undefined") {
                var layoutObserver = new ResizeObserver(function () {
                  if (lastNormalizedDrawSnapshot) {
                    applyDrawPayload(lastNormalizedDrawSnapshot);
                  } else if (lc && lc.respondToSizeChange) {
                    lc.respondToSizeChange();
                  }
                });
                layoutObserver.observe(layoutTarget);
              }
}, 1000);
          


var join_check = false;

var room;

$(".chat_massage").hide();
function select_color(selectcolor , obj){
    $(".viewselect_icon").removeClass("viewselect_icon");
    lc.colors.primary = selectcolor;
    // console.log($(obj).children());
    $(obj).children(0).addClass("viewselect_icon");
}


function return_drowing(){
    $(".lc-undo").trigger("click");
    emitDrawSnapshot(lc.getSnapshot());
}

function clear_canvas(){
    $(".lc-clear").trigger("click");
    emitDrawSnapshot(lc.getSnapshot());
}


function exportcanvas(){
  sessionStorage.setItem("json",JSON.stringify(lc.getSnapshot()));
}


function load_canvas(){
    var text = sessionStorage.getItem("json");

      lc.loadSnapshotJSON(text);

}

var socket = null;


function connectSocket() {
  if (socket) {
    socket.close();
    socket = null;
    clientId = null;
  }

    return new Promise((resolve, reject) => {
      socket = io.connect("/");

      socket.on("connect", function (evt) {
        console.log("socket.io connected()");
        room = sessionStorage.getItem("code");
        console.log(room);
      if(room != "" && room != undefined){
        socket.emit("join room" ,  {room : room});
      }
      });
      socket.on("disconnect", function (evt) {
        console.log("socket.io disconnect:", evt);
      });

      // socket.on("join room" , function(data){
      //   console.log("join room : " , data);
      // });

      socket.on("draw", function (data) {
        applyDrawPayload(data.drawdata);
      });   

      socket.on("muted" , function (data){
        console.log(data);
        if(data == false){
          const audio = document.querySelector('.send_video');
          audio.volume = 0;
          console.log(audio);
        }else{
          const audio = document.querySelector('.send_video');
          audio.volume = 1;
        }
      });
      
      socket.on("chat" , function (data){
        $(".chat_massage").css("display",'flex');
        $(".chat_massage").html(data.chat);
        // console.log("1234");
        setTimeout(() => {
          $(".chat_massage").hide();
        }, 3000);
      });


      socket.on("publish_ready" , function(){
        subscribe();
        setTimeout(() => {
          getDevicesId();
          publish();
        }, 2000);
      });

      socket.on("webview_ready" , function(){
        subscribe();
      });

      socket.on("join room", function(){
        
        if(location.href.includes("webview") == true){
          console.log(location.href.includes("webview"));
          setTimeout(() => {
            var room = {
              room : sessionStorage.getItem("code")
            }
            console.log("emit()" , room);
            socket.emit("connect_usercheck" , room);
          }, 3000);
        }
        // join_check = true;
        console.log('join user');
      });

      socket.on("connect_usercheck" , function(){
        join_check = true;
        console.log('connect_usercheck');
      });

      socket.on("disconnected_xr" , ()=>{
        // webviewpage_disconnect();
        alert("원격 지원이 종료되었습니다.");
        sessionStorage.removeItem("code");
        location.href = "https://xr.k-bridge.co.kr/xr_mobielogin.html";
      });


    });
  }

  function disconnected_xr(){
    var room = {
      room : sessionStorage.getItem("code")
    }
    socket.emit("disconnected_xr" , room);
    $(".lc-clear").trigger("click");
    getDevicesId();
    startMedia();
  }

  function disconnectSocket() {
    if (socket) {
      socket.close();
      socket = null;
      clientId = null;
      console.log("socket.io closed..");
    }
  }

  function isSocketConnected() {
    if (socket) {
      return true;
    } else {
      return false;
    }
  }

  connectSocket();



  $("#chat_massge").on("keydown",(e)=>{
    if(e.keyCode == 13){
      send_chat();
    }
  });

  $(".chatobjbox").empty();

  function send_chat(){
    var chat = {
      room : room,
      chat : $("#chat_massge").val(),
    }
    var time = new Date().toUTCString();

    $(".chatobjbox").append(`
        <div class="chat_obj">
          <div class="mychat">${chat.chat}</div>
          <div class="timetext">${time.split("T")[1]}</div>
        </div>
    `);
    // console.log($(".chatobjbox").prop("scrollHeight"));
    $(".chatobjbox").scrollTop($(".chatobjbox").prop("scrollHeight"));
   $("#chat_massge").val("");
    setTimeout(() => {
      socket.emit("chat", chat);
    }, 3000);
  }
  // arrow_draw()
  // $(".sound_btn").trigger("click");
  
  var set_arrow = false;
  set_arrow = true;
  function arrow_draw(){

    if(set_arrow == false){
      arrow_set();
      set_arrow = true;
    }else{
      draw_set();
      set_arrow = false;
    }
  }


  function arrow_set(){
    edit_control($(".edit_btn"));
    $(".lc-options").css("display" , "flex");
    var set_1 = $(".lc-picker").children(0).children();
    console.log(set_1);
    $(set_1[2]).trigger("click");
    var set_2 = $('[data-reactid=".0.2.0.1.0"');
    console.log(set_2);
    $(set_2).trigger("click");
    var set_3 = $('[data-reactid=".0.2.0.2.$30.0"');
    console.log(set_3);
    $(set_3).trigger("click");
    
    // $(set_3[6]).children(0).trigger("click");
  
    $(".lc-options").hide();
    edit_control($(".edit_btn"));

  }


  function draw_set(){
    var set_1 = $(".lc-picker").children(0).children();
    var set_2 =  $(".lc-options").children(0).children();
    var set_3 = $(".lc-options").children(0).children(2).children();
    $(set_1[0]).trigger("click");
    $(set_3[4]).children(0).trigger("click");
  }



  function main_page_disconnect(){  
    disconnect_publish();
    disconnect();
  }


  function webviewpage_disconnect(){
    console.log("webviewpage_disconnect");
    webview_disconnect();
    disconnect_publish();
  }

  function socket_emit(){

    var senddata = {room : sessionStorage.getItem("code")}
    console.log(senddata);

    socket.emit("publish_ready" , senddata);
  }


  function webview_socket_emit(){
    var senddata = {room : sessionStorage.getItem("code")}
    console.log(senddata);
    socket.emit("webview_ready" ,senddata);
  }

//  drawEnd();




function convertStringToNumber(str) {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    result += code;
  }
  // console.log(result);
  return result;
}