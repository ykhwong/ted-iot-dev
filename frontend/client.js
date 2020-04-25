const request = require('request');
const appPort = 3000;
const configFile = "data.config";
let gpxOrigFilePath = "trace.gpx";
let gpxFilePath = gpxOrigFilePath;
let zoomLvl=1.0;

$(document).ready(function() {
	var MENU = [
		{
			name: "home",
			title: "Welcome"
		},
		{
			name: "car",
			title: "Self-driving Car"
		},
		{
			name: "iotBulb",
			title: "IoT Bulb"
		},
		{
			name: "iotFlame",
			title: "IoT Flame Sensor"
		},
		{
			name: "demoAutoRunner",
			title: "Demo Auto Runner"
		}
	];
	var carThreads=[];
	var urlTypingTimer=[];
	var doneTypingInterval = 1000;
	var mapUpdateStartTime = 0;
	var mapDeleted = false;
	var lastLon = 0;
	var lastLat = 0;

	function refreshWarn() {
		var warnCnt=0;
		var okCnt=0;
		var src;
		var warnDetails = "";
		var okDetails = "";
		var attr;

		MENU.forEach(function(rawMenuName, k) {
			var menuName = rawMenuName.name;
			var rightName = '#right_' + menuName;
			menuName = getInfo(menuName, "title");
			src = $(rightName + " #filestat").attr("src");
			if (src == "warn.png") {
				warnDetails += menuName + ": Invalid file\n";
				warnCnt++;
			} else if (src == "ok.png") {
				okDetails += menuName + ": File OK\n";
				okCnt++;
			}
			src = $(rightName + " #uristat").attr("src");
			if (src == "warn.png") {
				warnDetails += menuName + ": Invalid URI\n";
				warnCnt++;
			} else if (src == "ok.png") {
				okDetails += menuName + ": URI OK\n";
				okCnt++;
			}
			src = $(rightName + " #svrstat").attr("src");
			if (src == "warn.png") {
				warnDetails += menuName + ": Listening server error\n";
				warnCnt++;
			} else if (src == "ok.png") {
				okDetails += menuName + ": Listening server OK\n";
				okCnt++;
			}
		});
		$("#statusMsg").html('<br /><img src="" id="okIco2" width="15px">' + '<div class="okCnt"></div>&nbsp;<div id="okMsg">OK</div>');
		$("#statusMsg").append('<br /><textarea name="note_content3" id="note_content3" class="content" readonly>' + okDetails + '</textarea>');
		$("#statusMsg").append('<br /><br /><img src="" id="warnsIco2" width="15px">' + '<div class="warnsCnt"></div>&nbsp;<div id="warnMsg">Warnings</div>');
		$("#statusMsg").append('<br /><textarea name="note_content3" id="note_content3" class="content" readonly>' + warnDetails + '</textarea>');
		$("#okIco2").attr("src","ok.png");
		$("#warnsIco2").attr("src","warn.png");
		$(".warnsCnt").html(warnCnt);
		$(".okCnt").html(okCnt);

		setTimeout(refreshWarn, 2000);
	}

	function getInfo(name, target) {
		var rawMenuName;
		var ret;
		if (name == "exit") {
			return "";
		}
		MENU.forEach(function(rawMenuName, k) {
			if (name === rawMenuName.name) {
				switch (target) {
					case "title":
						ret = rawMenuName.title;
						//console.log("Found(getInfo-target): " + ret);
						break;
					default:
						//console.log("Not found(getInfo-target): " + target);
						break;
				}
			}
		});
		if (typeof ret == 'undefined') {
			//console.log("Not found(getInfo-name): " + name);
		}
		return ret;
	}

	function setInfo(name, target, val) {
		var rawMenuName;
		var ret=false;
		MENU.forEach(function(rawMenuName, k) {
			if (name === rawMenuName.name) {
				switch (target) {
					case "title":
						rawMenuName.title = val;
						console.log("Set(setInfo-target " + target + "): " + val);
						ret = true;
						break;
					default:
						console.log("Not found(setInfo-target): " + target);
						ret = true;
						break;
				}
			}
		});
		if (ret == false) {
			console.log("Not found(setInfo-name): " + name);
		}
		return;
	}

	function clearAllThreads() {
		for (i = 0; i < carThreads.length; i++) {
			clearTimeout(carThreads[i]);
		}
	}

	function change_url_color(rightName) {
		if (!/^(f|ht)tps?:\/\//i.test($('#url').val().trim())) {
			$(rightName + " #url").css("color", "yellow");
			$(rightName + " #uristat").attr('src',"warn.png");
			return;
		}
		request.post({
			  headers: {'content-type' : 'application/json'},
			  timeout: 2000,
			  url:     $(rightName + " #url").val(),
			  body:    `{}`
			}, function(err, res, body){
				if (err) {
					$(rightName + " #url").css("color", "yellow");
					$(rightName + " #uristat").attr('src',"warn.png");
					return console.log(err);
				}
				$(rightName + " #url").css("color", "#E0FFFF");
				$(rightName + " #uristat").attr('src',"ok.png");
			});
	}
	
	function loadConf() {
		const fs = require("fs-extra");
		var content;
		var res;
		if (!fs.existsSync(configFile)) {
			return;
		}
		content = fs.readFileSync(configFile, 'utf-8');
		res = content.replace(/\r\n/g, "\n").split("\n");
		for (i = 0; i < res.length; i++) {
			let entry = res[i];
			if (entry != "") {
				entry = entry.trim();
				var keyval = entry.split("=");
				var key = keyval[0];
				var val = keyval[1];
				var keyval2 = keyval[0].split(".");
				var key2 = keyval2[0];
				var val2 = keyval2[1];
				$("#right_" + key2 + " #" + val2).val(val);
				change_url_color("#right_" + key2);
			}
		}
	}

	function lazyLoad() {
		$("#warnsIco").attr("src","warn.png");
		$("#smaller").attr("src","smaller.png");
		$("#bigger").attr("src","bigger.png");

		setTimeout(function() {
			$("#right_iotBulb #room1").attr("src","bulb_off.png");
			$("#right_iotBulb #room2").attr("src","bulb_off.png");
			$("#right_iotBulb #room3").attr("src","bulb_off.png");
			$("#right_iotBulb #room4").attr("src","bulb_off.png");
			$("#right_iotBulb #uristat").attr("src","warn.png");
			//$("#right_iotBulb #svrstat").attr("src","warn.png");
			$("#right_iotBulb #tx_del").attr("src","erase.png");
			$("#right_iotBulb #tx_copy").attr("src","copy.png");
			$("#right_iotBulb #rx_del").attr("src","erase.png");
			$("#right_iotBulb #rx_copy").attr("src","copy.png");
			$("#right_iotBulb #ex_copy").attr("src","copy.png");

			$("#right_iotFlame #lighter").attr("src","flame_ani.gif");
			$("#right_iotFlame #rasp_fire").attr("src","rasp_fire_off.png");
			$("#right_iotFlame #uristat").attr("src","warn.png");
			$("#right_iotFlame #tx_del").attr("src","erase.png");
			$("#right_iotFlame #tx_copy").attr("src","copy.png");
			$("#right_iotFlame #ex_copy").attr("src","copy.png");

			$("#right_car #uristat").attr("src","warn.png");
			$("#right_car #filestat").attr("src","warn.png");
			$("#right_car #map_del").attr("src","collapse_icon.png");
			$("#right_car #tx_del").attr("src","erase.png");
			$("#right_car #tx_copy").attr("src","copy.png");
			$("#right_car #ex_copy").attr("src","copy.png");
			
			$("#right_demoAutoRunner #uristat").attr("src","warn.png");
			$("#right_demoAutoRunner #tx_del").attr("src","erase.png");
			$("#right_demoAutoRunner #tx_copy").attr("src","copy.png");
			$("#right_demoAutoRunner #ex_copy").attr("src","copy.png");
			mapUpdate(0, 0);
		}, 250);

		refreshWarn();
	}

	function init() {
		const ipc = require('electron').ipcRenderer;
		var rawMenuName, menuName, rightName;
		MENU.forEach(function(rawMenuName, k) {
			menuName = '#menu_' + rawMenuName.name;
			rightName = '#right_' + rawMenuName.name;
			$('#left').append('<div class="menus" id="' + menuName.replace(/#/g, "") + '"></div>');
			$(menuName).css("background-image", 'url("' + menuName.replace(/#/g, "") + '.png")');
			if (rawMenuName.name !== "exit") {
				implFunc(rawMenuName.name);
				$(menuName).click(function() {
					rightName = '#right_' + rawMenuName.name;
					$(".menus").css("background-color", "rgba(0,0,0,0)");
					$(this).css("background-color", "rgba(66,241,244,0.5)");
					$(".right").hide();
					$("#title").html(" Device Simulator - " + getInfo(rawMenuName.name, "title"));
					$(rightName).show();
				});
				$(rightName + " #tx_del").click(function() {
					$(rightName + " #tx_content").val("");
				});
				$(rightName + " #rx_del").click(function() {
					$(rightName + " #rx_content").val("");
				});
				$(rightName + " #tx_copy").click(function() {
					var ms = rightName + " #tx_content";
					$(ms).focus();
					$(ms).select();
					document.execCommand('copy');
				});
				$(rightName + " #rx_copy").click(function() {
					var ms = rightName + " #rx_content";
					$(ms).focus();
					$(ms).select();
					document.execCommand('copy');
				});
				$(rightName + " #ex_copy").click(function() {
					var ms = rightName + " #note_content";
					if ($(ms).length){
						$(ms).focus();
						$(ms).select();
					} else {
						ms += "2";
						$(ms).focus();
						$(ms).select();
					}
					document.execCommand('copy');
				});
				$(rightName + ' #url').on('keyup', function() {
					clearTimeout(urlTypingTimer[k]);
					urlTypingTimer[k] = setTimeout(function() { change_url_color(rightName); }, doneTypingInterval);
				});

				$(rightName + ' #url').on('keydown', function () {
					clearTimeout(urlTypingTimer[k]);
				});
				
			} else {
				$(menuName).click(function() {
					const { remote } = require('electron');
					remote.getCurrentWindow().close();
				});
			}
		});

		ipc.on('cmd', (event, arg) => {
			if (arg.msg == "loaded") {
				lazyLoad();
			}
		});

		$("#smaller").click(function() {
			if (zoomLvl <= 1 ) {
				return;
			}
			zoomLvl -= 0.1;
			$(".right").css("transform-origin", "top left");
			$(".right").css("transform", "scale(" + zoomLvl.toString() + ")");
		});

		$("#bigger").click(function() {
			zoomLvl += 0.1;
			$(".right").css("transform-origin", "top left");
			$(".right").css("transform", "scale(" + zoomLvl.toString() + ")");
		});

		$("#bottom #warnsIco, .warnsCnt").click(function() {
			$("#menu_home").trigger( "click" );
		});

		$("#proc_reset").click(function() {
			MENU.forEach(function(rawMenuName, k) {
				if (!(rawMenuName.name == "exit" || rawMenuName.name == "home")) {
					rightName = '#right_' + rawMenuName.name;
					$(rightName + " #url").val("http://");
					change_url_color(rightName);
				}
			});
			$("#gpxfile").val(gpxOrigFilePath);
		});

		$("#proc_save").click(function() {
			const fs = require("fs-extra");
			var save_dat = "";
			MENU.forEach(function(rawMenuName, k) {
				if (!(rawMenuName.name == "exit" || rawMenuName.name == "home")) {
					rightName = '#right_' + rawMenuName.name;
					save_dat += rawMenuName.name + ".url=" + $(rightName + " #url").val() + "\n";
				}
			});
			save_dat += "car.gpxfile=" + $("#gpxfile").val().trim();
			fs.writeFile(configFile, save_dat, function(err) {
				if(err) {
					return console.log(err);
				}
			}); 
		});
		
		$("#exit").click(function() {
			const { remote } = require('electron');
			remote.getCurrentWindow().close();
		});

		$("#menu_home").trigger( "click" );
		loadConf();
	}

	function mapUpdate(lat, lon) {
		if (!mapDeleted) {
			$("#map").attr("src","https://www.openstreetmap.org/export/embed.html?bbox=" + lon.toString() + "%2C" + lat.toString() + "%2C" + lon.toString() + "%2C" + lat.toString() + "&marker=" + lat.toString() + "%2C" + lon.toString() + "&layers=ND");
		}
	}

	function post_http_car(is_test, lat, lon, direction) {
		var tx_content;
		tx_content = `{
				"name" : "Ambulance",
				"driver" : "Daniel",
				"latitude" : ` + lat.toString() + `,
				"longitude" : ` + lon.toString() + `,
				"elevation" : 4,
				"direction" : ` + direction.toString() + `,
				"ECG" : 0.63,
				"body_heat" : 36.5,
				"fuel" : 38,
				"temperature" : 22.3
				"humidity" : 62.3,
				"no2" : 0.5,
				"co" : 0.98,
				"so2" : 0.4
				"time" : 7
			  }`;
		lastLon = lon;
		lastLat = lat;
		$("#right_car #tx_content").val(tx_content.replace(/\s+/g, " ") + "\n");
		if (mapUpdateStartTime == 0) {
			mapUpdate(lat, lon);
			mapUpdateStartTime = new Date();
		} else {
			var curTime = new Date();
			if (curTime - mapUpdateStartTime > 10000) {
				mapUpdate(lat, lon);
				mapUpdateStartTime = new Date();
			}
		}
		request.post({
			  headers: {'content-type' : 'application/json'},
			  url:     $("#url").val().trim(),
			  body:    tx_content,
			}, function(err, res, body){
				console.log("lat: " + lat + " lon: " + lon);
				if (err) {
					if (is_test) {
						//alert("Could not connect to the server");
					}
					return console.log(err);
				}
			});
	}

	function post_http_demo(is_test, status, delay) {
		var tx_content;
		tx_content = `{
				"name" : "demo_runner",
				"status" : "` + status + `",
				"delay" : "` + delay + `"
			  }`;
		$("#right_demoAutoRunner #tx_content").val(tx_content.replace(/\s+/g, " ") + "\n");
		request.post({
			  headers: {'content-type' : 'application/json'},
			  url:     $("#url").val().trim(),
			  body:    tx_content,
			}, function(err, res, body){
				if (err) {
					if (is_test) {
						//alert("Could not connect to the server");
					}
					return console.log(err);
				}
			});
	}

	// IoT device
	function toggle_bulb(div) {
		var src = $(div).attr('src');
		var id = $(div).attr('id');
		var new_file;
		id = id.replace("room", "");
		if (/off/.test(src)) {
			new_file = "bulb_on.png";
			$(div).attr('src', new_file);
			post_http_bulb(id, "on");
		} else {
			new_file = "bulb_off.png";
			$(div).attr('src', new_file)
			post_http_bulb(id, "off");
		}
	}

	function post_http_bulb(id, status) {
		var tx_content;
		tx_content = `{
			"room" : "` + id + `",
			"bulb_status" : "` + status + `"
			}`;
		$("#right_iotBulb #tx_content").val(tx_content.replace(/\s+/g, " ") + "\n");
		for (var i = 0; i < 2; i++) request.post({
			  headers: {'content-type' : 'application/json'},
			  url:     $("#right_iotBulb #url").val().trim(),
			  body:    tx_content,
			}, function(err, res, body){
				if (err) {
					return console.log(err);
				}
			});
	}
	
	function post_http_flame() {
		var tx_content;
		tx_content = `{
			"flame" : "on"
			}`;
		$("#right_iotFlame #tx_content").val(tx_content.replace(/\s+/g, " ") + "\n");
		request.post({
			headers: {'content-type' : 'application/json'},
			url:     $("#right_iotFlame #url").val().trim(),
			body:    tx_content,
		}, function(err, res, body){
			if (err) {
				return console.log(err);
			}
		});
	}

	function chkGPX() {
		const fs = require("fs-extra");
		var rightName = "#right_car";
		gpxFilePath=($("#gpxfile").val().trim());
		if (fs.existsSync(gpxFilePath)) {
			$(rightName + " #filestat").attr('src',"ok.png");
		} else {
			$(rightName + " #filestat").attr('src',"warn.png");
		}
		setTimeout(chkGPX, 1000);
	}

	function implFunc(menuName) {
		var rightName = "#right_" + menuName;
		if (menuName === "home" || menuName === "exit") {
			return;
		}

		// Car
		if (menuName === "car") {
			chkGPX();
			$(rightName + " #script").change(function() {
				var val = $(rightName + " #script").val().trim();
				var data =
					'options.rotate = parseInt(options.metric.value.direction);' + "\n" +
					'options.offsetStyle = "center";';
				if (val == "none") {
					$(rightName + " #note_content").html("");
				} else if (val == "wizeye1") {
					$(rightName + " #note_content").html(data);
				}
			});

			$(rightName + " #map_del").click(function() {
				if (!mapDeleted) {
					mapDeleted = true;
					$(rightName + " #mapedge").hide();
				} else {
					mapDeleted = false;
					$(rightName + " #mapedge").show();
				}
			});
			$(rightName + " #proc_url").click(function() {
				const fs = require("fs-extra");
				mapUpdateStartTime = 0;
				if ($(rightName + " #test").is(":checked")) {
					var i = 0;
					clearAllThreads();
					if (/Stop/.test($(rightName + " #proc_url").val().trim())) {
						$(rightName + " #proc_url").val(" Run ");
						return;
					}
					post_http_car(true, 37.5665, 126.9780, 349);
					$(rightName + " #proc_url").val(" Run ");
					return;
				} else {
					var content;
					var i = 0;
					var delay = $(rightName + " #delay").val().trim();
					var res = [];
					var newRes = [];
					clearAllThreads();
					if (!(/^\d+$/.test(delay))) {
						delay = 100;
					}
					if (/Stop/.test($(rightName + " #proc_url").val().trim())) {
						if (lastLat !=0 && lastLon !=0) {
							mapUpdate(lastLat, lastLon);
						}
						$(rightName + " #proc_url").val(" Run ");
						return;
					}
					$(rightName + " #proc_url").val(" Stop ");
					gpxFilePath=($("#gpxfile").val());
					content = fs.readFileSync(gpxFilePath, 'utf-8');
					res = content.replace(/\r\n/g, "\n").split("\n");
					for (i = 0; i < res.length; i++) {
						let entry = res[i];
						if (entry != "") {
							//<trkpt lat="3.157190000" lon="101.7135400">
							entry = entry.trim();
							if (/<trkpt lat="(.+)" lon="(.+)">/.test(entry)) {
								newRes.push(entry);
							}
						}
					}

					for (i = 0; i < newRes.length; i++) {
						let entry = newRes[i].trim();
						let next_entry = newRes[i+1].trim();
						if (entry != "") {
							let oldStripped = entry.replace('<trkpt lat="', '');
							let newStripped = next_entry.replace('<trkpt lat="', '');
							let oldLat, oldLong;
							let newLat, newLong;
							let ret;
							let thread;
							let brng;
							oldLat = oldStripped.replace(/".+/, "");
							oldLong = oldStripped.replace(/.+lon="/, "").replace('">', "");
							newLat = newStripped.replace(/".+/, "");
							newLong = newStripped.replace(/.+lon="/, "").replace('">', "");
							if (/\S/.test(newLat)) {
								if ($(rightName + " #direction").is(":checked")) {
									brng = Math.atan2(newLat - oldLat, newLong - oldLong);
									brng = brng * (180 / Math.PI);
									//brng = (brng + 360) % 360;
									//brng = 360 - brng;
								} else {
									brng = 0;
								}
							} else {
								brng = 0;
							}
							thread = setTimeout(post_http_car, delay*(i+1), false, oldLat, oldLong, brng);
							carThreads.push(thread);
						}
					};
					console.log("signal sent");
				}
			});
			return;
		}

		if (menuName === "iotBulb") {
			const ipc = require('electron').ipcRenderer;
			ipc.on('cmd', (event, arg) => {
				if (arg.msg == "loaded") {
					setTimeout(function() {
						const bodyParser = require('body-parser');
						const express = require("express");
						var app = express();
						app.use(bodyParser.urlencoded({ extended: false }));
						app.use(bodyParser.json());
						app.listen(appPort, () => {
							console.log("Server running on port 3000");
							$(rightName + " #svrstat").attr('src',"ok.png");
						}).on('error', function(err) {
							$(rightName + " #svrstat").attr('src',"warn.png");
						});

						app.get("/iot_bulb", (req, res, next) => {
							res.send("Invalid request");
						});

						app.post("/iot_bulb", (req, res) => {
							var room = "";
							var bulbStat = "";
							var validity = false;
							var rx_content;
							$(rightName + " #rx_content").val(JSON.stringify(req.body) + "\n");

							room += req.body.room;
							bulbStat += req.body.bulb_status;
							if (/^(0|1|2|3|4)$/.test(room.trim())) {
								if (/^(on|off|toggle)$/i.test(bulbStat.trim())) {
									validity = true;
								}
							}
							if (!validity) {
								res.send("Invalid request");
								return;
							}
							if (room.trim() == "0") {
								//
							} else {
								toggle_bulb(rightName + " #room" + room.trim());
								console.log(room.trim());
							}
							res.send('{ "code" : 200 }');
						});
					}, 1000);
				}
			});

			$(".bulbs").click(function() {
				toggle_bulb(this);
			});

			$(rightName + " #script").change(function() {
				var val = $(rightName + " #script").val().trim();
				var data1 =
					'if ( options.metric.value.room.toString() == "';
				var data2 = '" ) {' + "\n" +
					'    options.url = "/proxy/file/resource/bulb_" + options.metric.value.bulb_status + ".png";' + "\n" +
					'}';
				if (val == "none") {
					$(rightName + " #note_content").html("");
				} else if (val == "wizeye1") {
					$(rightName + " #note_content").html(data1 + "1" + data2);
				} else if (val == "wizeye2") {
					$(rightName + " #note_content").html(data1 + "2" + data2);
				} else if (val == "wizeye3") {
					$(rightName + " #note_content").html(data1 + "3" + data2);
				} else if (val == "wizeye4") {
					$(rightName + " #note_content").html(data1 + "4" + data2);
				}
			});


			return;
		}
		
		if (menuName === "iotFlame") {
			$( "#rasp_fire" ).draggable({
				containment: "#limitedArea2",
				revert : function(event, ui) {
                    $(this).data("uiDraggable").originalPosition = {
                            top : 13, left : 0
                    };
					return true;
				}
			});
            $( "#lighter" ).draggable({
					containment: "#limitedArea1",
                    revert : function(event, ui) {
						$("#rasp_fire").attr("src","rasp_fire_off.png");
						$(this).data("uiDraggable").originalPosition = {
							top : 13, left : 0
						};
						return true;
					},
					drag : function() {
						var offset = $(this).offset();
						var xPos = offset.left;
						if (xPos > 550) {
							$("#rasp_fire").attr("src","rasp_fire_on.png");
							post_http_flame();
						} else {
							$("#rasp_fire").attr("src","rasp_fire_off.png");
						}
					}
            });
			$(rightName + " #script").change(function() {
				var val = $(rightName + " #script").val().trim();
				var data =
					'#!/usr/bin/python' + "\n" +
					'import RPi.GPIO as GPIO' + "\n" +
					'import time' + "\n" +
					'' + "\n" +
					'#GPIO SETUP' + "\n" +
					'channel = 21' + "\n" +
					'GPIO.setmode(GPIO.BCM)' + "\n" +
					'GPIO.setup(channel, GPIO.IN)' + "\n" +
					'' + "\n" +
					'def callback(channel):' + "\n" +
					'    print("flame detected")' + "\n" +
					'' + "\n" +
					'GPIO.add_event_detect(channel, GPIO.BOTH, bouncetime=300)  # let us know when the pin goes HIGH or LOW' + "\n" +
					'GPIO.add_event_callback(channel, callback)  # assign function to GPIO PIN, Run function on change' + "\n" +
					'' + "\n" +
					'# infinite loop' + "\n" +
					'while True:' + "\n" +
					'        time.sleep(1)';
				var data2 = '(flame=="on")?"red":"grey";';
				var data3 = '(flame=="on")?true:false;';
				if (val == "none") {
					$(rightName + " #note_content2").html("");
				} else if (val == "python1") {
					$(rightName + " #note_content2").html(data);
				} else if (val == "wizeye1") {
					$(rightName + " #note_content2").html(data2);
				} else if (val == "wizeye2") {
					$(rightName + " #note_content2").html(data3);
				}
			});
			return;
		}

		if (menuName === "demoAutoRunner") {
			$(rightName + " #proc_url1").click(function() {
				var delay = $(rightName + " #delay").val().trim();
				if (!(/^\d+$/.test(delay))) {
					delay = 5000;
				}
				post_http_demo(false, "ready", delay);
				console.log("signal sent");
			});
			$(rightName + " #proc_url2").click(function() {
				var delay = $(rightName + " #delay").val().trim();
				if (!(/^\d+$/.test(delay))) {
					delay = 5000;
				}
				post_http_demo(false, "done", delay);
				console.log("signal sent");
			});
			$(rightName + " #script").change(function() {
				var val = $(rightName + " #script").val().trim();
				var data = 'var x = function sleep(ms) {' + "\n" +
					'    return new Promise(resolve => setTimeout(resolve, ms));' + "\n" +
					'}' + "\n" +
					'var b = async function demo() {' + "\n" +
					'    await x(parseInt(options.metric.value.delay, 10));' + "\n" +
					'    if (options.metric.value.status == "ready") {' + "\n" +
					'    	_do.changeMap("MAPNAME", null, false);' + "\n" +
					'    }' + "\n" +
					'}' + "\n" +
					'b();';
				if (val == "none") {
					$(rightName + " #note_content2").html("");
				} else if (val == "wizeye1") {
					$(rightName + " #note_content2").html(data);
				}
			});
			return;
		}
		alert("Invalid menuName: " + menuName);
	}

	init();
});
