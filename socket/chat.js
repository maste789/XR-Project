"use-strict";

exports.run = async (io) => {
  io.on("connection", function (socket) {
    console.log("client connected for draw");

    // 방입장
    socket.on("join room", function (data) {
      socket.join(data.room);
      console.log("join room : " + data.room);
      socket.to(data.room).emit("join room", data);
    });

    socket.on("connect_usercheck" , function(data){
      console.log("checked : ",data.room);
      socket.to(data.room).emit("connect_usercheck", data);
    });

    // 방나가기
    socket.on("leave room", function (data) {
      socket.to(data.room).emit("leave room", data);
      socket.leave(data.room);
    });

    socket.on("disconnect", function () {
      console.log("client disconnected");
    });

    socket.on("chat", function (data) {
      // console.log(data);
      socket.to(data.room).emit("chat", data);
    });

    socket.on("start_video", function (data) {
      // console.log(data);
      socket.broadcast.emit("start_video", data);
    });

    socket.on("end_video", function (data) {
      // console.log(data);
      socket.broadcast.emit("end_video", data);
    });

    socket.on("publish_ready" , function(data){
      console.log("publish_ready : ", data.room);
      socket.to(data.room).emit("publish_ready", data);
    })

    socket.on("webview_ready" , function(data){
      console.log(data.room);
      socket.to(data.room).emit("webview_ready", data);
    })

    socket.on("disconnected_xr" , function(data){
      console.log(data.room);
      socket.to(data.room).emit("disconnected_xr", data);
    })

    socket.on("draw", function (data) {
      console.log(data.room);
      socket.to(data.room).emit("draw", data);
    });

    socket.on("muted", function (data) {
      console.log(data);
      socket.to(data.room).emit("muted", data);
    });


  });
};
