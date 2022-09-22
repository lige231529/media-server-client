const express = require('express');
const ejs= require('ejs')
const https = require ('https');
const fs = require ('fs');
const path = require ('path');
const WebSocketServer = require ('websocket').server;


//Get the Medooze Media Server interface
const MediaServer = require("medooze-media-server");
const PeerConnection = require('./lib/PeerConnection');
const loginRouter = require('./routes/login');
const indexRouter = require('./routes/index');
const PORT = 8001;

const base = 'www';
// maps file extention to MIME typere
const map = {
	'.ico': 'image/x-icon',
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.css': 'text/css',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.wav': 'audio/wav',
	'.mp3': 'audio/mpeg',
	'.svg': 'image/svg+xml',
	'.pdf': 'application/pdf',
	'.doc': 'application/msword'
};

const options = {
	key: fs.readFileSync ('server.key'),
	cert: fs.readFileSync ('server.cert')
};

//Enable debug
MediaServer.enableLog(false);
MediaServer.enableDebug(false);
MediaServer.enableUltraDebug(false);
MediaServer.setPortRange(10000,10200);//UDP端口区间
//Create HTTP server
const app = express()
const server = https.createServer(options,app)


//设置是试图引擎
app.engine('.html',ejs.renderFile)
app.set('view engine','html')
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '/views/meet')));
app.use('/',indexRouter);
app.use('/login', loginRouter);
const wsServer = new WebSocketServer ({
	httpServer: server,
	autoAcceptConnections: false
});
wsServer.on ('request', (request) => {
	PeerConnection(request)
});
server.listen (PORT,()=>{
	console.info(`服务已经启动，监听端口${PORT}`)
})
// module.exports = app