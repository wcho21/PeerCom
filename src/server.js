import https from 'https';
import SocketIO from 'socket.io'
import express from 'express';
import path from 'path'
import fs from 'fs'

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views")
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req, res) => {
  res.render("home");
});

const sslOptions = {
  key: fs.readFileSync(path.resolve('localhost-key.pem')),
  cert: fs.readFileSync(path.resolve('localhost.pem')),
};
const httpsServer = https.createServer(sslOptions, app);
const wsServer = SocketIO(httpsServer);

wsServer.on('connection', socket => {
  socket.on('__peercom_join', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('__peercom_new_peer_joined');
  });
  socket.on('__peercom_offer', (offer, roomId) => {
    socket.to(roomId).emit('__peercom_offered', offer);
  });
  socket.on('__peercom_answer', (answer, roomId) => {
    socket.to(roomId).emit('__peercom_answered', answer);
  });
  socket.on('__peercom_send_ice', (ice, roomId) => {
    socket.to(roomId).emit('__peercom_receive_ice', ice);
  });
});

const handleListen = () => { console.log(`Listening on 3000`)};
httpsServer.listen(3000, handleListen);
