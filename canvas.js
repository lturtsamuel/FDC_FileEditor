var width;
var height = 100;
var step = 15; // 15 px a second.
var canvas, ctx;
var fulltime;
var timer;
var container;
var list = new BlockList();
var mem_bg;
var file;
var url;
var a_canvas, a_ctx;
var a_mem_bg;

function initCanvas(id, time) {
	fulltime = time;
	canvas = document.getElementById(id);
	a_canvas = document.getElementById('audio-canvas');
	ctx = canvas.getContext('2d');
	a_ctx = a_canvas.getContext('2d');
	canvas.width = a_canvas.width = width = time*step;
	canvas.height = a_canvas.height = height+40; //50px for time line
	timer = document.getElementById('timer');
	container = document.getElementById('container');
	drawBackGround();
	mem_bg = ctx.getImageData(0, 0, width, height+5);
	a_mem_bg = a_ctx.getImageData(0, 0, 30, height+5);
	drawAllBLocks();
	canvasEventsSetup();
}

function drawBackGround() {
	ctx.strokeStyle = 'gray';
	var text;
	ctx.font = '15px Georgia';
	for(var i = 0; i < fulltime; i+=5) {
		ctx.beginPath();
    	ctx.moveTo(i*step, 0);
    	ctx.lineTo(i*step, height);
    	ctx.stroke();

    	text = secToText(i);
    	ctx.fillText(text, i*step-10, height+15);
	}
}
function secToText(t) {
	var min = Math.floor(t/60);
	var sec = t%60;
	var t1 = min.toString(), t2 = sec.toString()
	if(min < 10) t1 = '0' + t1;
	if(sec < 10) t2 = '0' + t2;
	return t1 + ':' + t2;
}

function drawBlock(block, selected) {
	ctx.globalAlpha = 0.7;
	var start = block.start_time;
	var end = block.end_time;
	if(selected == false) ctx.fillStyle = ctx.strokeStyle = 'blue';
	else ctx.fillStyle = ctx.strokeStyle = 'red';
	ctx.lineWidth = 3;
	ctx.fillRect(start*step, 0, (end-start)*step, height);
	ctx.strokeRect(start*step, 0, (end-start)*step, height);
	ctx.drawImage(block.img, start*step+5, 5, (end-start)*step-10, height-10);
}

function drawAllBLocks() {
	var a = list.getSelected();
	for (var i = 0; i < a.length; i++) drawBlock(a[i], true);
	a = list.getUnSelected();
	for (var i = 0; i < a.length; i++) drawBlock(a[i], false);
}

function resetAll() {
	ctx.putImageData(mem_bg, 0, 0);
	drawAllBLocks();
}

function getPos(ev, obj) {
	var x, y;
	x = y = 0;
	if (obj.offsetParent) {
    	do {
    		x += obj.offsetLeft;
    		y += obj.offsetTop
		} while (obj = obj.offsetParent);
	}
	return {x: ev.pageX-x+container.scrollLeft, y: ev.pageY-y};
}

ADD=0, SCALE_LEFT=1, SCALE_RIGHT=2, SHIFT=3, DEL=4, NOTHING=-1; //shift & scale is detected onmousedown
var mode = NOTHING;
var dragging = false;
var oldX;

function addBlockMode() {
	mode = ADD;
	a_canvas.style.cursor = 'pointer';
	if(list.selected_r != 0) {
		list.clearSelected();
		resetAll();
	}
	document.getElementById('delete').style.backgroundColor = 'rgb(150, 220, 240)';
	document.getElementById('file').click();
}
function deleteBlockMode() {
	if(mode == DEL) {
		mode = NOTHING;
		a_canvas.style.cursor = 'auto';
		document.getElementById('delete').style.backgroundColor = 'rgb(150, 220, 240)';
	}
	else {
		if(list.selected_r != 0) {
			list.clearSelected();
			resetAll();
		}
		mode = DEL;
		a_canvas.style.cursor = 'not-allowed';
		document.getElementById('delete').style.backgroundColor = 'rgb(100, 180, 200)';
	}
}

function canvasEventsSetup() {
	a_canvas.onmousemove = function(e) {
		var x = getPos(e, canvas).x;
		var s = secToText(Math.floor(x/step));
		timer.innerHTML = s;
		if(mode == ADD || mode == DEL) return;
		if(dragging == true) {
			if(mode == SCALE_LEFT) {
				b = list.get(list.selected_l);
				b.tmp_start = x/step;
			}
			else if(mode == SCALE_RIGHT) {
				b = list.get(list.selected_l);
				b.tmp_end = x/step;
			}
			else if(mode == SHIFT) {
				var offset = (x-oldX)/step;
				var a = list.getSelected();
				oldX = x;
				for(var i = 0; i < a.length; i++) {
					a[i].tmp_start = a[i].tmp_start + offset;
					a[i].tmp_end = a[i].tmp_end + offset;
				}
			}
			if(list.checkOverlap()) return;
			list.acceptTmp();
			resetAll();
		}
		else {
			var info = list.find(x/step);
			if(info.index != -1) {
				if(info.state == MIDLE) a_canvas.style.cursor = 'move';
				else a_canvas.style.cursor = 'e-resize';
			}
			else a_canvas.style.cursor = 'auto';
		}
	}
	a_canvas.onmousedown = function(e) {
		var p = getPos(e, canvas);
		var x = p.x, y = p.y;
		if(e.which == 3) {
			playAtTime(x/step);
			return;
		}
		if(mode == DEL) {
			info = list.find(x/step);
			if(info.index != -1) {
				list.del(info.index);
				resetAll();
			}
		}
		else {			
			oldX = x;
			var info;
			if(mode == ADD) info = {index: list.push(new ImageBlock(file, url, x/step)), state: END};
			else info = list.find(x/step);
			if(y < height && info.index != -1) {
				dragging = true;
				list.select(info.index);
				if(info.state == MIDLE) {
					mode = SHIFT;
					var a = list.getSelected();
					for(var i = 0; i < a.length; i++) {
						a[i].tmp_start = a[i].start_time;
						a[i].tmp_end = a[i].end_time;
					}
				}
				else {
					a_canvas.style.cursor = 'e-resize';
					list.selectSingle(info.index);
					if(info.state == START) mode = SCALE_LEFT;
					else mode = SCALE_RIGHT;
				}
				resetAll();
			}
			else if(list.selected_r != 0) {
				list.clearSelected();
				resetAll();
			}
		}
	}
	a_canvas.onmouseup = function(e) {
		dragging = false;
		if(mode == SHIFT) list.sort();
	}
}

var last_x = -1;
var last_index = -1;
function drawCurTime(time) {
	var x = parseInt(time*step);
	if(last_x != 0) a_ctx.putImageData(a_mem_bg, last_x-5, 0);
	last_x = x;
	a_ctx.strokeStyle = 'yellow';
	a_ctx.beginPath();
    a_ctx.moveTo(x, 0);
    a_ctx.lineTo(x, height);
    a_ctx.stroke();
    var t = list.find(time);
    if(last_index == t.index) return;
    if(t.index != -1) {
    	document.getElementById('cur-img').src = list.a[t.index].img.src;
	}
	else document.getElementById('cur-img').src = '';
	last_index = t.index;
}