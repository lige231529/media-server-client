/**
 * Created by wyw on 2019/3/28.
 */
class Palette {
    constructor(isHost,canvas,tm, {drawType = 'line', drawColor = 'rgba(19, 206, 102, 1)', lineWidth = 5, sides = 3,radius=10, allowCallback, moveCallback}) {
        this.isHost = isHost,//是否是白板发起者
        this.canvas = canvas;
        this.width = canvas.width; // 宽
        this.height = canvas.height; // 高
        this.tm = tm;
        // console.log(canvas,canvas.width,canvas.height,canvas.offsetLeft,canvas.offsetTop)

        this.paint = canvas.getContext('2d');
        this.isClickCanvas = false; // 是否点击canvas内部
        this.isMoveCanvas = false; // 鼠标是否有移动
        this.imgData = []; // 存储上一次的图像，用于撤回
        this.index = 0; // 记录当前显示的是第几帧
        this.x = 0; // 鼠标按下时的 x 坐标
        this.y = 0; // 鼠标按下时的 y 坐标
        this.last = [this.x, this.y]; // 鼠标按下及每次移动后的坐标
        this.endx=0;
        this.endy = 0;
        this.drawType = drawType; // 绘制形状
        this.drawColor = drawColor; // 绘制颜色
        this.lineWidth = lineWidth; // 线条宽度
        this.sides = sides; // 多边形边数
        this.radius = radius;
        this.mouseCircle=null;
        this.allowCallback = allowCallback || function () {}; // 允许操作的回调
        this.moveCallback = moveCallback || function () {}; // 鼠标移动的回调
        this.bindMousemove = function () {}; // 解决 eventlistener 不能bind
        this.bindMousedown = function () {}; // 解决 eventlistener 不能bind
        this.bindMouseup = function () {}; // 解决 eventlistener 不能bind

        this.init();
    }
    init() {
        this.paint.fillStyle = '#fff';
        this.paint.fillRect(0, 0, this.width, this.height);
        this.gatherImage();
        this.bindMousemove = this.onmousemove.bind(this); // 解决 eventlistener 不能bind
        this.bindMousedown = this.onmousedown.bind(this);
        this.bindMouseup = this.onmouseup.bind(this);
        this.canvas.addEventListener('mousedown', this.bindMousedown);
        document.addEventListener('mouseup', this.bindMouseup);
    }
   async onmousedown(e) { // 鼠标按下
        this.isClickCanvas = true;
        this.x = e?e.offsetX:this.x;
        this.y = e?e.offsetY:this.y;
        this.last = [this.x, this.y];

        this.canvas.addEventListener('mousemove', this.bindMousemove);
        if(this.isHost){
            await this.tm.event("mouseEvent",{eventName:'mousedown',XY:{x:this.x,y:this.y}});
        }
    }
    gatherImage() { // 采集图像
        this.imgData = this.imgData.slice(0, this.index + 1); // 每次鼠标抬起时，将储存的imgdata截取至index处
        let imgData = this.paint.getImageData(0, 0, this.width, this.height);
        this.imgData.push(imgData);
        this.index = this.imgData.length - 1; // 储存完后将 index 重置为 imgData 最后一位
        this.allowCallback(this.index > 0, this.index < this.imgData.length - 1);
    }
    reSetImage() { // 重置为上一帧
        this.paint.clearRect(0, 0, this.width, this.height);
        if(this.imgData.length >= 1){
            this.paint.putImageData(this.imgData[this.index], 0, 0);
        }
    }
    async onmousemove(e) { // 鼠标移动

        this.isMoveCanvas = true;
        let endx =e? e.offsetX:this.endx;
        let endy =e? e.offsetY:this.endy;
        this.endx = endx;
        this.endy = endy;
        let width = endx - this.x;
        let height = endy - this.y;
        let now = [endx, endy]; // 当前移动到的位置
        switch (this.drawType) {
            case 'line' : {
                let params = [this.last, now, this.lineWidth, this.drawColor];
                this.moveCallback('line', ...params);
                this.line(...params);
            }
                break;
            case 'rect' : {
                let params = [this.x, this.y, width, height, this.lineWidth, this.drawColor];
                this.moveCallback('rect', ...params);
                this.rect(...params);
            }
                break;
            case 'polygon' : {
                let params = [this.x, this.y, this.sides, width, height, this.lineWidth, this.drawColor];
                this.moveCallback('polygon', ...params);
                this.polygon(...params);
            }
                break;
            case 'arc' : {
                let params = [this.x, this.y, width, height, this.lineWidth, this.drawColor];
                this.moveCallback('arc', ...params);
                this.arc(...params);
            }
                break;
            case 'eraser' : {
                // let params = [endx, endy, this.width, this.height, this.lineWidth,this.radius];
                let params = [endx, endy, this.width, this.height,this.radius];
                this.moveCallback('eraser', ...params);
                this.eraser(...params);
            }
                break;
        }
        if(this.isHost){
            await this.tm.event("mouseEvent",{eventName:'mousemove',dXY:{endx,endy}});
        }

    }
   async onmouseup() { // 鼠标抬起
        if (this.isClickCanvas) {
            this.isClickCanvas = false;
            this.canvas.removeEventListener('mousemove', this.bindMousemove);
            if (this.isMoveCanvas) { // 鼠标没有移动不保存
                this.isMoveCanvas = false;
                this.moveCallback('gatherImage');
                this.gatherImage();
            }
        }
        // 鼠标抬起后删除自己
        if(this.mouseCircle){
            this.mouseCircle.parentNode.removeChild(this.mouseCircle);
            this.mouseCircle=null
        }
        if(this.isHost){
            await this.tm.event("mouseEvent",{eventName:'mouseup'});
        }


    }
    line(last, now, lineWidth, drawColor) { // 绘制线性
        this.paint.beginPath();
        this.paint.lineCap = "round"; // 设定线条与线条间接合处的样式
        this.paint.lineJoin = "round";
        this.paint.lineWidth = lineWidth;
        this.paint.strokeStyle = drawColor;
        this.paint.moveTo(last[0], last[1]);
        this.paint.lineTo(now[0], now[1]);
        // this.paint.moveTo(0, 0);
        // this.paint.lineTo(last[0], last[1]);

        this.paint.closePath();
        this.paint.stroke(); // 进行绘制
        this.last = now;
    }
    rect(x, y, width, height, lineWidth, drawColor) { // 绘制矩形
        this.reSetImage();
        this.paint.lineWidth = lineWidth;
        this.paint.strokeStyle = drawColor;
        this.paint.strokeRect(x, y, width, height);
    }
    polygon(x, y, sides, width, height, lineWidth, drawColor) { // 绘制多边形
        this.reSetImage();
        let n = sides;
        let ran = 360 / n;
        let rn = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
        this.paint.beginPath();
        this.paint.strokeStyle = drawColor;
        this.paint.lineWidth = lineWidth;
        for(let i=0; i < n; i++){
            this.paint.lineTo(x + Math.sin((i * ran + 45) * Math.PI / 180) * rn, y + Math.cos((i * ran + 45) * Math.PI / 180) * rn);
        }
        this.paint.closePath();
        this.paint.stroke();
    }
    arc(x, y, width, height, lineWidth, drawColor) { // 绘制圆形
        this.reSetImage();
        this.paint.beginPath();
        this.paint.lineWidth = lineWidth;
        let r = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
        this.paint.arc(x, y, r, 0, Math.PI*2, false);
        this.paint.strokeStyle = drawColor;
        this.paint.closePath();
        this.paint.stroke();
    }
    eraser(endx, endy, width, height, radius) { // 橡皮擦
        this.paint.save();
        this.paint.beginPath();
        this.paint.arc(endx, endy, radius, 0, 2 * Math.PI);
        this.paint.closePath();
        this.paint.clip();
        this.paint.clearRect(0, 0, width, height);
        this.paint.fillStyle = '#fff';
        this.paint.fillRect(0, 0, width, height);
        this.paint.restore();
        //鼠标光标
        if(!this.mouseCircle){
            this.mouseCircle = document.createElement('div');
            this.mouseCircle.className = 'mouseCircle';
            document.querySelector('.rtcBox').appendChild(this.mouseCircle);
        }
        // 位置
        this.mouseCircle.style.width = radius*2+'px'
        this.mouseCircle.style.height = radius*2+'px'
        this.mouseCircle.style.left = (endx+100 - radius) + 'px';
        this.mouseCircle.style.top = (endy - radius) + 'px';
    }
   async cancel() { // 撤回
        if (--this.index <0) {
            this.index = 0;
            return;
        }
        this.allowCallback(this.index > 0, this.index < this.imgData.length - 1);
        this.paint.putImageData(this.imgData[this.index], 0, 0);
        if(this.isHost){
            await this.tm.event("mouseEvent",{eventName:'cancel'});
        }

    }
    async go () { // 前进
        if (++this.index > this.imgData.length -1) {
            this.index = this.imgData.length -1;
            return;
        }
        this.allowCallback(this.index > 0, this.index < this.imgData.length - 1);
        this.paint.putImageData(this.imgData[this.index], 0, 0);
        if(this.isHost){
            await this.tm.event("mouseEvent",{eventName:'go'});
        }

    }
   async clear() { // 清屏
        this.imgData = [];
        if(this.paint){
            this.paint.clearRect(0, 0, this.width, this.height);
            this.paint.fillStyle = '#fff';
            this.paint.fillRect(0, 0, this.width, this.height);
        }

        this.gatherImage();
        if(this.isHost){
            await this.tm.event("mouseEvent",{eventName:'clear'});
        }

    }
    changeWay({type, color, lineWidth, sides,radius,}) { // 绘制条件
        this.drawType = type !== 'color' && type || this.drawType; // 绘制形状
        this.drawColor = color || this.drawColor; // 绘制颜色
        this.lineWidth = lineWidth || this.lineWidth; // 线宽
        this.sides = sides || this.sides; // 边数
        this.radius=radius || this.radius;//橡皮擦半径
    }
    scale(){//是否全屏
        let imgData = this.paint.getImageData(0, 0, this.width, this.height);
        this.paint.width=1000
        this.paint.height=500
        this.paint.putImageData(imgData,0, 0);
    }
    destroy() {
        this.canvas.removeEventListener('mousedown', this.bindMousedown);
        document.removeEventListener('mouseup', this.bindMouseup);
        this.canvas = null;
        this.paint = null;
    }
    paintParamsChange({x,y,endx,endy}){
        this.x = x||this.x;
        this.y = y||this.y;
        this.endx = endx||this.endx;
        this.endy = endy||this.endy;
    }
}