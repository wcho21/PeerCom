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
    socket.to(roomId).emit('__peercom_new_peer_joined', socket.id);
  });
  socket.on('__peercom_offer', (offer, targetSocketId) => {
    const senderSocketId = socket.id;
    socket.to(targetSocketId).emit('__peercom_offered', offer, senderSocketId);
  });
  socket.on('__peercom_answer', (answer, targetSocketId) => {
    const senderSocketId = socket.id;
    socket.to(targetSocketId).emit('__peercom_answered', answer, senderSocketId);
  });
  socket.on('__peercom_send_ice', (ice, targetSocketId) => {
    const senderSocketId = socket.id;
    socket.to(targetSocketId).emit('__peercom_receive_ice', ice, senderSocketId);
  });
});

const handleListen = () => { console.log(`Listening on 3000`)};
httpsServer.listen(3000, handleListen);
