import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import AVFoundation // ✅ 추가

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {

    // ✅ Audio Session: 앱 시작 시 1회 설정
    // - .ambient: iPhone 무음 스위치 obey (무음이면 영상 소리 안남)
    // - .mixWithOthers: 다른 앱(Spotify 등) 소리와 섞일 수 있음
    do {
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(.ambient, mode: .moviePlayback, options: [.mixWithOthers])
      try session.setActive(true)
      print("[AudioSession] configured: ambient/moviePlayback")
    } catch {
      print("[AudioSession] config error: \(error)")
    }

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "plateAppNew",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
