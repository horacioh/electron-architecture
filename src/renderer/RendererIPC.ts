import { MainToRendererIPC, RendererToMainIPC } from "../IPC"
import { createProxy } from "../shared/proxyHelpers"
import { Answerer, Asyncify, Caller } from "../shared/typeHelpers"

// Define the window interface to access the electronAPI if not defined already
declare global {
	interface Window {
		electronAPI: {
			callMain: <T extends string>(channel: T, ...args: any[]) => Promise<any>;
			answerMain: <T extends string>(channel: T, callback: (...args: any[]) => any) => () => void;
		}
	}
}

type CallMain = Caller<RendererToMainIPC>

export const callMain = createProxy<CallMain>((fn, ...args: any) =>
	callMainFn(fn, ...args)
)

type AnswerMain = Answerer<MainToRendererIPC>

export const answerMain = createProxy<AnswerMain>((fn, callback) =>
	answerMainFn(fn, callback)
)

function callMainFn<T extends keyof RendererToMainIPC>(
	channel: T,
	...args: Parameters<RendererToMainIPC[T]>
): ReturnType<Asyncify<RendererToMainIPC[T]>> {
	return window.electronAPI.callMain(channel as string, ...args) as any;
}

function answerMainFn<T extends keyof MainToRendererIPC>(
	channel: T,
	fn: MainToRendererIPC[T]
) {
	return window.electronAPI.answerMain(channel as string, fn as any);
}
