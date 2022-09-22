const EventEmitter	= require('events').EventEmitter;
class Participant{
    constructor(name,audioFlag,videoFlag,mngr) {
        this.name = name
        this.audioFlag = audioFlag
        this.videoFlag=videoFlag,
        this.tracks=[]
        this.mngr = mngr
        //Create event emitter
        this.emitter = new EventEmitter();
        this.mngr.on("transport",transport=>{
            this.transport = transport

            transport.on("incomingtrack",(track,stream)=>{
                let tracks=[]
                this.streamId = stream.getId()
                track.tracks.forEach(track=>{
                    tracks.push(track)
                })
                if(name.endsWith('@$@share')){
                    this.emitter.emit("stream", {transport,tracks,stream});
                }else{
                    if(tracks.length==2){
                        this.emitter.emit("stream", {transport,tracks,stream});
                    }
                }

            })

        })


    }
    stop(){
        this.emitter.emit("stopped")
        //IF we hve a transport
        if (this.transport)
            //Stop transport
           setTimeout(()=>{
               this.transport.stop();
           },100)
        clearInterval(this.timer)
        //Stop manager
        // this.mngr.stop();
    }
    getInfo(){
        const info = {
            streamId : this.streamId,
            name: this.name,
            audioFlag: this.audioFlag,
            videoFlag: this.videoFlag,
        }
        return info
    }
    on(){
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
    off(){
        //Delegate event listeners to event emitter
        this.emitter.removeListener.apply(this.emitter, arguments);
        //Return object so it can be chained
        return this;
    }

}
module.exports = Participant;