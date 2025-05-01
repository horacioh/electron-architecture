import { strict as assert } from "assert"
import * as child_process from "child_process"
import { it } from "mocha"
import { DeferredPromise } from "../shared/DeferredPromise"
import { rootPath } from "../tools/rootPath"
import { RendererHarness, TestHarness } from "./TestHarness"

async function bootup(cliArgs: string[] = []) {
	const harness = await TestHarness.create()

	// Run the app.
	const cwd = rootPath(".")
	const cmd = rootPath("node_modules/.bin/electron")
	const args = [rootPath("build/main/main.js"), "--test", ...cliArgs]

	const child = child_process.spawn(cmd, args, {
		cwd,
		stdio: ["inherit", "inherit", "inherit"],
	})

	const deferred = new DeferredPromise()

	// Kill the child process when the main process exits.
	const onExit = () => child.kill()
	process.on("exit", onExit)

	child.on("error", (err) => {
		process.off("exit", onExit)
		deferred.reject(err)
	})

	child.on("exit", (code, signal) => {
		process.off("exit", onExit)
		if (code !== 0) {
			deferred.reject(
				new Error(`Unexpected exit code ${code}. "${cmd} ${args.join(" ")}"`)
			)
		} else {
			deferred.resolve()
		}
	})

	// Monkey-patch destroy. Pretty gross...
	const destroy = harness.destroy
	harness.destroy = async () => {
		await destroy()
		child.kill("SIGINT")
		await deferred.promise
	}

	await harness.waitUntilReady()

	return harness
}

export function test(
	testName: string,
	fn: (harness: TestHarness) => void | Promise<void>
) {
	return it(testName, async () => {
		const harness = await bootup()
		try {
			await fn(harness)
		} catch (error) {
			throw error
		} finally {
			await harness.destroy()
		}
	})
}

export async function measureDOM(
	renderer: RendererHarness,
	cssSelector: string
) {
	const rect = await renderer.call.measureDOM(cssSelector)
	assert.ok(rect)
	return rect
}

export function sleep(ms = 0) {
	return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

// Stub for the removed nut.js functionality
// These are placeholder functions that will need to be implemented
// if you want to restore the full testing functionality
export const Key = {
	LeftControl: 0,
	LeftSuper: 1,
	Space: 2,
	Left: 3,
	Right: 4,
	Down: 5,
	Up: 6
};

export const Button = {
	LEFT: 0
};

export async function type(str: string) {
	console.log('Simulating typing:', str);
	// This function no longer performs actual typing
}

export async function shortcut(str: string) {
	console.log('Simulating shortcut:', str);
	// This function no longer performs actual shortcuts
}

export async function click(renderer: RendererHarness, cssSelector: string) {
	console.log('Simulating click on:', cssSelector);
	// This function no longer performs actual clicking
}

type Point = { x: number; y: number }

export async function drag(from: Point, to: Point) {
	console.log('Simulating drag from', from, 'to', to);
	// This function no longer performs actual dragging
}
