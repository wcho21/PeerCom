class PeerCom {
  constructor(signalingServerSocket, iceServerUrls, roomId, userMediaStream) {
    this.signalingServerSocket = signalingServerSocket;
    this.iceServerUrls = iceServerUrls;
    this.roomId = roomId;
    this.userMediaStream = userMediaStream;
    this.connections = new Map();
    this.streams = new Map();
    this.onMediaConnectedCallback = () => { throw new Error('Callback function should be given.'); };
    this.onMediaDisconnectedCallback = () => { throw new Error('Callback function should be given.') };
  }

  onMediaConnected(callback) {
    this.onMediaConnectedCallback = callback;
  }

  onMediaDisconnected(callback) {
    this.onMediaDisconnectedCallback = callback;
  }

  #createPeerConnection(remoteSocketId) {
    const pcOptions = {
      iceServers: [ { urls: this.iceServerUrls }],
    };
    const pc = new RTCPeerConnection(pcOptions);

    pc.addEventListener('icecandidate', iceEvent => {
      this.signalingServerSocket.emit('__peercom_send_ice', iceEvent.candidate, remoteSocketId);
    });
    pc.addEventListener('track', async (event) => {
      if (this.streams.has(remoteSocketId)) {
        return;
      }

      const [remoteStream] = event.streams;

      this.streams.set(remoteSocketId, remoteStream);
      this.onMediaConnectedCallback(remoteSocketId, remoteStream);
    });

    this.userMediaStream.getTracks().forEach(track => pc.addTrack(track, this.userMediaStream));

    return pc;
  }

  connect() {
    this.signalingServerSocket.on('__peercom_new_peer_joined', async (remoteSocketId) => {
      console.log('new peer joined', remoteSocketId)
      const pc = this.#createPeerConnection(remoteSocketId);
      this.connections.set(remoteSocketId, pc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('setLocalDescription');
      console.log('signaling state', pc.signalingState);

      this.signalingServerSocket.emit('__peercom_offer', pc.localDescription, remoteSocketId);
      console.log('offer sent', offer);
    });

    this.signalingServerSocket.on('__peercom_offered', async (offer, remoteSocketId) => {
      console.log('remoteSocketId', remoteSocketId);
      console.log('offer received', offer)

      const pc = this.#createPeerConnection(remoteSocketId);
      this.connections.set(remoteSocketId, pc);

      await pc.setRemoteDescription(offer);
      console.log('setRemoteDescription');
      console.log('signaling state', pc.signalingState);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('setLocalDescription');
      console.log('signaling state', pc.signalingState);

      this.signalingServerSocket.emit('__peercom_answer', answer, remoteSocketId);
      console.log('answer sent', answer);
    });

    this.signalingServerSocket.on('__peercom_answered', async (answer, remoteSocketId) => {
      console.log('answer received', answer);
      const pc = this.connections.get(remoteSocketId);
      await pc.setRemoteDescription(answer);
      console.log('setRemoteDescription');
      console.log('signaling state', pc.signalingState);
    });

    this.signalingServerSocket.on('__peercom_receive_ice', (ice, remoteSocketId) => {
      const pc = this.connections.get(remoteSocketId);
      console.log('send ice');
      pc.addIceCandidate(ice);
    });

    this.signalingServerSocket.on('__peercom_peer_disconnected', remoteSocketId => {
      this.connections.delete(remoteSocketId);
      this.streams.delete(remoteSocketId);

      this.onMediaDisconnectedCallback(remoteSocketId);
    })

    this.signalingServerSocket.emit('__peercom_join', this.roomId);
  }
}

export default PeerCom;

