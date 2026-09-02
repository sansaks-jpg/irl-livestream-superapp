import { useState, useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export function useWebRTC({ socket, role = 'dashboard', room = 'stream-room', localStream = null }) {
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected'); // disconnected, connecting, connected
  const [peerId, setPeerId] = useState(null);
  const pcRef = useRef(null);

  const createPeerConnection = useCallback((targetPeerId) => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {
        // ignore
      }
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Attach local tracks if available (especially on phone sender)
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle incoming remote tracks (especially on dashboard)
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote stream track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('signal', {
          target: targetPeerId,
          data: { type: 'candidate', candidate: event.candidate }
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state changed:', pc.connectionState);
      setConnectionState(pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setRemoteStream(null);
      }
    };

    return pc;
  }, [localStream, socket]);

  useEffect(() => {
    if (!socket) return;

    socket.emit('join-room', { room, role });

    // Handle room peer discovery
    const handlePeerJoined = async ({ peerId: remoteId, role: remoteRole }) => {
      console.log(`[WebRTC] Peer joined: ${remoteId} (${remoteRole})`);
      setPeerId(remoteId);

      // Caller side (phone cam or initiator creates offer)
      if (role === 'cam-sender') {
        const pc = createPeerConnection(remoteId);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('signal', {
            target: remoteId,
            data: { type: 'offer', sdp: offer }
          });
        } catch (err) {
          console.error('[WebRTC] Error creating offer:', err);
        }
      }
    };

    const handleRoomPeers = async ({ peers }) => {
      if (peers.length > 0) {
        setPeerId(peers[0]);
        if (role === 'cam-sender') {
          const pc = createPeerConnection(peers[0]);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('signal', {
              target: peers[0],
              data: { type: 'offer', sdp: offer }
            });
          } catch (err) {
            console.error('[WebRTC] Error initiating offer to existing peer:', err);
          }
        }
      }
    };

    const handleSignal = async ({ sender, data }) => {
      if (!pcRef.current) {
        createPeerConnection(sender);
      }
      const pc = pcRef.current;

      try {
        if (data.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('signal', {
            target: sender,
            data: { type: 'answer', sdp: answer }
          });
        } else if (data.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } else if (data.type === 'candidate' && data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (err) {
        console.error('[WebRTC] Error handling signal data:', err);
      }
    };

    const handlePeerLeft = () => {
      console.log('[WebRTC] Remote peer left');
      setRemoteStream(null);
      setConnectionState('disconnected');
      setPeerId(null);
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };

    socket.on('peer-joined', handlePeerJoined);
    socket.on('room-peers', handleRoomPeers);
    socket.on('signal', handleSignal);
    socket.on('peer-left', handlePeerLeft);

    return () => {
      socket.off('peer-joined', handlePeerJoined);
      socket.off('room-peers', handleRoomPeers);
      socket.off('signal', handleSignal);
      socket.off('peer-left', handlePeerLeft);
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, [socket, role, room, createPeerConnection]);

  // If localStream changes (e.g. user toggled camera), update tracks in peer connection
  useEffect(() => {
    if (pcRef.current && localStream) {
      const senders = pcRef.current.getSenders();
      localStream.getTracks().forEach((newTrack) => {
        const sender = senders.find(s => s.track && s.track.kind === newTrack.kind);
        if (sender) {
          sender.replaceTrack(newTrack);
        } else {
          pcRef.current.addTrack(newTrack, localStream);
        }
      });
    }
  }, [localStream]);

  return {
    remoteStream,
    connectionState,
    peerId
  };
}
