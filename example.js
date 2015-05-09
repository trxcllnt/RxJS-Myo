var Rx = require("rx"),
    ws = require("ws"),
    Myo = require("./index"),
    Hub = Myo(ws.connect || ws),
    inspect = require("util").inspect,
    emgs = Hub.Events().groupByArm().map(function(Arm) {
        return Arm.setEMG({"type": "enabled"}).isEMG();
    });

window && (window.onload = function() {
    Rx = require("rx-dom");
    var body   = document.getElementsByTagName("body")[0];
    body.style.margin = 0;
    body.style.padding = 0;
    body.style.position = "absolute";
    body.style.left = body.style.top = body.style.right = body.style.bottom = 0;
    
    emgs.scan([body], function(xs, Arm) {
        var body = xs[0],
            canvases = body.getElementsByTagName("canvas"),
            canvas, i = -1, n = canvases.length + 1;
        while(++i < n) {
            canvas = canvases[i] || body.appendChild(document.createElement("canvas"));
            canvas.style.minWidth = "25%";
            canvas.style.width = canvas.width = body.offsetWidth * 0.5;
            canvas.style.height = canvas.height = body.offsetHeight * 0.5;
            canvas.style.position = "absolute";
            canvas.style.left = "50%";
            canvas.style.marginLeft = (body.offsetWidth * 0.25 * -1) + "px";
            canvas.style.top = "50%";
            canvas.style.marginTop = (body.offsetHeight * 0.25 * -1) + "px";
        }
        return [body, Arm];
    })
    .flatMap(function(xs) {
        
        var body     = xs[0], Arm = xs[1], image,
            canvases = body.getElementsByTagName("canvas"),
            canvas   = canvases[canvases.length - 1],
            context  = canvas.getContext("2d"),
            xs       = [0,0,0,0,0,0,0,0].map(function() {
                return (canvas.offsetHeight / 8) * 0.5;
            });
        
        context.fillStyle = "white";
        context.lineWidth = 1;
        
        return Arm
            .throttleLatest(0, Rx.Scheduler.requestAnimationFrame)
            .map(function(x, i) {
                
                var emgs = x.emg,
                    j = 0, n = emgs.length,
                    width = canvas.offsetWidth,
                    height = canvas.offsetHeight / n;
                
                if(i >= width) {
                    i = width;
                    image = context.getImageData(0, 0, width, height * n);
                    context.clearRect(0, 0, width, height * n);
                    context.putImageData(image, -1, 0);
                    context.fillRect(width - 1, 0, width, height * n);
                } else {
                    i += 1;
                }
                
                while(++j <= n) {
                    context.strokeStyle = "rgba(0, 0, 0, " + (j / n) + ")";
                    context.beginPath();
                    context.moveTo(i - 1, (height * j) - (height * 0.5) + (xs[j - 1] / n * 2));
                    context.lineTo(i, (height * j) - (height * 0.5) + (emgs[j - 1] / n * 2));
                    context.closePath();
                    context.stroke();
                }
                
                return x;
            });
    })
    .publish().connect();
}) || emgs.forEach(
        function(xs) { console.log(inspect(xs, {depth:null})); },
        function(er) { console.error(er.stack || er.toString()); },
        function(  ) { console.log("completed"); }
    );