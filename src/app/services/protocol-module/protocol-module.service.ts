import { FILESYSTEM_PLUGIN, flattened, ICoinProtocolAdapter, ICoinSubProtocolAdapter, IsolatedAirGapBlockExplorer, IsolatedAirGapOfflineProtocol, IsolatedAirGapV3SerializerCompanion, IsolatedModule, IsolatedModulesPlugin, IsolatedProtocol, ISOLATED_MODULES_PLUGIN, LoadModulesResult } from '@airgap/angular-core'
import { ICoinProtocol, ICoinSubProtocol, ProtocolSymbols } from '@airgap/coinlib-core'
import { Inject, Injectable } from '@angular/core'
import { SerializerV3, TransactionSignRequest, TransactionSignResponse, TransactionValidator } from '@airgap/serializer'
import { Directory, FileInfo, FilesystemPlugin, ReaddirResult } from '@capacitor/filesystem'
import { ZIP_PLUGIN } from 'src/app/capacitor-plugins/injection-tokens'
import { ZipPlugin } from 'src/app/capacitor-plugins/definitions'
import { AirGapBlockExplorer, AirGapOfflineProtocol, AirGapV3SerializerCompanion, implementsInterface, isSubProtocol, V3SchemaConfiguration } from '@airgap/module-kit'

type LoadedProtocolStatus = 'active' | 'passive'

interface LoadedMainProtocol {
  type: 'main'
  status: LoadedProtocolStatus
  result: ICoinProtocolAdapter
}

interface LoadedSubProtocol {
  type: 'sub'
  status: LoadedProtocolStatus
  result: [ICoinProtocolAdapter, ICoinSubProtocolAdapter]
}

type LoadedProtocol = LoadedMainProtocol | LoadedSubProtocol

export interface ProtocolModuleManifest {
  name: string
  version: string
  author: string
  signature: string
  src?: {
    namespace?: string
  }
  res?: {
    symbol?: string
  }
  include: string[]
}

const MANIFEST_FILENAME = 'manifest.json'

export interface ProtocolModuleMetadata {
  manifest: ProtocolModuleManifest
  path: string
  root: string
  directory: Directory
}

@Injectable({
  providedIn: 'root'
})
export class ProtocolModuleService {

  public constructor(
    @Inject(ISOLATED_MODULES_PLUGIN) private readonly isolatedModules: IsolatedModulesPlugin,
    @Inject(FILESYSTEM_PLUGIN) private readonly filesystem: FilesystemPlugin,
    @Inject(ZIP_PLUGIN) private readonly zip: ZipPlugin
  ) {}
  
  public async loadProtocols(ignore: string[] = []): Promise<{ 
    activeProtocols: ICoinProtocol[], 
    passiveProtocols: ICoinProtocol[],
    activeSubProtocols: [ICoinProtocol, ICoinSubProtocol][],
    passiveSubProtocols: [ICoinProtocol, ICoinSubProtocol][]
  }> {
    const { modules }: LoadModulesResult = await this.isolatedModules.loadModules({ protocolType: 'offline' })
    const loadedProtocols: LoadedProtocol[] = await this.loadFromModules(modules, new Set(ignore))

    const activeProtocols: ICoinProtocol[] = []
    const passiveProtocols: ICoinProtocol[] = []
    
    const activeSubProtocols: [ICoinProtocol, ICoinSubProtocol][] = []
    const passiveSubProtocols: [ICoinProtocol, ICoinSubProtocol][] = []

    for (const protocol of loadedProtocols) {
      if (protocol.type === 'main' && protocol.status === 'active') {
        activeProtocols.push(protocol.result)
      }

      if (protocol.type === 'main' && protocol.status === 'passive') {
        passiveProtocols.push(protocol.result)
      }
      
      if (protocol.type === 'sub' && protocol.status === 'active') {
        activeSubProtocols.push(protocol.result)
      }

      if (protocol.type === 'sub' && protocol.status === 'passive') {
        passiveSubProtocols.push(protocol.result)
      }
    }

    return {
      activeProtocols,
      passiveProtocols,
      activeSubProtocols,
      passiveSubProtocols
    }
  }

  private async loadFromModules(modules: IsolatedModule[], ignore: Set<string>): Promise<LoadedProtocol[]> {
    const loadedProtocols: LoadedProtocol[][] = await Promise.all(modules.map(async (module: IsolatedModule) => {
      const v3SerializerCompanion: AirGapV3SerializerCompanion = new IsolatedAirGapV3SerializerCompanion(this.isolatedModules, module.v3SchemaConfigurations, module.identifier)
      this.loadSerializerCompanion(v3SerializerCompanion)

      const activeProtocols: Record<string, ICoinProtocolAdapter> = {}
      const activeSubProtocols: [ICoinProtocolAdapter, ICoinSubProtocolAdapter][] = []

      const targetProtocols: Record<string, IsolatedProtocol> = module.protocols
        .filter((protocol: IsolatedProtocol) => !ignore.has(protocol.identifier) && protocol.mode === 'offline')
        .reduce((obj: Record<string, IsolatedProtocol>, next: IsolatedProtocol) => Object.assign(obj, { [next.identifier]: next }), {})

      for (const protocol of Object.values(targetProtocols)) {
        const adapter: ICoinProtocolAdapter = await this.createProtocolAdapter(protocol, v3SerializerCompanion)

        if (adapter instanceof ICoinSubProtocolAdapter && protocol.type === 'sub') {
          const mainIdentifier: string = protocol.mainProtocolIdentifier
          if (mainIdentifier !in activeProtocols) {
            const mainAdapter: ICoinProtocolAdapter = await this.createProtocolAdapter(targetProtocols[mainIdentifier], v3SerializerCompanion)
            activeProtocols[mainIdentifier] = mainAdapter
          }

          activeSubProtocols.push([activeProtocols[mainIdentifier], adapter])
        } else {
          activeProtocols[protocol.identifier] = adapter
        }
      }

      const loadedMainProtocols: LoadedProtocol[] = Object.values(activeProtocols).map((protocol) => ({
        type: 'main',
        status: 'active',
        result: protocol
      }))

      const loadedSubProtocols: LoadedProtocol[] = activeSubProtocols.map((protocol) => ({
        type: 'sub',
        status: 'active',
        result: protocol
      }))

      return loadedMainProtocols.concat(loadedSubProtocols)
    }))

    return flattened(loadedProtocols)
  }

  private async createProtocolAdapter(
    isolatedProtocol: IsolatedProtocol,
    v3SerializerCompanion: AirGapV3SerializerCompanion
  ): Promise<ICoinProtocolAdapter> {
    const protocol: AirGapOfflineProtocol = new IsolatedAirGapOfflineProtocol(this.isolatedModules, isolatedProtocol)
    const blockExplorer: AirGapBlockExplorer = new IsolatedAirGapBlockExplorer(
      this.isolatedModules, 
      isolatedProtocol.identifier, 
      isolatedProtocol.network, 
      isolatedProtocol.blockExplorerMetadata
    )

    return isSubProtocol(protocol) && isolatedProtocol.type === 'sub'
      ? ICoinSubProtocolAdapter.create(protocol, blockExplorer, v3SerializerCompanion, {
          protocolMetadata: isolatedProtocol.protocolMetadata,
          network: isolatedProtocol.network,
          blockExplorerMetadata: isolatedProtocol.blockExplorerMetadata,
          type: isolatedProtocol.subType,
          contractAddress: isolatedProtocol.contractAddress
        })
      : ICoinProtocolAdapter.create(protocol, blockExplorer, v3SerializerCompanion, {
        protocolMetadata: isolatedProtocol.protocolMetadata,
        network: isolatedProtocol.network,
        blockExplorerMetadata: isolatedProtocol.blockExplorerMetadata
      })
  }

  private loadSerializerCompanion(v3SerializerCompanion: AirGapV3SerializerCompanion) {
    v3SerializerCompanion.schemas.forEach((configuration: V3SchemaConfiguration) => {
      SerializerV3.addSchema(configuration.type, configuration.schema, configuration.protocolIdentifier as ProtocolSymbols)

      if (configuration.protocolIdentifier) {
        SerializerV3.addValidator(configuration.protocolIdentifier as ProtocolSymbols, {
          create(): TransactionValidator {
            return new GenericTransactionValidator(configuration.protocolIdentifier, v3SerializerCompanion) 
          }
        })
      }
    })
  }

  public async readModuleMetadata(name: string, path: string): Promise<ProtocolModuleMetadata> {
    if (!path.endsWith('.zip')) {
      throw new Error('Invalid protocol module format, expected .zip')
    }

    const tempDir = await this.createTempProtocolModuleDir(name)

    try {
      await this.zip.unzip({
        from: path,
        to: tempDir.path,
        toDirectory: tempDir.directory
      })

      const root: string | undefined = await this.findModuleRoot(tempDir.path, tempDir.directory)
      if (root === undefined) {
        throw new Error('Invalid protocol module structure, manifest not found')
      }

      const manifest: ProtocolModuleManifest = await this.readManifest(root, tempDir.directory)

      return {
        manifest,
        path: tempDir.path,
        root: root.replace(`${tempDir.path}/`, ''),
        directory: tempDir.directory
      }
    } catch (error) {
      await this.removeTempProtocolModuleDir(tempDir.path, tempDir.directory).catch(() => { /* no action */ })
      throw error
    }
  }

  private async findModuleRoot(path: string, directory: Directory): Promise<string | undefined> {
    const { type } = await this.filesystem.stat({ path, directory })
    if (type === 'directory') {
      return this.findModuleRootInDir(path, directory)
    } else {
      return undefined
    }
  }

  private async findModuleRootInDir(path: string, directory: Directory): Promise<string | undefined> {
    const { files }: ReaddirResult = await this.filesystem.readdir({ path, directory })
    const hasManifest = files.find((file: FileInfo) => file.type === 'file' && file.name === MANIFEST_FILENAME)
    if (hasManifest) {
      return path
    }

    for (const file of files) {
      if (file.type === 'directory') {
        const root: string | undefined = await this.findModuleRootInDir(`${path}/${file.name}`, directory)
        if (root !== undefined) {
          return root
        }
      }
    }

    return undefined
  }

  private async readManifest(root: string, directory: Directory): Promise<ProtocolModuleManifest> {
    const { data } = await this.filesystem.readFile({ path: `${root}/${MANIFEST_FILENAME}`, directory })
    const manifest: unknown = JSON.parse(Buffer.from(data, 'base64').toString('utf8'))
    if (!isProtocolModuleManifest(manifest)) {
      throw new Error('Invalid protocol module manifest')
    }

    return manifest
  }

  public async installModule(metadata: ProtocolModuleMetadata) {
    const newPath: string = `protocol_modules/${metadata.manifest.name.replace(/\s+/, '_').toLocaleLowerCase()}`
    const newDirectory: Directory = Directory.Data

    try {
      for (const file of [MANIFEST_FILENAME, ...metadata.manifest.include]) {
        const lastSegmentIndex: number = file.lastIndexOf('/')
        const parent = file.substring(0, lastSegmentIndex).replace(/^\/+/, '')

        await this.filesystem.mkdir({
          path: `${newPath}/${parent}`,
          directory: newDirectory,
          recursive: true
        }).catch(() => { /* no action */ })

        await this.filesystem.copy({
          from: `${metadata.path}/${metadata.root}/${file}`,
          directory: metadata.directory,
          to: `${newPath}/${file}`,
          toDirectory: newDirectory
        })
      }
    } catch (error) {
      await this.removeTempProtocolModuleDir(newPath, newDirectory).catch(() => { /* no action */ })
      throw error
    } finally {
      await this.removeTempProtocolModuleDir(metadata.path, metadata.directory).catch(() => { /* no action */ })
    }
  }

  private async createTempProtocolModuleDir(moduleName: string): Promise<{ path: string, directory: Directory }> {
    const tempDir: string = `protocolmodule_${moduleName.replace(/\.zip$/, '')}_${Date.now()}`
    const directory: Directory = Directory.Cache

    await this.filesystem.mkdir({
      path: tempDir,
      directory
    })

    return { path: tempDir, directory }
  }

  private async removeTempProtocolModuleDir(path: string, directory: Directory): Promise<void> {
    return this.filesystem.rmdir({
      path,
      directory,
      recursive: true
    })
  }
}

class GenericTransactionValidator implements TransactionValidator {
  public constructor(private readonly protocolIdentifier: string, private readonly serializerCompanion: AirGapV3SerializerCompanion) {}

  public async validateUnsignedTransaction(transaction: TransactionSignRequest): Promise<any> {
    return this.serializerCompanion.validateTransactionSignRequest(this.protocolIdentifier, transaction)
  }

  public async validateSignedTransaction(transaction: TransactionSignResponse): Promise<any> {
    return this.serializerCompanion.validateTransactionSignResponse(this.protocolIdentifier, transaction)
  }
}

export function isProtocolModuleMetadata(json: unknown): json is ProtocolModuleMetadata {
  return implementsInterface<ProtocolModuleMetadata>(json, {
    manifest: 'required',
    path: 'required',
    root: 'required',
    directory: 'required'
  })
}

export function isProtocolModuleManifest(json: unknown): json is ProtocolModuleManifest {
  return implementsInterface<ProtocolModuleManifest>(json, {
    author: 'required',
    include: 'required',
    name: 'required',
    res: 'optional',
    signature: 'required',
    src: 'optional',
    version: 'required'
  })
}
