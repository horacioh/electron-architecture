import { app, BrowserWindow, session } from "electron"
import { Config } from "./Config"
import { MainApp } from "./MainApp"
import { MainEnvironment } from "./MainEnvironment"
import { AppWindowPlugin } from "./plugins/AppWindowPlugin"
import { SystemMenuPlugin } from "./plugins/SystemMenuPlugin"

function setupConfig(): Config {
	const test = process.argv.slice(2).indexOf("--test") !== -1
	return { test }
}

/**
 * This harness doesn't do much currently.
 */
async function setupTestHarness(config: Config) {
	if (!config.test) return
	const { connectMainToTestHarness } = await import("../test/TestHarness")
	const harness = await connectMainToTestHarness()
	return harness
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
	app.quit();
}

// Set security policies
function setupSecurity() {
	// Restrict navigation to only allowed origins
	app.on('web-contents-created', (_, contents) => {
		contents.on('will-navigate', (event, navigationUrl) => {
			const parsedUrl = new URL(navigationUrl);
			// Only allow file: protocol navigation
			if (parsedUrl.protocol !== 'file:') {
				event.preventDefault();
			}
		});

		// Prevent creating new windows
		contents.setWindowOpenHandler(() => ({ action: 'deny' }));

		// Disable remote module
		contents.session.setPermissionRequestHandler((webContents, permission, callback) => {
			return callback(false);
		});
	});

	// Set content security policy
	session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
		callback({
			responseHeaders: {
				...details.responseHeaders,
				'Content-Security-Policy': ["default-src 'self'; script-src 'self'"]
			}
		});
	});
}

const createMainApp = async () => {
	setupSecurity();
	
	const config = setupConfig()
	const harness = await setupTestHarness(config)
	const mainApp = new MainApp([AppWindowPlugin({ config }), SystemMenuPlugin])

	mainApp.onDispatch((action) => harness?.call.dispatchAction(action))

	const environment: MainEnvironment = { config, app: mainApp }

	return mainApp;
}

app.whenReady().then(async () => {
	const mainApp = await createMainApp();
	
	// Create a window if none exists
	if (BrowserWindow.getAllWindows().length === 0) {
		mainApp.dispatch.newWindow();
	}
	
	// Handle macOS app activation
	app.on("activate", function () {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) {
			mainApp.dispatch.newWindow()
		}
	})
})

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit()
	}
})

// Prevent the app from quitting when all windows are closed on macOS
app.on("will-quit", (event) => {
	// You can add cleanup operations here before the app quits
})

// Prevent navigation to disallowed protocols
app.on('web-contents-created', (event, contents) => {
	contents.on('will-navigate', (event, navigationUrl) => {
		const parsedUrl = new URL(navigationUrl);
		// Only allow navigation to file:// protocol
		if (parsedUrl.protocol !== 'file:') {
			event.preventDefault();
		}
	});
	
	// Disable the creation of new windows
	contents.setWindowOpenHandler(({ url }) => {
		return { action: 'deny' };
	});
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
