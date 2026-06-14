import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import AVFoundation // ✅ 추가
#if canImport(GoogleMaps)
import GoogleMaps // ✅ Google Maps SDK
#endif
import Firebase

private let bootstrapLogFileName = "plate-bootstrap.log"
private let enableFirebaseBootstrap = true
private let enableGoogleMapsBootstrap = true
private let enableAudioSessionBootstrap = false

private func bootstrapLogURL() -> URL {
  let cachesURL = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first
    ?? FileManager.default.temporaryDirectory
  return cachesURL.appendingPathComponent(bootstrapLogFileName)
}

private func resetBootstrapLog() {
  let url = bootstrapLogURL()
  let header = "=== plate bootstrap \(ISO8601DateFormatter().string(from: Date())) ===\n"
  try? header.write(to: url, atomically: true, encoding: .utf8)
}

private func appendBootstrapLog(_ message: String) {
  let line = "[\(ISO8601DateFormatter().string(from: Date()))] \(message)\n"
  let url = bootstrapLogURL()
  if let data = line.data(using: .utf8) {
    if FileManager.default.fileExists(atPath: url.path),
       let handle = try? FileHandle(forWritingTo: url) {
      do {
        try handle.seekToEnd()
        try handle.write(contentsOf: data)
        try handle.close()
      } catch {
        try? handle.close()
      }
    } else {
      try? data.write(to: url)
    }
  }
  print("[Bootstrap] \(message)")
}

private func bootstrapExceptionHandler(_ exception: NSException) {
  appendBootstrapLog(
    "uncaught exception name=\(exception.name.rawValue) reason=\(exception.reason ?? "nil") stack=\(exception.callStackSymbols.joined(separator: " | "))"
  )
}

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    resetBootstrapLog()
    NSSetUncaughtExceptionHandler(bootstrapExceptionHandler)
    appendBootstrapLog("didFinishLaunching entered")

    if enableFirebaseBootstrap {
      if FirebaseApp.app() == nil {
        appendBootstrapLog("before FirebaseApp.configure")
        FirebaseApp.configure()
        appendBootstrapLog("after FirebaseApp.configure")
      } else {
        appendBootstrapLog("Firebase already configured")
      }
    } else {
      appendBootstrapLog("Firebase bootstrap skipped")
    }

    // ✅ Google Maps API Key 설정 (여기에 실제 키를 넣으세요)
    if enableGoogleMapsBootstrap {
#if canImport(GoogleMaps)
      appendBootstrapLog("before GMSServices.provideAPIKey")
      GMSServices.provideAPIKey("AIzaSyCJo_cPEesR5gYe01uCP19DzxJEE3muzj8")
      appendBootstrapLog("after GMSServices.provideAPIKey")
#else
      appendBootstrapLog("GoogleMaps module unavailable")
#endif
    } else {
      appendBootstrapLog("GoogleMaps bootstrap skipped")
    }

    // ✅ Audio Session: 앱 시작 시 1회 설정
    // - .ambient: iPhone 무음 스위치 obey (무음이면 영상 소리 안남)
    // - .mixWithOthers: 다른 앱(Spotify 등) 소리와 섞일 수 있음
    if enableAudioSessionBootstrap {
      do {
        appendBootstrapLog("before AVAudioSession configure")
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.ambient, mode: .moviePlayback, options: [.mixWithOthers])
        try session.setActive(true)
        appendBootstrapLog("after AVAudioSession configure")
        print("[AudioSession] configured: ambient/moviePlayback")
      } catch {
        appendBootstrapLog("AVAudioSession config error: \(error.localizedDescription)")
        print("[AudioSession] config error: \(error)")
      }
    } else {
      appendBootstrapLog("AVAudioSession bootstrap skipped")
    }

    appendBootstrapLog("before ReactNativeDelegate/factory init")
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()
    appendBootstrapLog("after ReactNativeDelegate/factory init")

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)
    appendBootstrapLog("window created")

    appendBootstrapLog("before startReactNative")
    factory.startReactNative(
      withModuleName: "plateAppNew",
      in: window,
      launchOptions: launchOptions
    )
    appendBootstrapLog("after startReactNative")

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
