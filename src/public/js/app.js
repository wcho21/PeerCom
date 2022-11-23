import PeerCom from './peerCom.js';

const socket = io();
const myFace = document.getElementById("myFace");
const welcome = document.getElementById("welcome")
const call = document.getElementById("call")
call.hidden = true;

const iceServerUrls = [
  'stun:stun.l.google.com:19302',
  // 'stun:stun1.l.google.com:19302',
  // 'stun:stun2.l.google.com:19302',
  // 'stun:stun3.l.google.com:19302',
  // 'stun:stun4.l.google.com:19302',
];

let roomId;
let myStream;
const welcomeForm = welcome.querySelector('form')
async function handlWelcomeSubmit(event) {
  event.preventDefault();
  const input = welcomeForm.querySelector('input');
  roomId = input.value;

  renderRoom();

  await getMedia();

  // 사용자 측 코드
  const peerCom = new PeerCom(socket, iceServerUrls, roomId, myStream);
  peerCom.onMediaConnected((remoteStream) => {
    // 여기서 할일
    const video = document.createElement('video');
    video.width = "200";
    video.height = "200";
    video.autoplay = true;
    video.srcObject = remoteStream;
    document.querySelector('#call').appendChild(video);
    console.log(remoteStream);
  });
  peerCom.connect();
}
welcomeForm.addEventListener('submit', handlWelcomeSubmit)

function renderRoom() {
  welcome.hidden = true;
  call.hidden = false;
}

async function getMedia() {
  try {
    const constraints = {
      audio: true,
      video: true,
    };

    myStream = await navigator.mediaDevices.getUserMedia(constraints);
    myFace.srcObject = myStream;
  } catch(e) {
    myStream = new MediaStream();
    myFace.srcObject = myStream;
  }
}
