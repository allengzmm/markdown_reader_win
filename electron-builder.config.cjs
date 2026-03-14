module.exports = {
  appId: "com.longh.mdreaderwin",
  productName: "Markdown Reader Win",
  copyright: "Copyright (c) Alan Zou worked with Codex GPT",
  directories: {
    output: "release",
  },
  files: [
    "dist/**/*",
    "build/icon.png",
    "electron/**/*.cjs",
    "src/lib/markdown.cjs",
    "package.json",
  ],
  asar: true,
  electronVersion: "37.10.3",
  electronDist: "node_modules/electron/dist",
  icon: "build/icon.png",
  win: {
    icon: "build/icon.ico",
    signAndEditExecutable: false,
    fileAssociations: [
      {
        ext: "md",
        name: "Markdown Document",
        description: "Markdown document",
        role: "Editor",
      },
      {
        ext: "markdown",
        name: "Markdown Document",
        description: "Markdown document",
        role: "Editor",
      },
    ],
    target: [
      {
        target: "nsis",
        arch: ["x64"],
      },
    ],
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    artifactName: "Markdown-Reader-Win-Setup-${version}.${ext}",
  },
  portable: {
    artifactName: "Markdown-Reader-Win-${version}-portable.${ext}",
  },
};
