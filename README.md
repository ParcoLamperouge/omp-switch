# omp-switch

管理并切换 `~/.omp/agent/` 下的 `models.yml` 与 `config.yml` 配置快照。

## 环境要求

- Node.js **v24.15.0**（验证通过版本，建议使用 `nvm` 对齐）
- Rust / cargo（Tauri 2 需要）
- pnpm

## 常用命令

```bash
# 安装依赖
pnpm install

# 开发启动（热重载前端 + Rust）
pnpm tauri dev

# 前端单独构建
pnpm build

# 运行 Rust 测试
cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1

# 生产打包（macOS：生成带安装背景图和固定图标布局的 .app 与 .dmg）
pnpm dmg
```

`pnpm dmg` 仅适用于 macOS：它使用 Finder 和 `hdiutil` 将 `src-tauri/resources/dmg-background.png` 写入 DMG，并保存 660×400 安装窗口中的图标布局。生成的安装包位于 `src-tauri/target/release/bundle/dmg/`。

## 项目结构

```
omp-switch/
  src/                  # React + TypeScript 前端
  src-tauri/src/        # Rust 后端
    paths.rs            # 路径解析
    profile.rs          # profile CRUD
    validate.rs         # YAML 校验
    switch.rs           # 切换 / 备份 / drift 检测
    detect.rs           # 运行中 omp 进程检测
    lib.rs              # Tauri 命令注册
```

## 数据目录

```
~/.omp-switch/
  state.json            # 当前生效/最后切换的配置 id
  profiles/<id>/
    meta.json           # 配置元数据
    models.yml          # 配置快照
    config.yml
  backups/<timestamp>/  # 每次切换前的自动备份
```

Live 目标路径固定为 `~/.omp/agent/`。

## 高亮与生效说明

- **绿色高亮 / “生效中”**：当前 `~/.omp/agent/models.yml` + `config.yml` 的内容与该 profile 完全一致。
- **“最后切换”**：本工具最后一次切换到此 profile，但 live 文件已被外部改动，不再匹配。
- **drift 黄点**：live 文件与“最后切换”的 profile 不一致。
