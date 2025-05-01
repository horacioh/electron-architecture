import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { deserializeError, serializeError } from 'serialize-error';
import { MainToRendererIPC, RendererToMainIPC } from '../IPC';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  callMain: <T extends keyof RendererToMainIPC>(
    channel: T,
    ...args: Parameters<RendererToMainIPC[T]>
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      const responseChannel = `${channel}-${Date.now()}-${Math.random()}`;

      const handler = (
        event: IpcRendererEvent,
        result: { data: any; error: any }
      ) => {
        ipcRenderer.removeListener(responseChannel, handler);
        if (result.error) {
          reject(deserializeError(result.error));
        } else {
          resolve(result.data);
        }
      };
      
      ipcRenderer.on(responseChannel, handler);
      ipcRenderer.send(channel as string, responseChannel, ...args);
    });
  },
  answerMain: <T extends keyof MainToRendererIPC>(
    channel: T,
    callback: (...args: any[]) => any
  ): () => void => {
    const handler = async (
      event: IpcRendererEvent,
      responseChannel: string,
      ...args: Array<any>
    ) => {
      try {
        const result = await callback(...args);
        ipcRenderer.send(responseChannel, { data: result });
      } catch (error) {
        ipcRenderer.send(responseChannel, { error: serializeError(error) });
      }
    };
    
    ipcRenderer.on(channel as string, handler);
    return () => {
      ipcRenderer.removeListener(channel as string, handler);
    };
  }
});
