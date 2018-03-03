window.onload = function() {
  // intended to create rooms based on current IPFS file identifier
  var hrefPathComponents = window.location.pathname.split('/');
  var currentBlock = hrefPathComponents.indexOf("ipfs") != -1 ? hrefPathComponents[hrefPathComponents.indexOf("ipfs")+1] : "city_center";

  // for use with example WebRTC via https://github.com/stephenlb/webrtc-sdk
  // used for VOIP because its novel
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  var audioCtx = new AudioContext();

  // IPFS PubSub Room based example
  // IPFS npm install was missing half of the apparent dependencies
  var io = require('socket.io-client')
  var k_SOCKET_ENDPOINT_PUBLIC_OSIRIS = "67.169.94.129:3003"
  var socket = io(k_SOCKET_ENDPOINT_PUBLIC_OSIRIS)

  // Avatar connected to Swarm! Initiate other p2p experiences
  socket.on("server-ack-connect", function (data) {
    console.log("[SOCKET.IO] > server ack > ");
    console.log(data);
    startPhoneSession(data["socket_id"]);
  })

  // Initiate VOIP with avatars in same block
  socket.on("avatar-phone-advertise", function (data) {
    console.log("[SOCKET.IO] > avatar phone advertise > ");
    if (data['place'] !== currentBlock) {
      return;
    }
    var socketid = data['socketid'];
    openVOIPConnection(socketid);
  })

  socket.on('avatar-disconnect', function(info) {
    var peerid = info["socket_id"];
    console.log("IPFS PUBSUB ROOM >> LEFT >> " + peerid );
    var peerBox = document.getElementById('box' + peerid);
    if (peerBox) {
      var position = peerBox.getAttribute('position');
      var rotation = peerBox.getAttribute('rotation');
      position.y = 3;
      for (var i = 0; i < 4; i++) {
        showQuadDialog(position, rotation, "AVATAR DISCONNECTED");
      }
    }

    if (peerBox) {
      document.querySelector('a-scene').removeChild(peerBox);
    }
    var peerHat = document.getElementById('hat' + peerid);
    if (peerHat) {
      document.querySelector('a-scene').removeChild(peerHat);
    }

    var peerChat = document.getElementById('speech' + peerid);
    if (peerChat) {
      document.querySelector('a-scene').removeChild(peerChat);
    }

    var peerSombro = document.getElementById('sombro' + peerid);
    if (peerSombro) {
      document.querySelector('a-scene').removeChild(peerSombro);
    }
  })

  socket.on('worldPopulation', function(data){
    console.log("world population");
    console.log(data);
    var populationString = "";
    for (var world in data) {
      if (data.hasOwnProperty(world)) {
        var popString = data[world].toString();
        console.log("population for " + world + " is " + popString);
        populationString += (world + " (" + popString + " versers) -");
      }
    }
    document.getElementById('speechoutput').innerHTML = populationString;
  })

  socket.on('avatar-datagram', function (datagram) {
    var reportedAvatarMetadata = datagram["dgq"];
    for (var i=0; i<reportedAvatarMetadata.length;i++) {
      var metadata = JSON.parse(reportedAvatarMetadata[i]);
      var peerid = metadata["socket_id"];
      processDataGram(peerid, metadata);
    }
  })

  socket.on('avatar-face', function (data) {
    var peerid = data["socket_id"];
    processAvatarFace(peerid, data);
  })

  // see github.com/mikezucc/metaverse-ipfs
  // ipfs.once('ready', () => ipfs.id((err, info) => {
  // }))

  function repo() {
    return 'ipfs/pubsub-demo/' + Math.random()
  }

  // Avatar media metadata updates
  function processAvatarFace(peerid, datagram) {
    var imageBuffer = datagram['imagebuffer'];
    console.log("avatar face received" + imageBuffer);
    var peerBox;
    if (document.getElementById('box' + peerid)) {
      peerBox = document.getElementById('box' + peerid);
    } else {
      if (document.getElementById('sombro' + peerid) == null) {
        return;
      }
      peerBox = document.createElement('a-box');
      peerBox.id = 'box' + peerid;
      document.querySelector('a-scene').appendChild(peerBox);
    }

    var img = new Image();
    img.src = imageBuffer;
    context.drawImage(img, 0, 0, 256, 256);
    var img = document.querySelector('img');
    img.setAttribute('src', imageBuffer);
    peerBox.setAttribute('material', 'src', 'url(' + imageBuffer + ')');
  }

  // Avatar positional adata updates
  function processDataGram(peerid, info) {
    if ((peerid == null) || (peerid === "") || ("undefined" === typeof peerid)) {
      console.log("[PROCESS DATAGRAM] EMPTY PEER ID");
       return
    }
    if (peerid === socket.id) {
      console.log("[PROCESS DATAGRAM] SAME SOCKET DGQ");
      return
    }
    var position = info['position'];
    var rotation = info['rotation'];

    // All the components that compose an "avatar"
    // "Templates" of the non-primitives must exist as top level leaves in `a-scene`
    var peerBox;
    var peerHat;
    var peerChat;
    var peerSombro;
    var peerLight;

    if (document.getElementById('hat' + peerid)) {
      peerBox = document.getElementById('box' + peerid);
      peerHat = document.getElementById('hat' + peerid);
      peerChat = document.getElementById('speech' + peerid);
      peerSombro = document.getElementById('sombro' + peerid);
    } else {
      peerBox = document.createElement('a-box');
      peerHat = document.createElement('a-cone');
      peerChat = document.createElement('a-entity');
      peerSombro = document.getElementById('starterbrero').cloneNode(true);
      peerBox.id = 'box' + peerid;
      peerHat.id = 'hat' + peerid;
      peerChat.id = 'speech' + peerid;
      peerSombro.id = 'sombro' + peerid;
      peerBox.setAttribute('lerp', {"duration":200});
      peerBox.appendChild(peerSombro);
      peerHat.setAttribute('scale', "0.4 0.4 0.4");
      peerSombro.setAttribute('position', {"x": 0, "y": 0.35, "z":0});
      peerSombro.setAttribute('rotation', {"x": 0, "y": 0, "z":0});
      document.querySelector('a-scene').appendChild(peerBox);
      document.querySelector('a-scene').appendChild(peerHat);
      document.querySelector('a-scene').appendChild(peerChat);
    }


    var lastIcos = peerBox;
    var hatPos = position;

    peerBox.setAttribute('position', position);
    peerBox.setAttribute('rotation', rotation);

    hatPos.y += 2;
    peerHat.setAttribute('position', hatPos);
    peerHat.setAttribute('color', getRandomColor());

    hatPos.y -=2.5;
    peerChat.setAttribute('position', hatPos);
    peerChat.setAttribute('rotation', rotation);
  }

  /**
   Binding DOM for video canvas capture for avatar texture
  */
  // one time dispatch to begin video stream
  var startButton = document.getElementById('start-stream')
  var video = document.querySelector("video");
  var videoWidth;
  var videoHeight;
  // used for grabbing video feed and compressing image for pubsub delivery
  var canvas = document.createElement("canvas");
  var canvasReceived = document.createElement("canvas");
  // these dimensions must be 2 power or else html canvas throws AN ABSOLUTE FIT
  canvas.width = 256;
  canvas.height = 256;
  var context = canvas.getContext("2d");
  var contextReceived = canvasReceived.getContext("2d");
  document.querySelector('body').appendChild(canvas);
  document.querySelector('body').appendChild(canvasReceived);

  // deprecated, used to visually signal new messages from peers
  // now it just uses the weird ass eye thing
  function getRandomColor() {
      var letters = '3FCDEF';
      var color = '#';
      for (var i = 0; i < 6; i++ ) {
          color += letters[Math.floor(Math.random() * 5)];
      }
      return color;
  }

  /**
    When an avatar disconnects, we show this dialog above their last known
    position
  */
  function showQuadDialog(position, rotation, text) {
    var otherHalf = document.createElement('a-entity');
    otherHalf.setAttribute('geometry', 'primitive', 'plane');
    otherHalf.setAttribute('material', 'color', 'blue');
    otherHalf.setAttribute('material', 'height', 'auto');
    otherHalf.setAttribute('material', 'width', 'auto');
    otherHalf.setAttribute('text', 'font', 'mozillavr');
    otherHalf.setAttribute('text', 'color', 'black');
    otherHalf.setAttribute('text', 'width', '6');
    otherHalf.setAttribute('text', 'value', text);
    otherHalf.setAttribute('position', position);
    rotation.y += 90;
    otherHalf.setAttribute('rotation', {"x":rotation.x,"y":rotation.y,"z":rotation.z});
    document.querySelector('a-scene').appendChild(otherHalf);
  }

  /**
    VOIP! requires ssl
  */
  var phone;
  var phoneReady = false;
  document.getElementById('micimage').setAttribute('src', 'assets/micbuttonoff.png');
  function startPhoneSession(my_peer_id) {
    console.log("phone sesh with " + my_peer_id);
    phone = PHONE({
        number        : my_peer_id,
        publish_key   : 'pub-c-0258682c-c8c5-42c0-9fe9-990b0741f2b7',
        subscribe_key : 'sub-c-255dc204-4b55-11e7-ab90-02ee2ddab7fe',
        media         : { audio : true, video : false },
        ssl           : true
    })

    phone.unable(function(details){
      console.log("Phone is unable to initialize.");
      console.log("Try reloading, or give up lmao.");
      console.log(details);
      document.getElementById('micimage').setAttribute('src', 'assets/micbuttonoff.png');
    });

    phone.debug(function(details){
      console.log("phone debug");
      console.log(details);
    });
    // As soon as the phone is ready we can make calls
    phone.ready(function(){
      console.log("phone ready with number " + phone.number());
        phoneReady = true;
        document.getElementById('micimage').setAttribute('src', 'assets/micbuttonon.png');
        // Dial a Number and get the Call Session
        // For simplicity the phone number is the same for both caller/receiver.
        // you should use different phone numbers for each user.
    });

    // When Call Comes In or is to be Connected
    phone.receive(function(session){
      console.log("phone receive");
        // Display Your Friend's Live Video
        session.connected(function(session){
          console.log("video receive");
            document.querySelector('body').appendChild(session.video);
        });
    });
  }

  function openVOIPConnection(socketid) {
    if (phone == null) { return; }
    if (phoneReady == false) { return; }

    console.log("CALLING " + socketid);
    var session = phone.dial(socketid);
  }

  /**
  Client generating positional updates via tick
  */
  var lastPosition = "";
  var lastRotation = "";
  var datagramInterval = setInterval(function() {
      if ((socket == null) || ("undefined" === typeof socket)) {
        console.log("SOCKET NOT CONNECTED >> no datagram broadcast");
        return;
      }
      // console.log("scheduling datagram push");
      var camera = document.getElementById('camera');
      var position = camera.getAttribute('position');
      var rotation = camera.getAttribute('rotation');
      if ((position === lastPosition) || (rotation == lastRotation)) {
          return;
      }
      // console.log(position);
      lastRotation = rotation;
      lastPosition = position;
      socket.emit("avatar-datagram", JSON.stringify({ "socket_id": socket.id, 'type':'dg', 'position': position, 'rotation':rotation }));
      if (position.x < 0) {
        position.x = -position.x;
      }
      if (position.z < 0) {
        position.z = -position.z;
      }
      document.getElementById("currentBlockCoord").innerHTML = "currently in block x: " + Math.floor(position.x/37.5).toString() + " ~ z: " + Math.floor(position.z/37.5).toString();
  }, 200);

  // Creates an avatar texture capture context by grabbing audio from
  // the web cam. This isn't necessary for broadcasting datagram updates.
  function startStream () {
    startButton.setAttribute('disabled', true)
    video.addEventListener('canplay', function() {
          videoWidth = video.videoWidth;
          videoHeight = video.videoHeight;
          var duration = video.duration;
          var i = 0;

          var interval = setInterval(function() {
            if ((socket == null) || ("undefined" === typeof socket)) {
              console.log("ROOM NOT CONNECTED >> no avatar broadcast");
              return;
            }
            context.drawImage(video, 0, 0, 256, 256);
            var dataURL = canvas.toDataURL('image/jpeg', 0.1);
            console.log("created avatar face with " + dataURL);
            socket.emit("avatar-face", JSON.stringify( {"socket_id": socket.id, 'type':'avatar-face', 'imagebuffer': dataURL} ) );
        }, 300);
    });
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.oGetUserMedia;
    if (navigator.getUserMedia) {
      navigator.getUserMedia({audio: true, video: { width: 320, height: 240}}, handleVideo, videoError);
    }
    function handleVideo(stream) {
      var video = document.querySelector("video");
      video.src = window.URL.createObjectURL(stream);
      video.volume = 0;
    }
    function videoError(e) {console.log(e);}

    // Usually, this would use PubNub Phone WebRTC to do VOIP,
    // This is also availabel as a support mechanism
    document.getElementById('echobutton').addEventListener('click',function() { window.open('https://discord.gg/3j7XYqY','_blank'); });
  }

  // Honestly, A-Frame physics community is a mess, it took me days to get something
  // not ridiculous going. This basically works by setting gravity to zero and
  // then setting the player vertical velocity to 5 u/s, whose position is
  // broadcast to the others. Then a timer brings back gravity.
  var shouldBeJumping = false;
  var floatValue = 0; // 100 tick
  function keydown(e) {
    var event = window.event ? window.event : e;
    if (event.keyCode == 32) {
      var el = document.querySelector('a-scene');
      // el.setAttribute('physics-world', {"gravity":{"x":0, "y":1.2, "z":0}});
      el.systems.physics.world.gravity.set(0, 0, 0);
      shouldBeJumping = true;
      floatValue = 10; // oversized population of ticks
      var jumpEnd = setTimeout(function() {
        shouldBeJumping = false;
      }, 1000);
      var meme = setTimeout(function() {
        var el = document.querySelector('a-scene');
        // el.setAttribute('physics-world', {"gravity":{"x":0, "y":1.2, "z":0}});
        el.systems.physics.world.gravity.set(0, -4.9, 0);
      }, 1000);
      var velocity = document.getElementById('camera').getAttribute('velocity');
      velocity.y = 5;
      camera.setAttribute('velocity', velocity);
    }
  }
  document.addEventListener("keydown", keydown);

  // KEY FOR IGNITION, HOLD FAST
  startStream()
}
