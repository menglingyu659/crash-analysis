const { existsSync, mkdirSync, readdirSync } = require("fs");
const path = require("path");
const { uploadToCdn } = require("../tos");
const compressing = require("compressing");
const { extract } = require("./extract.js");
const {
  getPaths,
  localDistDir,
  isDebugReg,
  outputDir,
  systemArch,
} = require("./var");
const { copySync, removeSync } = require("fs-extra");

const outputFileNameList = readdirSync(outputDir);
const uploadSymbols = async (arch) => {
  const {
    localZipDir,
    localDebugDir,
    uploadZipFileBasePath,
    uploadSymbolsAroundBasePath,
    localPADir,
  } = getPaths(arch);
  mkdirSync(localPADir);
  mkdirSync(localDebugDir);
  const debugSymbolsNameAndPath = [];
  outputFileNameList.forEach((fileName) => {
    const filePath = path.join(outputDir, fileName);
    if (isDebugReg.test(fileName) && existsSync(filePath)) {
      if (systemArch.includes(arch) && !fileName.includes(arch)) {
        return;
      }
      copySync(filePath, path.join(localDebugDir, fileName));
      debugSymbolsNameAndPath.push([fileName, filePath]);
    }
  });
  const localZipDebugSymbolPathName = path.join(
    localZipDir,
    `${uploadZipFileBasePath}-debug.zip`
  );
  if (!existsSync(localZipDir)) {
    mkdirSync(localZipDir);
  }
  await compressing.zip.compressDir(localDebugDir, localZipDebugSymbolPathName);
  await uploadToCdn(
    localZipDebugSymbolPathName,
    path.join(uploadSymbolsAroundBasePath, `${uploadZipFileBasePath}-debug.zip`)
  );
  await extract(debugSymbolsNameAndPath, arch);
  return debugSymbolsNameAndPath;
};

(async () => {
  removeSync(localDistDir);
  mkdirSync(localDistDir);
  try {
    const debugSymbolsNameAndPath = await Promise.all(
      process.env.ARCH.split(",").map((arch) => uploadSymbols(arch))
    );
    console.log("😊😊😊 uploadSymbol Success", `arch: ${process.env.ARCH}`);
    const tempArr = [];
    debugSymbolsNameAndPath.forEach((d) => tempArr.push(...d));
    console.log("🦟🦟🦟 start remove debug symbols......", tempArr);
    try {
      tempArr.forEach(([_fileName, filePath]) => {
        removeSync(filePath);
      });
    } catch (error) {
      console.log("😭K🦟 start remove debug fail", error);
      process.exit(1);
    }
    console.log("😊K🦟 remove debug symbols success");
  } catch (error) {
    console.error("😭😭😭 uploadSymbol Fail", error);
    process.exit(1);
  }
})();
