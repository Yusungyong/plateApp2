# FCM Setup (React Native)

## Install dependencies
```sh
npm install @react-native-firebase/app @react-native-firebase/messaging
```

## Android
1) Download `google-services.json` from Firebase Console.
2) Place it at `android/app/google-services.json`.
3) Sync/clean and rebuild the app.

## iOS
1) Download `GoogleService-Info.plist` from Firebase Console.
2) Add it to the Xcode project target `plateAppNew`.
3) Enable capabilities:
   - Push Notifications
   - Background Modes > Remote notifications
4) Run CocoaPods:
```sh
bundle exec pod install
```

## Notes
- Android 13+ requires the POST_NOTIFICATIONS permission; this repo now requests it at runtime.
- If you want custom UX for foreground notifications, update `src/notifications/fcm.ts`.
