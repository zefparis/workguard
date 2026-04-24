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
import { assertEnv } from './src/config/env'

function App(): React.JSX.Element {
  useEffect(() => {
    assertEnv()
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
