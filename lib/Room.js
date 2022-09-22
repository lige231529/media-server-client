const EventEmitter	= require('events').EventEmitter;
const Participant = require("./Participant");
//Get manager
class Room{
    constructor(roomId,tm) {
        this.roomId = roomId;
        this.participants = new Map();
        this.tracks = new Map();
        this.transports = new Map();
        this.tm = tm
        //Create event emitter
        this.emitter = new EventEmitter();
        this.timer = setInterval(()=>{
            this.joinMeetTime = this.joinMeetTime + 1
        },1000)

    }
    createParticipant(name,audioFlag,videoFlag,mngr) {

        //Create participant
        const participant = new Participant(
            name,//name
            audioFlag,
            videoFlag,
            mngr,
        );
        //Listener for any new publisher stream
        participant.on('stream',({transport, tracks,stream})=>{
            //  1. 把流，轨道,transport存到房间
            let streamId = stream.getId()
            this.tracks.set(streamId,tracks)
            this.transports.set(streamId,transport)

            //    2.订阅别人
            if(!name.endsWith('@$@share')){
                this.tracks.forEach((tracks,id)=>{
                    if(id!=streamId){
                        tracks.forEach(track=>{
                            //Get stream
                            let outgoingStream = transport.getOutgoingStream(id);
                            //If not found
                            if (!outgoingStream)
                                //Create it
                                outgoingStream = transport.createOutgoingStream(id);
                            const outgoing = outgoingStream.createTrack(track.getMedia());
                            //Send loopback
                            outgoing.attachTo(track);
                            //Listen remove events
                            track.once("stopped",()=>{
                                //Stop also ougoing
                                outgoing.stop();
                            });
                        })
                    }
                })
            }

            //    3.发布自己
            this.transports.forEach((trans)=>{
                if(trans!=transport){
                    let selfTracks = this.tracks.get(streamId)
                    selfTracks.forEach(track=>{
                        //Get stream
                        let outgoingStream = trans.getOutgoingStream(streamId);
                        //If not found
                        if (!outgoingStream)
                            //Create it
                            outgoingStream = trans.createOutgoingStream(streamId);
                        const outgoing = outgoingStream.createTrack(track.getMedia());
                        //Send loopback
                        outgoing.attachTo(track);
                        track.once("stopped",()=>{
                            //Stop also ougoing
                            outgoing.stop();
                        });
                    })
                }

            })


            this.participants.set(name,participant);
            //通知前端
            this.emitter.emit("participants",this.getInfo().participants);
        });

        //Wait for stopped event
        participant.on('stopped', () => {
            if(!this.participants.get(participant.name)) return
            this.participants.delete(participant.name);
            this.tracks.delete(participant.streamId)
            this.transports.delete(participant.streamId)
            this.emitter.emit("participants",this.getInfo().participants);

        });

        return participant;
    }
    on()
    {
        //Delegate event listeners to event emitter
        this.emitter.on.apply(this.emitter, arguments);
        //Return object so it can be chained
        return this;
    }

    /**
     * Remove event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {Transport}
     */
    off()
    {
        //Delegate event listeners to event emitter
        this.emitter.removeListener.apply(this.emitter, arguments);
        //Return object so it can be chained
        return this;
    }
    stop()
    {
        this.emitter.emit("stopped");
        this.joinMeetTime=0
        // this.off()
        //Null things
        // this.emitter = null;
    }
    getInfo(){
        //Create info
        const info = {
            id : this.roomId,
            participants : []
        };

        //For each participant
        for (let participant of this.participants.values())
            //Append it
            if(participant.getInfo){
                info.participants.push(participant.getInfo());
            }
        //Return it
        return info;
    }
    statusChangeEmit(data){
        this.emitter.emit("statusChange",data);//room的监听事件，通过tm通知其他人
        let oldParticipant = this.participants.get(data.userName)||{}
        let newParticipant = Object.assign(oldParticipant,data)
        this.participants.set(data.userName,newParticipant)  //修改后台数据
    }
    messageEventEmit(data){
        this.emitter.emit("messageEvent",data);
    }
    canvasShareEmit(data){
        this.emitter.emit("canvasShare",data);
    }
    mouseEventEmit(data){
        this.emitter.emit("mouseEvent",data);
    }
    paletteConfigEmit(data){
        this.emitter.emit("paletteConfig",data);
    }
    speakerChangedEmit(data){
        this.emitter.emit("speakerChanged",data);
    }


}
module.exports = Room;