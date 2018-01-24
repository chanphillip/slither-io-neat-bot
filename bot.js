
var canvas = function() {
	this.ctrl = new controller();

	// canvas for displaying graphics
	var $mask = $('<canvas>').css({
		position: 'absolute',
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		zIndex: 10000000,
		pointerEvents: 'none'
	}).attr({
		width: $(window).width(),
		height: $(window).height(),
	}).appendTo('body');
	var ctx = $mask[0].getContext("2d");

	// container for displaying data
	var $display = $('<div>').css({
		position: 'absolute',
		top: 0,
		left: 0,
		zIndex: 10000000,
		width: '300px',
		height: '400px',
		background: 'rgba(255, 255, 255, .75)',
		padding: '8px',
		fontSize: '12px',
		lineHeight: 1.5
	}).appendTo('body');

	// watching variables
	this.listenTo = function(expression, func) {
		var $elem = $('<div>').attr('expression', expression).appendTo($display);
		var itv = setInterval(function() {
			try {
				var val = eval(expression);
			} catch(e) {
				var val = null;
			};
			$elem.text(expression+' = '+(func ? func(val) : val));
		}, 100);
		$elem.data('varItv', itv);
	};

	this.getScore = function() {
		return parseInt($('div.nsi:contains("Your length") > span:first').text().match(/\d+$/)[0]);
	};

	this.clearLines = function() {
		ctx.clearRect(0, 0, $mask[0].width, $mask[0].height);
	}

	this.drawLine = function(xx, yy, color) {
		var x1 = $mask[0].width / 2;
		var y1 = $mask[0].height / 2;
		var x2 = x1 + (xx - snake.xx) * sgsc;
		var y2 = y1 + (yy - snake.yy) * sgsc;

		ctx.beginPath();
		ctx.strokeStyle = color;
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
	};

	return this;
};

var controller = function() {
	var sendEvent = function(keyCode, event) {
		var e = new Event(event);
		e.keyCode = keyCode;
		e.which = e.keyCode;
		e.altKey = false;
		e.ctrlKey = true;
		e.shiftKey = false;
		e.metaKey = false;
		e.bubbles = true;
		document.dispatchEvent(e);
	};

	this.press = function(key, delay) {
		var keyCode;
		switch (key) {
			case 'LEFT': keyCode = 37; break;
			case 'RIGHT': keyCode = 39; break;
			case 'SPACE': keyCode = 32; break;
		}

		sendEvent(keyCode, 'keydown');
		setTimeout(function() {
			sendEvent(keyCode, 'keyup');
		}, delay);
	};

	this.getDistance = function(food) {
		return Math.abs(Math.pow(food.xx - snake.xx, 2) + Math.pow(food.yy - snake.yy, 2));
	};

	this.getAngle = function(food) {
		var dy = food.yy - snake.yy;
		var dx = food.xx - snake.xx;
		return Math.atan2(dy, dx)
	};

	return this;
};

$(document).ready(function() {
	console.log('Slither IO bot is loaded!');

	can = new canvas();

	// some random variables to watch
	can.listenTo('snake.ang', v => Math.round(v * 180 / Math.PI));
	can.listenTo('foods.length');
	can.listenTo('snake.xx');
	can.listenTo('snake.yy');

	var nearestFood = {};

	ctrl = new controller();
	setInterval(function() {
		// dump logic here..
		// just tracing the closest food..
		var foodSorted = [];
		foods.forEach(function(food) {
			if (food && !food.eaten) {
				foodSorted.push({
					distance: ctrl.getDistance(food),
					obj: food
				});
			}
		});

		foodSorted = foodSorted.sort(function(a, b) {
			return a.distance - b.distance;
		});

		nearestFood.obj = foodSorted[0] ? foodSorted[0].obj : null;
		nearestFood.distance = foodSorted[0] ? foodSorted[0].distance : null;
		nearestFood.angle = foodSorted[0] ? ctrl.getAngle(foodSorted[0].obj) : null;

		can.clearLines();
		if (nearestFood.obj) {
			can.drawLine(nearestFood.obj.xx, nearestFood.obj.yy, '#FF0000');

			var dang = (nearestFood.angle - snake.ang + Math.PI + Math.PI * 2) % (Math.PI * 2) - Math.PI;
			if (dang > 0) {
				ctrl.press('RIGHT', 400 * dang);
			} else if (dang < 0) {
				ctrl.press('LEFT', 400 * Math.abs(dang));
			}
		}
	}, 40);

	can.listenTo('//dis', function() {
		return Math.round(nearestFood.distance);
	});
	can.listenTo('//ang', function() {
		return Math.round(nearestFood.angle * 180 / Math.PI);
	});
});

/*var goRand = function() {
	var r = Math.random();
	var d = Math.random() * 1000 + 100;
	if (r < .3) {
		c.press('LEFT', d);
	} else if (r >= .7) {
		c.press('RIGHT', d);
	} else if (r >= .5) {
		c.press('SPACE', d);
	}
	setTimeout(goRand, d);
};*/

// auto restart
setInterval(function() {
	$('#playh .nsi').click();
}, 2000);