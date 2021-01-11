import { ipcRenderer } from "electron";
import * as proto from "../../common/protocol-handler";
import { autobind } from "../utils";
import * as uuid from "uuid";
import logger from "../../main/logger";
export class LensProtocolRouterRenderer extends proto.LensProtocolRouter {
  // Map between extension IDs and a Map betweeen generated UUIDs and the handlers
  private extensionHandlers = new Map<string, Map<string, proto.RouteHandler>>();
  // Map between generated UUIDs and the handlers
  private internalHandlers = new Map<string, proto.RouteHandler>();

  /**
   * This function is needed to be called early on in the renderers lifetime.
   */
  public init(): void {
    ipcRenderer.on(proto.ProtocolHandlerBackChannel, this.onBackChannelNotify);
  }

  @autobind()
  private onBackChannelNotify(event: Electron.IpcRendererEvent, ...ipcArgs: unknown[]): void {
    const [args] = ipcArgs;

    if (!proto.validateBackChannelParams(args)) {
      return void logger.warn(`${proto.LensProtocolRouter.LoggingPrefix}: ipc call to "${proto.ProtocolHandlerBackChannel}" invalid arguments`, { ipcArgs });
    }

    switch (args.handlerType) {
      case proto.HandlerType.INTERNAL: {
        const { handlerId, params } = args;
        const handler = this.internalHandlers.get(handlerId);

        if (!handler) {
          return void logger.error(`${proto.LensProtocolRouter.LoggingPrefix}: ipc call to "${proto.ProtocolHandlerBackChannel}" unknown handlerId`, { args });
        }

        return handler(params);
      }

      case proto.HandlerType.EXTENSION: {
        const { handlerId, params, extensionId } = args;
        const handler = this.extensionHandlers.get(handlerId)?.get(extensionId);

        if (!handler) {
          return void logger.error(`${proto.LensProtocolRouter.LoggingPrefix}: ipc call to "${proto.ProtocolHandlerBackChannel}" unknown handlerId or unknown extensionId`, { args });
        }

        return handler(params);
      }

    }
  }

  public on(pathSchema: string, handler: proto.RouteHandler): void {
    const handlerId = uuid.v4();
    const args: proto.RegisterParams = {
      handlerType: proto.HandlerType.INTERNAL,
      pathSchema,
      handlerId,
    };

    this.internalHandlers.set(handlerId, handler);

    ipcRenderer.send(proto.ProtocolHandlerRegister, args);
  }

  public extensionOn(extensionId: string, pathSchema: string, handler: proto.RouteHandler): void {
    const handlerId = uuid.v4();

    const args: proto.RegisterParams = {
      handlerType: proto.HandlerType.EXTENSION,
      extensionId,
      pathSchema,
      handlerId,
    };

    this.extensionHandlers
      .set(extensionId, this.extensionHandlers.get(extensionId) ?? new Map())
      .get(extensionId)
      .set(handlerId, handler);

    ipcRenderer.send(proto.ProtocolHandlerRegister, args);
  }

  public removeExtensionHandlers(extensionId: string): void {
    const args: proto.DeregisterParams = {
      extensionId,
    };

    ipcRenderer.send(proto.ProtocolHandlerDeregister, args);
    this.extensionHandlers.delete(extensionId);
  }
}