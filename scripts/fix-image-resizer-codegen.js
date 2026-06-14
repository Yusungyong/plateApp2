const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@bam.tech',
  'react-native-image-resizer',
  'package.json'
);

const expectedCodegenConfig = {
  name: 'RNImageResizerSpec',
  type: 'modules',
  jsSrcsDir: 'src',
  android: {
    javaPackageName: 'com.reactnativeimageresizer',
  },
};

function hasExpectedConfig(config) {
  return (
    config &&
    config.name === expectedCodegenConfig.name &&
    config.type === expectedCodegenConfig.type &&
    config.jsSrcsDir === expectedCodegenConfig.jsSrcsDir &&
    config.android &&
    config.android.javaPackageName === expectedCodegenConfig.android.javaPackageName
  );
}

try {
  if (!fs.existsSync(packageJsonPath)) {
    process.exit(0);
  }

  const raw = fs.readFileSync(packageJsonPath, 'utf8');
  const parsed = JSON.parse(raw);

  if (hasExpectedConfig(parsed.codegenConfig)) {
    process.exit(0);
  }

  parsed.codegenConfig = expectedCodegenConfig;
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  process.stdout.write('[fix-image-resizer-codegen] patched package.json\n');
} catch (error) {
  process.stderr.write(
    `[fix-image-resizer-codegen] failed: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
}
