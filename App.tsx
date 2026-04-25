import 'react-native-gesture-handler'
import React, { useEffect } from 'react'
import { StatusBar } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AppNavigator } from './src/navigation/AppNavigator'
import { SignalBus } from './src/signal-engine/SignalBus'
import {
  startBehavioralCollector,
  stopBehavioralCollector,
} from './src/signal-engine/BehavioralCollector'
import { assertEnv, ENV } from './src/config/env'
import { LicenseManager } from 'dynamsoft-capture-vision-react-native'

function App(): React.JSX.Element {
  useEffect(() => {
    try {
      assertEnv()
      if (ENV.DYNAMSOFT_LICENSE) {
        LicenseManager.initLicense(ENV.DYNAMSOFT_LICENSE)
          .then(() => console.log('[dynamsoft] License initialized'))
          .catch((err) => console.warn('[dynamsoft] License init failed:', err))
      }
    } catch (e) {
      console.warn('Env not fully loaded:', e)
    }
    SignalBus.start()
    startBehavioralCollector()
    return () => {
      stopBehavioralCollector()
      SignalBus.stop()
    }
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#050a14" />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

export default App
