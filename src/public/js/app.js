const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras")
const peerFace = document.getElementById('peerFace')

const welcome = document.getElementById("welcome")
const call = document.getElementById("call")

call.hidden = true;

let myStream;
let muted = true;
let cameraOff = false;
let roomName;
let myPeerConnection;

function handleMuteClick() {
  myStream.getAudioTracks().forEach(track => {track.enabled = !track.enabled});
  
  if (!muted) {
    muteBtn.innerText = "Unmute"
    muted = true;
  } else {
    muteBtn.innerText = "Mute"
    muted = false;
  }
}
function handleCameraClick() {
  myStream.getVideoTracks().forEach(track => {track.enabled = !track.enabled});
  if (cameraOff) {
    cameraBtn.innerText = "Turn Camera Off"
    cameraOff = false;
  } else {
    cameraBtn.innerText = "Turn Camera On"
    cameraOff = true;
  }
}
function handleCameraChange() {
  console.log(camerasSelect.value)
  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection.getSneders().find((sender) => sender.track.kind === "video")
    videoSender.replaceTrack(videoTrack);
  }
}
muteBtn.addEventListener('click', handleMuteClick);
cameraBtn.addEventListener('click', handleCameraClick);
camerasSelect.addEventListener('input', handleCameraChange)

async function initCall() {
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
}

function handleIce(data) {
  socket.emit('ice', data.candidate, roomName);
  console.log('sent ice')
}

function makeConnection() {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
          'stun:stun3.l.google.com:19302',
          'stun:stun4.l.google.com:19302',
        ],
      },
    ],
  });
  myPeerConnection.addEventListener('icecandidate', handleIce);
  myPeerConnection.addEventListener('addstream', handleAddStream);
  // myPeerConnection.addEventListener('iceconnectionstatechange', () => {
  //   if (myPeerConnection.iceConnectionState === 'disconnected') {
  //     peerFace.srcObject = null;
  //   }
  // })
  myPeerConnection.addEventListener('connectionstatechange', () => {
    if (myPeerConnection.connectionState === 'disconnected') {
      peerFace.srcObject = null;
    }
  })
  myStream.getTracks().forEach(track => myPeerConnection.addTrack(track, myStream))
}

function handleAddStream(data) {
  peerFace.srcObject = data.stream;
}

const welcomeForm = welcome.querySelector('form')
async function handlWelcomeSubmit(event) {
  event.preventDefault();
  const input = welcomeForm.querySelector('input');
  await initCall();
  socket.emit('join_room', input.value);
  roomName = input.value;
  console.log(`roomName=${roomName}`)
  input.value = '';
}
welcomeForm.addEventListener('submit', handlWelcomeSubmit)


async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(device => device.kind === "videoinput")
    const currentCamera = myStream.getVideoTracks()[0];
    cameras.forEach(camera => {
      const option = document.createElement("option")
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if (currentCamera.label == camera.label) {
        option.selected = true;
      }
      camerasSelect.appendChild(option)
    })
  } catch(e) {
    console.log(e);
  }
}


async function getMedia(deviceId) {
  const initialConstraints = {
    audio: true,
    video: { facingMode: 'user' },
  };
  const cameraConstraints = {
    audio: true,
    video: { deviceId: {exact: deviceId}},
  }
  try {
    myStream = await navigator.mediaDevices.getUserMedia(deviceId ? initialConstraints : cameraConstraints);
    console.log(myStream.getTracks())
    myFace.srcObject = myStream;
    if (!deviceId) {
      await getCameras();
    }
  } catch(e) {
    console.log(e);
  }
}

socket.on('welcome', async () => {
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  socket.emit('offer', offer, roomName);
  console.log('sent the offer')
});

socket.on('offer', async (offer) => {
  console.log('received the offer')
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit('answer', answer, roomName)
  console.log('sent the answer')
})

socket.on('answer', answer => {
  console.log('received the answer')
  myPeerConnection.setRemoteDescription(answer);
})

socket.on('ice', ice => {
  console.log('received ice')
  myPeerConnection.addIceCandidate(ice);
})