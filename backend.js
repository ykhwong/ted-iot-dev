const app = require('electron').app;
const frontendDir = 'file://' + __dirname + '/frontend/';

function setTrans(enabled, mainWindow, type) {
	if (process.platform === 'win32') {
		const os = require('os');
		if (parseFloat(os.release()) >= 10) {
			const SWCA = require('windows-swca').SetWindowCompositionAttribute;
			let attribValue = 0; /*AccentState.ACCENT_DISABLED;*/
			let color = 0x00000000;
			if (enabled) {
				if (parseInt(os.release().split('.')[2]) >= 17063 && type === 'fluent') {
					attribValue = 4; /*AccentState.ACCENT_ENABLE_FLUENT;*/
					color = 0x01000000;
				} else {
					attribValue = 3; /*AccentState.ACCENT_ENABLE_BLURBEHIND;*/
				}
			}
			SWCA(mainWindow, attribValue, color);
		} else {
			const DEBEW = require('windows-blurbehind').DwmEnableBlurBehindWindow;
			DEBEW(mainWindow, enabled);
		}
	} else if (process.platform === 'darwin') {
		mainWindow.setVibrancy('dark');
	}
}

app.disableHardwareAcceleration();

app.on('window-all-closed', (e) => {
	if (process.platform != 'darwin')
		app.quit();
});

app.on('ready', function() {
	const BrowserWindow = require('electron').BrowserWindow;
	mainWindow = new BrowserWindow({
		width: 910,
		height: 790,
		minWidth: 910,
		minHeight: 790,
		title: "",
		icon: __dirname + '/icon.png',
		resize: true,
		fullscreen: false,
		frame: false,
		backgroundColor: '#80051336',
		webPreferences: { webSecurity: false, nodeIntegration: true },
		show: false,
		transparent: true
	});

	mainWindow.loadURL(frontendDir + 'main.html');
	setTrans(true, mainWindow, 'fluent');

	if (process.versions.electron.split('.')[0] < 6) {
		mainWindow.setMaximizable(false);
	}
	mainWindow.show();
	mainWindow.focus();

	mainWindow.webContents.on('did-finish-load', function() {
		mainWindow.webContents.send( 'cmd', { msg: 'loaded' } );
	});

	//For debugging:
	//mainWindow.webContents.openDevTools();
});
