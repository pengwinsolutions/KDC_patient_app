import UIKit
import livekit_react_native

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Consultation calls (LiveKit): before React Native starts.
    LivekitReactNative.setup()
    return true
  }
}
