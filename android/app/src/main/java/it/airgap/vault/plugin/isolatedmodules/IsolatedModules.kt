package it.airgap.vault.plugin.isolatedmodules

import android.content.Context
import androidx.lifecycle.lifecycleScope
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin
import it.airgap.vault.util.assertReceived
import it.airgap.vault.util.executeCatching
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

@CapacitorPlugin
class IsolatedModules : Plugin() {

    private val moduleJSContextManager: ModuleJSContextManager = ModuleJSContextManager()

    override fun load() {
        activity.lifecycleScope.launch(Dispatchers.Main) {
            moduleJSContextManager.createJSContext(context)
        }
        super.load()
    }

    @PluginMethod
    fun loadModules(call: PluginCall) {
        call.executeCatching {
            activity.lifecycleScope.launch {
                executeCatching {
                    val jsContext = moduleJSContextManager.get() ?: failWithJSContextNotInitialized()

                    // TODO: load dynamically
                    val modules = listOf(
                        ModuleJSContext.JSModule.Asset(
                            identifier = "aeternity",
                            paths = listOf("public/assets/libs/aeternity/airgap-aeternity.browserify.js"),
                        ),
                        ModuleJSContext.JSModule.Asset(
                            identifier = "astar",
                            paths = listOf("public/assets/libs/astar/airgap-astar.browserify.js"),
                        ),
                        ModuleJSContext.JSModule.Asset(
                            identifier = "bitcoin",
                            paths = listOf("public/assets/libs/bitcoin/airgap-bitcoin.browserify.js"),
                        ),
                        ModuleJSContext.JSModule.Asset(
                            identifier = "cosmos",
                            paths = listOf("public/assets/libs/cosmos/airgap-cosmos.browserify.js"),
                        ),
                        ModuleJSContext.JSModule.Asset(
                            identifier = "ethereum",
                            paths = listOf("public/assets/libs/ethereum/airgap-ethereum.browserify.js"),
                        ),
                        ModuleJSContext.JSModule.Asset(
                            identifier = "groestlcoin",
                            paths = listOf("public/assets/libs/groestlcoin/airgap-groestlcoin.browserify.js"),
                        ),
                        ModuleJSContext.JSModule.Asset(
                            identifier = "moonbeam",
                            paths = listOf("public/assets/libs/moonbeam/airgap-moonbeam.browserify.js"),
                        ),
                        ModuleJSContext.JSModule.Asset(
                            identifier = "polkadot",
                            paths = listOf("public/assets/libs/polkadot/airgap-polkadot.browserify.js"),
                        ),
                        ModuleJSContext.JSModule.Asset(
                            identifier = "tezos",
                            paths = listOf("public/assets/libs/tezos/airgap-tezos.browserify.js"),
                        ),
                    )

                    resolve(jsContext.evaluateLoadModules(modules, protocolType))
                }
            }
        }
    }

    @PluginMethod
    fun callMethod(call: PluginCall) {
        call.executeCatching {
            assertReceived(Param.TARGET, Param.METHOD)

            activity.lifecycleScope.launch {
                executeCatching {
                    val jsContext = moduleJSContextManager.get() ?: failWithJSContextNotInitialized()
                    val value = when (target) {
                        ModuleJSContext.JSCallMethodTarget.OfflineProtocol -> {
                            assertReceived(Param.PROTOCOL_IDENTIFIER)
                            jsContext.evaluateCallOfflineProtocolMethod(method, args, protocolIdentifier)
                        }
                        ModuleJSContext.JSCallMethodTarget.OnlineProtocol -> {
                            assertReceived(Param.PROTOCOL_IDENTIFIER)
                            jsContext.evaluateCallOnlineProtocolMethod(method, args, protocolIdentifier, networkId)
                        }
                        ModuleJSContext.JSCallMethodTarget.BlockExplorer -> {
                            assertReceived(Param.PROTOCOL_IDENTIFIER)
                            jsContext.evaluateCallBlockExplorerMethod(method, args, protocolIdentifier, networkId)
                        }
                        ModuleJSContext.JSCallMethodTarget.V3SerializerCompanion -> {
                            assertReceived(Param.MODULE_IDENTIFIER)
                            jsContext.evaluateCallV3SerializerCompanionMethod(method, args, moduleIdentifier)
                        }
                    }
                    resolve(value)
                }
            }
        }
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        activity.lifecycleScope.launch {
            moduleJSContextManager.get()?.destroy()
        }
    }

    private val PluginCall.protocolType: ModuleJSContext.JSProtocolType?
        get() = getString(Param.PROTOCOL_TYPE)?.let { ModuleJSContext.JSProtocolType.fromString(it) }

    private val PluginCall.target: ModuleJSContext.JSCallMethodTarget
        get() = getString(Param.TARGET)?.let { ModuleJSContext.JSCallMethodTarget.fromString(it) }!!

    private val PluginCall.method: String
        get() = getString(Param.METHOD)!!

    private val PluginCall.args: JSArray?
        get() = getArray(Param.ARGS, null)

    private val PluginCall.protocolIdentifier: String
        get() = getString(Param.PROTOCOL_IDENTIFIER)!!

    private val PluginCall.moduleIdentifier: String
        get() = getString(Param.MODULE_IDENTIFIER)!!

    private val PluginCall.networkId: String?
        get() = getString(Param.NETWORK_ID)

    private class ModuleJSContextManager {
        private val mutex: Mutex = Mutex()
        private var webView: ModuleJSContext? = null

        suspend fun createJSContext(context: Context) = mutex.withLock {
            webView = ModuleJSContext(context)
        }

        suspend fun get(): ModuleJSContext? = mutex.withLock {
            webView
        }
    }

    private object Param {
        const val PROTOCOL_TYPE = "protocolType"
        const val TARGET = "target"
        const val METHOD = "method"
        const val ARGS = "args"
        const val PROTOCOL_IDENTIFIER = "protocolIdentifier"
        const val MODULE_IDENTIFIER = "moduleIdentifier"
        const val NETWORK_ID = "networkId"
    }

    @Throws(IllegalStateException::class)
    private fun failWithJSContextNotInitialized(): Nothing = throw IllegalStateException("JSContext has not been initialized yet.")
}