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
  socket.on('join_room', (roomName) => {
    console.log('join', roomName);
    socket.join(roomName);
    socket.to(roomName).emit('welcome')
  });
  socket.on('offer', (offer, roomName) => {
    socket.to(roomName).emit('offer', offer);
  });
  socket.on('answer', (answer, roomName) => {
    socket.to(roomName).emit('answer', answer);
  });
  socket.on('ice', (ice, roomName) => {
    socket.to(roomName).emit('ice', ice);
  })
});

const handleListen = () => { console.log(`Listening on 3000`)};
httpsServer.listen(3000, handleListen);
