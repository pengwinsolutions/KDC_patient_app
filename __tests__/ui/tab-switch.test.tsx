/**
 * Switching tabs must not re-render whole screens: the status-bar wrapper used to re-render the
 * screen being left and the one being opened on every switch, which made tab taps feel slow.
 */
import React from 'react'
import { Text } from 'react-native'
import ReactTestRenderer, { act } from 'react-test-renderer'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { withStatusBar } from '../../src/navigation/RootNavigator'

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default)

const renders = { a: 0, b: 0 }
function ScreenA() {
  renders.a++
  return <Text>Screen A</Text>
}
function ScreenB() {
  renders.b++
  return <Text>Screen B</Text>
}

test('switching tabs renders the opened screen once and leaves the other screen alone', async () => {
  const Tab = createBottomTabNavigator()
  const A = withStatusBar({ id: 'a', Component: ScreenA } as never)
  const B = withStatusBar({ id: 'b', Component: ScreenB } as never)
  let navigate!: (name: string) => void
  let tree!: ReactTestRenderer.ReactTestRenderer
  await act(async () => {
    tree = ReactTestRenderer.create(
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{ headerShown: false }}
          tabBar={({ navigation }) => {
            navigate = (name) => navigation.navigate(name)
            return null
          }}
        >
          <Tab.Screen name="a" component={A} />
          <Tab.Screen name="b" component={B} />
        </Tab.Navigator>
      </NavigationContainer>,
    )
  })
  expect(renders).toEqual({ a: 1, b: 0 })

  await act(async () => navigate('b'))
  expect(renders).toEqual({ a: 1, b: 1 })

  await act(async () => navigate('a'))
  await act(async () => navigate('b'))
  expect(renders).toEqual({ a: 1, b: 1 })
  await act(async () => tree.unmount())
})
