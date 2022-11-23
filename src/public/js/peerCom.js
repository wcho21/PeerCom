class PeerCom {
  constructor(signalingServerSocket, iceServerUrls, roomId, userMediaStream) {
    this.signalingServerSocket = signalingServerSocket;
    this.iceServerUrls = iceServerUrls;
    this.roomId = roomId;
    this.userMediaStream = userMediaStream;
    this.pc;
    this.onMediaConnectedCallback = () => { throw new Error('No callback is given'); };
  }

  onMediaConnected(callback) {
    this.onMediaConnectedCallback = callback;
  }

  connect() {
    const rtcPeerConnectionOptions = {
      iceServers: [ { urls: this.iceServerUrls }],
    };
    this.pc = new RTCPeerConnection(rtcPeerConnectionOptions);
    this.userMediaStream.getTracks().forEach(track => this.pc.addTrack(track, this.userMediaStream));

    this.pc.addEventListener('icecandidate', iceEvent => {
      this.signalingServerSocket.emit('__peercom_send_ice', iceEvent.candidate, this.roomId);
    });

    this.pc.addEventListener('track', async (event) => {
      const [remoteStream] = event.streams;

      this.onMediaConnectedCallback(remoteStream)
    });

    this.signalingServerSocket.on('__peercom_new_peer_joined', async () => {
      const offer = await this.pc.createOffer();
      this.pc.setLocalDescription(offer);

      this.signalingServerSocket.emit('__peercom_offer', offer, this.roomId);
    });

    this.signalingServerSocket.on('__peercom_offered', async (offer) => {
      this.pc.setRemoteDescription(offer);

      const answer = await this.pc.createAnswer();
      this.pc.setLocalDescription(answer);

      this.signalingServerSocket.emit('__peercom_answer', answer, this.roomId);
    });

    this.signalingServerSocket.on('__peercom_answered', async (answer) => {
      this.pc.setRemoteDescription(answer);
    });

    this.signalingServerSocket.on('__peercom_receive_ice', ice => {
      this.pc.addIceCandidate(ice);
    });

    this.signalingServerSocket.emit('__peercom_join', this.roomId);
  }
}

export default PeerCom;

