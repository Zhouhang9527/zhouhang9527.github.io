# GitHub 阶段版本约定

- 工作分支：`feature/ginka-artbook`。
- 每完成一个独立部分，先构建并验证，再创建一个独立提交、推送到该分支，并核对远端提交号。
- 一次修正只提交相关源码与测试；不要使用无差别的 `git add .` 把本地报告、临时文件或其他未完成工作一起上传。
- 不直接修改 `main`、不强制推送、不自动执行 `npm run deploy`。推送功能分支不等于线上发布。
- 某部分需要撤销时，优先对其独立提交执行 `git revert <commit>`，保留后续历史；不要覆盖工作区或强制改写远端历史。

## 改造前备份

GitHub 分支：[`backup/pre-artbook-20261121`](https://github.com/Zhouhang9527/zhouhang9527.github.io/tree/backup/pre-artbook-20261121)

备份提交：`37626ad84c5134826da48cccba8381667f39bcb2`。该独立备份分支包含 32 份改造前原始文件及 SHA-256 清单，不是可构建源码分支，勿合并到功能或发布分支。

## 本地验证

```bash
npm run build:release
npm run check
node tools/checks/atri-launcher-regression.js
git diff --check
```

涉及布局或交互时，还需在本地预览核验对应页面及窄屏。验证通过后才提交推送，不用发布操作代替验证。
