// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// nodeIntegration is set to false in webPreferences.
// Use the exposed electron API via the preload script.

import { DisplayWindowRectPlugin } from "./plugins/DisplayWindowRectPlugin"
import { SyncWindowRectPlugin } from "./plugins/SyncWindowRectPlugin"
import { RendererApp } from "./RendererApp"

// Define the window interface to access the electronAPI
declare global {
	interface Window {
		electronAPI: {
			callMain: <T extends string>(channel: T, ...args: any[]) => Promise<any>;
			answerMain: <T extends string>(channel: T, callback: (...args: any[]) => any) => () => void;
		}
	}
}

async function setupTestHarness(app: RendererApp) {
	const { connectRendererToTestHarness } = await import("../test/TestHarness")
	const harness = await connectRendererToTestHarness()

	harness.answer.measureDOM((css) => {
		const node = document.querySelector(css)
		if (!node) return
		const { x, y, width, height } = node.getBoundingClientRect()
		// Offset the window position
		const window = app.state.rect
		const topbar = 25
		return { x: x + window.x, y: topbar + y + window.y, width, height }
	})

	harness.answer.getState(() => app.state)

	app.onDispatch((action) => {
		harness.call.dispatchAction(action)
	})

	return harness
}

async function main() {
	const { test, rect } = await window.electronAPI.callMain('load');

	const app = new RendererApp({ rect }, [
		SyncWindowRectPlugin,
		DisplayWindowRectPlugin,
	])

	const harness = test ? await setupTestHarness(app) : undefined
}

main()
