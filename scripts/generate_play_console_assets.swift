import AppKit

let fileManager = FileManager.default
let cwd = URL(fileURLWithPath: fileManager.currentDirectoryPath)
let outputDir = cwd.appendingPathComponent("play-console-assets/android", isDirectory: true)

let iconSource = cwd.appendingPathComponent("ios/plateAppNew/Images.xcassets/AppIcon.appiconset/icon-1024.png")
let screenshotSources: [(String, String)] = [
    ("/tmp/plate-store-home-clean2.png", "phone-screenshot-01-home.png"),
    ("/tmp/plate-store-home-scroll-clean2.png", "phone-screenshot-02-map-images.png"),
    ("/tmp/plate-store-search-clean2.png", "phone-screenshot-03-search.png"),
]

try fileManager.createDirectory(at: outputDir, withIntermediateDirectories: true)

func loadImage(_ url: URL) -> NSImage {
    guard let image = NSImage(contentsOf: url) else {
        fatalError("Failed to load image: \(url.path)")
    }
    return image
}

func savePNG(_ rep: NSBitmapImageRep, to url: URL) {
    guard let pngData = rep.representation(using: .png, properties: [:]) else {
        fatalError("Failed to encode PNG: \(url.path)")
    }
    try? pngData.write(to: url)
}

func saveJPEG(_ rep: NSBitmapImageRep, to url: URL, compression: CGFloat = 0.92) {
    guard let jpegData = rep.representation(using: .jpeg, properties: [.compressionFactor: compression]) else {
        fatalError("Failed to encode JPEG: \(url.path)")
    }
    try? jpegData.write(to: url)
}

func makeBitmap(width: Int, height: Int, draw: (NSRect) -> Void) -> NSBitmapImageRep {
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: width,
        pixelsHigh: height,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else {
        fatalError("Failed to create bitmap canvas")
    }

    rep.size = NSSize(width: width, height: height)
    NSGraphicsContext.saveGraphicsState()
    guard let context = NSGraphicsContext(bitmapImageRep: rep) else {
        fatalError("Failed to create graphics context")
    }
    NSGraphicsContext.current = context
    draw(NSRect(x: 0, y: 0, width: width, height: height))
    NSGraphicsContext.restoreGraphicsState()
    return rep
}

func drawRoundedImage(
    _ image: NSImage,
    in rect: NSRect,
    radius: CGFloat,
    rotationDegrees: CGFloat = 0,
    shadow: NSShadow? = nil
) {
    guard let ctx = NSGraphicsContext.current?.cgContext else { return }
    ctx.saveGState()

    if let shadow {
        shadow.set()
    }

    let center = CGPoint(x: rect.midX, y: rect.midY)
    ctx.translateBy(x: center.x, y: center.y)
    ctx.rotate(by: rotationDegrees * .pi / 180)
    ctx.translateBy(x: -center.x, y: -center.y)

    let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
    path.addClip()
    image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1.0)

    ctx.restoreGState()
}

func drawPill(_ text: String, in rect: NSRect, fill: NSColor, textColor: NSColor) {
    let pill = NSBezierPath(roundedRect: rect, xRadius: rect.height / 2, yRadius: rect.height / 2)
    fill.setFill()
    pill.fill()

    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .center
    let attrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 15, weight: .semibold),
        .foregroundColor: textColor,
        .paragraphStyle: paragraph,
    ]
    let attributed = NSAttributedString(string: text, attributes: attrs)
    let textRect = NSRect(x: rect.minX, y: rect.minY + 6, width: rect.width, height: rect.height - 8)
    attributed.draw(in: textRect)
}

let icon = loadImage(iconSource)
let home = loadImage(URL(fileURLWithPath: screenshotSources[0].0))
let homeScrolled = loadImage(URL(fileURLWithPath: screenshotSources[1].0))
let search = loadImage(URL(fileURLWithPath: screenshotSources[2].0))

let featureRep = makeBitmap(width: 1024, height: 500) { backgroundRect in
    let background = NSGradient(colors: [
        NSColor(calibratedRed: 1.0, green: 0.978, blue: 0.965, alpha: 1.0),
        NSColor(calibratedRed: 1.0, green: 0.933, blue: 0.878, alpha: 1.0),
    ])!
    background.draw(in: backgroundRect, angle: 0)

    NSColor(calibratedRed: 1.0, green: 0.62, blue: 0.47, alpha: 0.12).setFill()
    NSBezierPath(ovalIn: NSRect(x: -50, y: 280, width: 220, height: 220)).fill()
    NSBezierPath(ovalIn: NSRect(x: 720, y: -30, width: 280, height: 280)).fill()
    NSBezierPath(ovalIn: NSRect(x: 860, y: 280, width: 180, height: 180)).fill()

    let shadow = NSShadow()
    shadow.shadowColor = NSColor(calibratedWhite: 0, alpha: 0.16)
    shadow.shadowBlurRadius = 26
    shadow.shadowOffset = NSSize(width: 0, height: -6)

    drawRoundedImage(home, in: NSRect(x: 545, y: 56, width: 170, height: 378), radius: 28, rotationDegrees: -5, shadow: shadow)
    drawRoundedImage(homeScrolled, in: NSRect(x: 706, y: 34, width: 176, height: 392), radius: 28, rotationDegrees: 2.5, shadow: shadow)
    drawRoundedImage(search, in: NSRect(x: 860, y: 72, width: 140, height: 312), radius: 24, rotationDegrees: 7, shadow: shadow)

    let iconShadow = NSShadow()
    iconShadow.shadowColor = NSColor(calibratedWhite: 0, alpha: 0.14)
    iconShadow.shadowBlurRadius = 24
    iconShadow.shadowOffset = NSSize(width: 0, height: -4)
    iconShadow.set()
    icon.draw(in: NSRect(x: 320, y: 40, width: 136, height: 136))

    drawPill("동네 맛집 기록 앱", in: NSRect(x: 84, y: 396, width: 156, height: 34), fill: NSColor.white.withAlphaComponent(0.92), textColor: NSColor(calibratedRed: 0.74, green: 0.36, blue: 0.16, alpha: 1.0))

    let titleStyle = NSMutableParagraphStyle()
    titleStyle.alignment = .left
    let titleAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 74, weight: .black),
        .foregroundColor: NSColor(calibratedRed: 0.11, green: 0.11, blue: 0.14, alpha: 1.0),
        .paragraphStyle: titleStyle,
    ]
    NSAttributedString(string: "접시", attributes: titleAttrs).draw(in: NSRect(x: 84, y: 290, width: 220, height: 86))

    let bodyAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 28, weight: .semibold),
        .foregroundColor: NSColor(calibratedRed: 0.26, green: 0.27, blue: 0.31, alpha: 1.0),
        .paragraphStyle: titleStyle,
    ]
    NSAttributedString(string: "내 주변 맛집을\n영상과 이미지로 빠르게 탐색", attributes: bodyAttrs)
        .draw(in: NSRect(x: 84, y: 186, width: 370, height: 92))

    let captionAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 18, weight: .medium),
        .foregroundColor: NSColor(calibratedRed: 0.43, green: 0.44, blue: 0.49, alpha: 1.0),
        .paragraphStyle: titleStyle,
    ]
    NSAttributedString(string: "추천 피드 · 지도 미니맵 · 이미지/영상 탐색", attributes: captionAttrs)
        .draw(in: NSRect(x: 84, y: 138, width: 400, height: 28))
}

let icon512Rep = makeBitmap(width: 512, height: 512) { _ in
    icon.draw(in: NSRect(x: 0, y: 0, width: 512, height: 512))
}

savePNG(icon512Rep, to: outputDir.appendingPathComponent("app-icon-512.png"))
savePNG(featureRep, to: outputDir.appendingPathComponent("feature-graphic-1024x500.png"))
saveJPEG(featureRep, to: outputDir.appendingPathComponent("feature-graphic-1024x500.jpg"))

// Copy screenshots into the output directory.
for (sourcePath, filename) in screenshotSources {
    let sourceURL = URL(fileURLWithPath: sourcePath)
    let destURL = outputDir.appendingPathComponent(filename)
    if fileManager.fileExists(atPath: destURL.path) {
        try? fileManager.removeItem(at: destURL)
    }
    try fileManager.copyItem(at: sourceURL, to: destURL)
}

print("Generated Play Console assets in \(outputDir.path)")
