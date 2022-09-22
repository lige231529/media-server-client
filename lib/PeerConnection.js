const TransactionManager = require("transaction-manager");
const MediaServer = require("medooze-media-server");
const Room = require('./Room')
//Get the Medooze Media Server interface

//Enable debug
MediaServer.enableLog(true);
MediaServer.enableDebug(true);
MediaServer.enableUltraDebug(true);
let rooms = new Map()
const Capabilities = {
	audio : {
		codecs		: ["opus"],
	},
	video : {
		codecs		: ["vp8","h264;packetization-mode=1;profile-level-id=42e01f"],
		rtx		: true,
		rtcpfbs		: [
			{ "id": "goog-remb"},
			{ "id": "transport-cc"},
			{ "id": "ccm", "params": ["fir"]},
			{ "id": "nack"},
			{ "id": "nack", "params": ["pli"]}

		],
		extensions	: [
			"urn:3gpp:video-orientation",
			"http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01",
			"http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time",
			"urn:ietf:params:rtp-hdrext:toffse",
			"urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id",
			"urn:ietf:params:rtp-hdrext:sdes:mid",
		],
		simulcast	: true
	}
};

//Check
if (process.argv.length!=3)
	throw new Error("Missing IP address\nUsage: node index.js <ip>");
//Get ip
const ip = process.argv[2];

module.exports = function(request){
	let protocol = request.requestedProtocols[0];
	let url = request.resourceURL;
	let {roomId,userName,audioFlag,videoFlag} = url.query;
	audioFlag =audioFlag&&audioFlag.includes("false")?false:true
	videoFlag =videoFlag&&videoFlag.includes("false")?false:true
	let room = rooms.get(roomId)
	const connection = request.accept(protocol);
	//Create new transaction manager
	const tm = new TransactionManager(connection);
	let endpoint = MediaServer.createEndpoint(ip);
	let mngr =endpoint.createPeerConnectionServer(tm,Capabilities)
	if(!room){
		room=new Room(roomId,tm)
		room.paletteInfo={}
		rooms.set(roomId,room)
		room.joinMeetTime=0
	}
	// Register room listeners
	let listeners={}

	addEventListeners()

	let participant;
	participant = room.createParticipant(userName,audioFlag,videoFlag,mngr);
	room.sendTimer = setInterval(()=>{
		tm.event('joinMeetTimeEvent',{joinMeetTime:room.joinMeetTime})
	})
	if(room.paletteInfo.flag){
		tm.event("canvasShare", room.paletteInfo)
	}

	participant.on("stopped",()=>{
		//Remove room listeners
		removeEventListeners()
	})
	//Register tm listeners
	tm.on("event",(event)=>{
		switch (event.name) {
			case "statusChange":
				room.statusChangeEmit(event.data);//通知房间
				break;
			case "messageEvent":
				room.messageEventEmit(event.data);
				break;
			case "canvasShare" :
				room.paletteInfo = event.data
				room.canvasShareEmit(event.data)
				break;
			case "mouseEvent":
				room.mouseEventEmit(event.data);
				break;
			case "paletteConfig":
				room.paletteConfigEmit(event.data);
				break;
			case "speakerChanged":
				room.speakerChangedEmit(event.data);
				break;
		}
	})
	function addEventListeners(){
		room.on("participants",listeners.updateParticipants = participants => {
			tm.event("participants", participants);
		});
		room.on("statusChange",(listeners.statusChange=participant => {
			tm.event("statusChange",participant );
		}));
		room.on("messageEvent",listeners.messageEvent=info=> {
			tm.event("messageEvent", info);
		});
		room.on("canvasShare",listeners.canvasShare=info=> {
			tm.event("canvasShare", info);
		});
		room.on("mouseEvent",listeners.mouseEvent=info=> {
			tm.event("mouseEvent", info);
		});
		room.on("paletteConfig",listeners.paletteConfig=info=> {
			tm.event("paletteConfig", info);
		});
		room.on("speakerChanged",listeners.speakerChanged=info=> {
			tm.event("speakerChanged", info);
		});
		room.on("stopped",(listeners.roomStopped=() => {
			endpoint = null
			rooms.delete(roomId)
		}));
	}
	function removeEventListeners(){
			room.off("participants",listeners.updateParticipants);
			room.off("statusChange",listeners.statusChange);
			room.off("stopped",listeners.roomStopped);
			room.off("messageEvent",listeners.messageEvent);
			room.off("canvasShare",listeners.canvasShare);
			room.off("mouseEvent",listeners.mouseEvent);
			room.off("paletteConfig",listeners.paletteConfig);
			room.off("speakerChanged",listeners.speakerChanged);
		    listeners={};
	}
	//Close on disconnect
	connection.on("close",async() => {
		console.info(participant.name+'离开了')
		if(room.paletteInfo.flag){
			if(participant.name==room.paletteInfo.name){
				room.paletteInfo={}
			    await room.canvasShareEmit({})
			}
		}
		participant.stop()
		if(room.participants.size==0){
			clearInterval(room.sendTimer)
			room.stop()
		}
	});
}