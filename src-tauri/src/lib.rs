use serde::{Deserialize, Serialize};
use std::{
    env, fs,
    path::{Path, PathBuf},
    process::{Command, Output},
};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DiagnosticItem {
    id: String,
    name: String,
    category_key: String,
    status: String,
    version: Option<String>,
    message_key: String,
    fixable: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemInfo {
    os_name: String,
    os_version: String,
    arch: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ToolItem {
    id: String,
    name: String,
    description: String,
    current_version: Option<String>,
    latest_version: Option<String>,
    installed: bool,
    category: String,
    managed: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ActionResult {
    success: bool,
    message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct CreateProjectResult {
    success: bool,
    path: String,
    message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct NodeVersionItem {
    version: String,
    is_active: bool,
    node_path: Option<String>,
    npm_version: Option<String>,
    pnpm_version: Option<String>,
    yarn_version: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct NodeRuntimeInfo {
    manager: String,
    available: bool,
    active_version: Option<String>,
    installed_versions: Vec<NodeVersionItem>,
    stable_versions: Vec<String>,
    message: Option<String>,
}

#[derive(Debug, Clone, Copy, Eq, PartialEq, Ord, PartialOrd)]
struct Semver {
    major: u32,
    minor: u32,
    patch: u32,
}

enum NodeManager {
    None,
    #[cfg(not(target_os = "windows"))]
    NvmUnix { nvm_dir: PathBuf },
    #[cfg(target_os = "windows")]
    NvmWindows { nvm_home: PathBuf },
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateProjectPayload {
    project_name: String,
    template: String,
    package_manager: String,
    init_git: bool,
    base_path: Option<String>,
    selected_node: Option<String>,
}

fn home_dir() -> Option<PathBuf> {
    env::var_os("HOME")
        .map(PathBuf::from)
        .or_else(|| env::var_os("USERPROFILE").map(PathBuf::from))
}

fn common_bin_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();

    if let Some(path) = env::var_os("PATH") {
        dirs.extend(env::split_paths(&path));
    }

    if let Some(home) = home_dir() {
        dirs.push(home.join(".cargo/bin"));
        dirs.push(home.join(".local/bin"));
        dirs.push(home.join(".volta/bin"));
        dirs.push(home.join(".fnm"));
        dirs.push(home.join(".nvm"));

        let nvm_versions = home.join(".nvm/versions/node");
        if let Ok(entries) = fs::read_dir(nvm_versions) {
            for entry in entries.flatten() {
                dirs.push(entry.path().join("bin"));
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        let vars = [
            "ProgramFiles",
            "ProgramFiles(x86)",
            "LocalAppData",
            "AppData",
            "NVM_HOME",
            "NVM_SYMLINK",
        ];

        for key in vars {
            if let Some(value) = env::var_os(key) {
                let base = PathBuf::from(value);
                match key {
                    "ProgramFiles" | "ProgramFiles(x86)" => dirs.push(base.join("nodejs")),
                    "LocalAppData" => {
                        dirs.push(base.join("Programs/nodejs"));
                        dirs.push(base.join("Microsoft/WindowsApps"));
                    }
                    "AppData" => dirs.push(base.join("npm")),
                    _ => dirs.push(base),
                }
            }
        }

        if let Some(home) = home_dir() {
            dirs.push(home.join("scoop/shims"));
            dirs.push(home.join("AppData/Roaming/npm"));
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        dirs.push(PathBuf::from("/opt/homebrew/bin"));
        dirs.push(PathBuf::from("/usr/local/bin"));
        dirs.push(PathBuf::from("/usr/bin"));
        dirs.push(PathBuf::from("/bin"));
        dirs.push(PathBuf::from("/opt/local/bin"));
    }

    let mut unique = Vec::new();
    for dir in dirs {
        if dir.as_os_str().is_empty() {
            continue;
        }
        if !unique.iter().any(|existing: &PathBuf| existing == &dir) {
            unique.push(dir);
        }
    }
    unique
}

fn augmented_path_value() -> Option<String> {
    let dirs = common_bin_dirs();
    env::join_paths(dirs)
        .ok()
        .and_then(|value| value.into_string().ok())
}

fn resolve_program(program: &str) -> PathBuf {
    let path = PathBuf::from(program);
    if path.components().count() > 1 && path.exists() {
        return path;
    }

    #[cfg(target_os = "windows")]
    let candidates = [program.to_string(), format!("{program}.exe"), format!("{program}.cmd"), format!("{program}.bat")];
    #[cfg(not(target_os = "windows"))]
    let candidates = [program.to_string()];

    for dir in common_bin_dirs() {
        for candidate in &candidates {
            let full = dir.join(candidate);
            if full.exists() {
                return full;
            }
        }
    }

    path
}

fn prepare_command(program: &str, cwd: Option<&Path>) -> Command {
    let resolved = resolve_program(program);
    #[cfg(target_os = "windows")]
    let mut command = {
        let extension = resolved
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.to_ascii_lowercase());
        let use_cmd = matches!(extension.as_deref(), Some("cmd" | "bat"))
            || matches!(program, "npm" | "npx" | "pnpm" | "yarn" | "corepack");

        if use_cmd {
            let mut cmd = Command::new("cmd");
            cmd.arg("/C");
            if resolved.exists() {
                cmd.arg(&resolved);
            } else {
                cmd.arg(program);
            }
            cmd
        } else {
            Command::new(&resolved)
        }
    };

    #[cfg(not(target_os = "windows"))]
    let mut command = Command::new(&resolved);

    if let Some(path) = cwd {
        command.current_dir(path);
    }
    if let Some(path) = augmented_path_value() {
        command.env("PATH", path);
    }
    #[cfg(target_os = "windows")]
    {
        command.creation_flags(CREATE_NO_WINDOW);
    }
    command
}

fn run_command_output(program: &str, args: &[String], cwd: Option<&Path>) -> Result<Output, String> {
    let mut command = prepare_command(program, cwd);
    command.args(args);
    command
        .output()
        .map_err(|err| format!("failed to execute {program}: {err}"))
}

fn run_command(program: &str, args: &[&str], cwd: Option<&Path>) -> Result<String, String> {
    let args: Vec<String> = args.iter().map(|arg| (*arg).to_string()).collect();

    let output = run_command_output(program, &args, cwd)?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if output.status.success() {
        if stdout.is_empty() {
            Ok(stderr)
        } else {
            Ok(stdout)
        }
    } else if !stderr.is_empty() {
        Err(stderr)
    } else if !stdout.is_empty() {
        Err(stdout)
    } else {
        Err(format!("{program} exited with {}", output.status))
    }
}

fn run_command_owned(program: &str, args: &[String], cwd: Option<&Path>) -> Result<String, String> {
    let output = run_command_output(program, args, cwd)?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if output.status.success() {
        if stdout.is_empty() {
            Ok(stderr)
        } else {
            Ok(stdout)
        }
    } else if !stderr.is_empty() {
        Err(stderr)
    } else if !stdout.is_empty() {
        Err(stdout)
    } else {
        Err(format!("{program} exited with {}", output.status))
    }
}

fn first_line(value: &str) -> String {
    value.lines().next().unwrap_or_default().trim().to_string()
}

fn non_empty(value: Result<String, String>) -> Option<String> {
    value.ok().and_then(|v| {
        let s = first_line(&v);
        if s.is_empty() { None } else { Some(s) }
    })
}

fn version_from_executable(exec_path: &Path, args: &[&str]) -> Option<String> {
    let exec = exec_path.to_str()?;
    non_empty(run_command(exec, args, None))
}

fn npm_version_fallback() -> Option<String> {
    let node_exec = resolve_program("node");
    if !node_exec.exists() {
        return None;
    }

    let node_dir = node_exec.parent()?;

    #[cfg(target_os = "windows")]
    {
        let npm_cmd = node_dir.join("npm.cmd");
        if let Some(version) = version_from_executable(&npm_cmd, &["--version"]) {
            return Some(version);
        }
    }

    let npm_exec = node_dir.join("npm");
    if let Some(version) = version_from_executable(&npm_exec, &["--version"]) {
        return Some(version);
    }

    let script_candidates = [
        node_dir.join("node_modules/npm/bin/npm-cli.js"),
        node_dir.join("../lib/node_modules/npm/bin/npm-cli.js"),
    ];

    for script in script_candidates {
        if !script.exists() {
            continue;
        }
        let Some(node_str) = node_exec.to_str() else {
            continue;
        };
        let Some(script_str) = script.to_str() else {
            continue;
        };
        if let Some(version) = non_empty(run_command(node_str, &[script_str, "--version"], None)) {
            return Some(version);
        }
    }

    None
}

fn parse_semver(raw: &str) -> Option<Semver> {
    let cleaned = raw
        .trim()
        .trim_start_matches(|c| c == 'v' || c == 'V')
        .trim_matches(|c: char| !c.is_ascii_digit() && c != '.');
    let mut parts = cleaned.split('.');
    let major = parts.next()?.parse::<u32>().ok()?;
    let minor = parts.next()?.parse::<u32>().ok()?;
    let patch = parts.next()?.parse::<u32>().ok()?;
    if parts.next().is_some() {
        return None;
    }
    Some(Semver { major, minor, patch })
}

fn semver_to_version(semver: Semver) -> String {
    format!("v{}.{}.{}", semver.major, semver.minor, semver.patch)
}

fn normalize_version(raw: &str) -> Option<String> {
    parse_semver(raw).map(semver_to_version)
}

fn package_json_version(package_dir: &Path) -> Option<String> {
    let content = fs::read_to_string(package_dir.join("package.json")).ok()?;
    let parsed = serde_json::from_str::<serde_json::Value>(&content).ok()?;
    parsed
        .get("version")
        .and_then(|value| value.as_str())
        .map(|value| value.to_string())
}

fn current_node_version() -> Option<String> {
    non_empty(run_command("node", &["--version"], None)).and_then(|value| normalize_version(&value))
}

fn target_node_majors() -> Vec<u32> {
    (14..=24).collect()
}

fn detect_node_manager() -> NodeManager {
    #[cfg(target_os = "windows")]
    {
        if let Some(home) = env::var_os("NVM_HOME").map(PathBuf::from) {
            if home.exists() {
                return NodeManager::NvmWindows { nvm_home: home };
            }
        }

        if let Some(home) = home_dir() {
            let roaming = home.join("AppData/Roaming/nvm");
            if roaming.exists() {
                return NodeManager::NvmWindows { nvm_home: roaming };
            }
        }

        let nvm_exec = resolve_program("nvm");
        if nvm_exec.exists() {
            if let Some(parent) = nvm_exec.parent() {
                return NodeManager::NvmWindows {
                    nvm_home: parent.to_path_buf(),
                };
            }
        }

        NodeManager::None
    }
    #[cfg(not(target_os = "windows"))]
    {
        let nvm_dir = env::var_os("NVM_DIR")
            .map(PathBuf::from)
            .or_else(|| home_dir().map(|home| home.join(".nvm")));

        if let Some(dir) = nvm_dir {
            if dir.join("nvm.sh").exists() {
                return NodeManager::NvmUnix { nvm_dir: dir };
            }
        }

        NodeManager::None
    }
}

fn manager_label(manager: &NodeManager) -> String {
    match manager {
        #[cfg(not(target_os = "windows"))]
        NodeManager::NvmUnix { .. } => "nvm".into(),
        #[cfg(target_os = "windows")]
        NodeManager::NvmWindows { .. } => "nvm-windows".into(),
        NodeManager::None => "none".into(),
    }
}

fn quoted_shell(value: &str) -> String {
    if value
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || "-_./:@".contains(ch))
    {
        value.to_string()
    } else {
        format!("'{}'", value.replace('\'', "'\"'\"'"))
    }
}

fn run_nvm_shell(nvm_dir: &Path, command: &str) -> Result<String, String> {
    let nvm_dir_str = quoted_shell(&nvm_dir.to_string_lossy());
    let script = format!(
        "export NVM_DIR={nvm_dir_str}; [ -s \"$NVM_DIR/nvm.sh\" ] && . \"$NVM_DIR/nvm.sh\"; {command}"
    );
    run_command("bash", &["-lc", &script], None)
}

fn run_nvm_command(manager: &NodeManager, args: &[&str]) -> Result<String, String> {
    match manager {
        #[cfg(target_os = "windows")]
        NodeManager::NvmWindows { .. } => run_command("nvm", args, None),
        #[cfg(not(target_os = "windows"))]
        NodeManager::NvmUnix { nvm_dir } => {
            let joined = args
                .iter()
                .map(|value| quoted_shell(value))
                .collect::<Vec<_>>()
                .join(" ");
            let command = format!("nvm {joined}");
            run_nvm_shell(nvm_dir, &command)
        }
        NodeManager::None => Err("nvm is not installed or not detected.".into()),
    }
}

fn list_nvm_installations(manager: &NodeManager) -> Vec<(Semver, String, PathBuf)> {
    let root = match manager {
        #[cfg(not(target_os = "windows"))]
        NodeManager::NvmUnix { nvm_dir } => nvm_dir.join("versions/node"),
        #[cfg(target_os = "windows")]
        NodeManager::NvmWindows { nvm_home } => nvm_home.to_path_buf(),
        NodeManager::None => return Vec::new(),
    };

    let mut versions = Vec::new();
    let Ok(entries) = fs::read_dir(root) else {
        return versions;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|value| value.to_str()) else {
            continue;
        };
        let Some(semver) = parse_semver(name) else {
            continue;
        };
        versions.push((semver, semver_to_version(semver), path));
    }

    versions.sort_by(|left, right| right.0.cmp(&left.0));
    versions
}

fn npm_cli_for_install_dir(install_dir: &Path) -> Option<PathBuf> {
    let candidates = [
        install_dir.join("lib/node_modules/npm/bin/npm-cli.js"),
        install_dir.join("node_modules/npm/bin/npm-cli.js"),
    ];
    candidates.into_iter().find(|candidate| candidate.exists())
}

fn npm_exec_for_install_dir(install_dir: &Path) -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    let candidates = [install_dir.join("npm.cmd"), install_dir.join("npm")];
    #[cfg(not(target_os = "windows"))]
    let candidates = [install_dir.join("bin/npm"), install_dir.join("npm")];
    candidates.into_iter().find(|candidate| candidate.exists())
}

fn package_exec_for_install_dir(install_dir: &Path, package: &str) -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    let candidates = [
        install_dir.join(format!("{package}.cmd")),
        install_dir.join(package),
    ];
    #[cfg(not(target_os = "windows"))]
    let candidates = [
        install_dir.join(format!("bin/{package}")),
        install_dir.join(package),
    ];
    candidates.into_iter().find(|candidate| candidate.exists())
}

fn detect_global_package_version(modules_root: Option<&Path>, package: &str) -> Option<String> {
    modules_root.and_then(|root| package_json_version(&root.join(package)))
}

fn inspect_nvm_installation(version: &str, install_dir: &Path, active_version: Option<&str>) -> NodeVersionItem {
    #[cfg(target_os = "windows")]
    let node_exec = install_dir.join("node.exe");
    #[cfg(not(target_os = "windows"))]
    let node_exec = install_dir.join("bin/node");

    let npm_exec = npm_exec_for_install_dir(install_dir);
    let npm_cli = npm_cli_for_install_dir(install_dir);

    let npm_version = npm_exec
        .as_ref()
        .and_then(|path| version_from_executable(path, &["--version"]))
        .or_else(|| {
            let node = node_exec.to_str()?;
            let cli = npm_cli.as_ref()?.to_str()?;
            non_empty(run_command(node, &[cli, "--version"], None))
        });

    let modules_root = if node_exec.exists() {
        #[cfg(target_os = "windows")]
        {
            let root = install_dir.join("node_modules");
            if root.exists() {
                Some(root)
            } else {
                None
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            let root = install_dir.join("lib/node_modules");
            if root.exists() {
                Some(root)
            } else {
                None
            }
        }
    } else {
        None
    };

    let pnpm_version = package_exec_for_install_dir(install_dir, "pnpm")
        .as_ref()
        .and_then(|path| version_from_executable(path, &["--version"]))
        .or_else(|| detect_global_package_version(modules_root.as_deref(), "pnpm"));
    let yarn_version = package_exec_for_install_dir(install_dir, "yarn")
        .as_ref()
        .and_then(|path| version_from_executable(path, &["--version"]))
        .or_else(|| detect_global_package_version(modules_root.as_deref(), "yarn"));

    NodeVersionItem {
        version: version.to_string(),
        is_active: active_version.map(|current| current == version).unwrap_or(false),
        node_path: if node_exec.exists() {
            Some(node_exec.to_string_lossy().to_string())
        } else {
            None
        },
        npm_version,
        pnpm_version,
        yarn_version,
    }
}

fn load_stable_versions(manager: &NodeManager) -> Vec<String> {
    if matches!(manager, NodeManager::None) {
        return target_node_majors()
            .into_iter()
            .map(|major| major.to_string())
            .collect::<Vec<_>>();
    }

    // Keep this local and deterministic to avoid slow network calls on page open.
    target_node_majors()
        .into_iter()
        .map(|major| major.to_string())
        .collect::<Vec<_>>()
}

fn package_manager_version(name: &str) -> Option<String> {
    non_empty(run_command(name, &["--version"], None))
}

fn nvm_version_arg(version: &str) -> Option<String> {
    let trimmed = version.trim();
    if trimmed.is_empty() {
        return None;
    }
    if let Some(semver) = parse_semver(trimmed) {
        return Some(format!("{}.{}.{}", semver.major, semver.minor, semver.patch));
    }
    if trimmed.chars().all(|ch| ch.is_ascii_digit()) {
        return Some(trimmed.to_string());
    }
    Some(trimmed.trim_start_matches(|ch| ch == 'v' || ch == 'V').to_string())
}

fn package_manager_exists(name: &str) -> bool {
    if name == "npm" {
        return non_empty(run_command("npm", &["--version"], None))
            .or_else(npm_version_fallback)
            .is_some();
    }
    run_command(name, &["--version"], None).is_ok()
}

fn build_diagnostics() -> Vec<DiagnosticItem> {
    let node_version = non_empty(run_command("node", &["--version"], None));
    let npm_version = non_empty(run_command("npm", &["--version"], None)).or_else(npm_version_fallback);
    let pnpm_version = package_manager_version("pnpm");
    let yarn_version = package_manager_version("yarn");
    let git_version = non_empty(run_command("git", &["--version"], None));
    let node_ok = node_version.is_some();
    let npm_ok = npm_version.is_some();
    let pnpm_ok = pnpm_version.is_some();
    let yarn_ok = yarn_version.is_some();
    let git_ok = git_version.is_some();

    let ssh_found = home_dir()
        .map(|home| home.join(".ssh/id_ed25519").exists() || home.join(".ssh/id_rsa").exists())
        .unwrap_or(false);

    let git_name = non_empty(run_command("git", &["config", "--global", "user.name"], None));
    let git_email = non_empty(run_command("git", &["config", "--global", "user.email"], None));
    let git_name_ok = git_name.is_some();
    let git_email_ok = git_email.is_some();

    vec![
        DiagnosticItem {
            id: "node".into(),
            name: "Node.js".into(),
            category_key: "runtime".into(),
            status: if node_ok { "ok" } else { "missing" }.into(),
            version: node_version,
            message_key: if node_ok { "nodeInstalled" } else { "nodeMissing" }.into(),
            fixable: false,
        },
        DiagnosticItem {
            id: "npm".into(),
            name: "npm".into(),
            category_key: "packageManager".into(),
            status: if npm_ok { "ok" } else { "missing" }.into(),
            version: npm_version,
            message_key: if npm_ok { "npmAvailable" } else { "npmMissing" }.into(),
            fixable: false,
        },
        DiagnosticItem {
            id: "pnpm".into(),
            name: "pnpm".into(),
            category_key: "packageManager".into(),
            status: if pnpm_ok { "ok" } else { "missing" }.into(),
            version: pnpm_version,
            message_key: if pnpm_ok { "pnpmAvailable" } else { "pnpmMissing" }.into(),
            fixable: npm_ok,
        },
        DiagnosticItem {
            id: "yarn".into(),
            name: "yarn".into(),
            category_key: "packageManager".into(),
            status: if yarn_ok { "ok" } else { "missing" }.into(),
            version: yarn_version,
            message_key: if yarn_ok { "yarnAvailable" } else { "yarnMissing" }.into(),
            fixable: npm_ok,
        },
        DiagnosticItem {
            id: "git".into(),
            name: "Git".into(),
            category_key: "versionControl".into(),
            status: if git_ok { "ok" } else { "missing" }.into(),
            version: git_version,
            message_key: if git_ok { "gitInstalled" } else { "gitMissing" }.into(),
            fixable: false,
        },
        DiagnosticItem {
            id: "ssh".into(),
            name: "SSH Key".into(),
            category_key: "authentication".into(),
            status: if ssh_found { "ok" } else { "missing" }.into(),
            version: None,
            message_key: if ssh_found { "sshFound" } else { "sshMissing" }.into(),
            fixable: false,
        },
        DiagnosticItem {
            id: "git-config-name".into(),
            name: "Git User Name".into(),
            category_key: "gitConfig".into(),
            status: if git_name_ok { "ok" } else { "error" }.into(),
            version: None,
            message_key: if git_name_ok {
                "gitNameConfigured"
            } else {
                "gitNameNotConfigured"
            }
            .into(),
            fixable: true,
        },
        DiagnosticItem {
            id: "git-config-email".into(),
            name: "Git User Email".into(),
            category_key: "gitConfig".into(),
            status: if git_email_ok { "ok" } else { "error" }.into(),
            version: None,
            message_key: if git_email_ok {
                "gitNameConfigured"
            } else {
                "gitEmailNotConfigured"
            }
            .into(),
            fixable: true,
        },
    ]
}

fn os_name() -> String {
    match env::consts::OS {
        "macos" => "macOS".into(),
        "windows" => "Windows".into(),
        "linux" => "Linux".into(),
        other => other.to_string(),
    }
}

fn os_version() -> String {
    if cfg!(target_os = "macos") {
        non_empty(run_command("sw_vers", &["-productVersion"], None))
            .unwrap_or_else(|| "Unknown".into())
    } else if cfg!(target_os = "linux") {
        non_empty(run_command("uname", &["-r"], None)).unwrap_or_else(|| "Unknown".into())
    } else if cfg!(target_os = "windows") {
        non_empty(run_command("cmd", &["/C", "ver"], None)).unwrap_or_else(|| "Unknown".into())
    } else {
        "Unknown".into()
    }
}

fn expand_home_path(path: &str) -> PathBuf {
    if path == "~" {
        return home_dir().unwrap_or_else(|| PathBuf::from("."));
    }
    if let Some(stripped) = path.strip_prefix("~/") {
        return home_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join(stripped);
    }
    PathBuf::from(path)
}

fn create_node_ts_project(project_path: &Path, package_manager: &str) -> Result<(), String> {
    fs::create_dir_all(project_path.join("src"))
        .map_err(|err| format!("failed to create project folders: {err}"))?;

    fs::write(
        project_path.join("package.json"),
        r#"{
  "name": "node-ts-app",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
"#,
    )
    .map_err(|err| format!("failed to write package.json: {err}"))?;

    fs::write(
        project_path.join("tsconfig.json"),
        r#"{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
"#,
    )
    .map_err(|err| format!("failed to write tsconfig.json: {err}"))?;

    fs::write(
        project_path.join("src/index.ts"),
        r#"console.log("Hello from Node + TypeScript!");
"#,
    )
    .map_err(|err| format!("failed to write src/index.ts: {err}"))?;

    match package_manager {
        "npm" => {
            run_command(
                "npm",
                &["install", "-D", "typescript", "tsx", "@types/node"],
                Some(project_path),
            )?;
        }
        "pnpm" => {
            run_command(
                "pnpm",
                &["add", "-D", "typescript", "tsx", "@types/node"],
                Some(project_path),
            )?;
        }
        "yarn" => {
            run_command(
                "yarn",
                &["add", "-D", "typescript", "tsx", "@types/node"],
                Some(project_path),
            )?;
        }
        _ => return Err("unsupported package manager".into()),
    }

    Ok(())
}

fn install_dependencies(package_manager: &str, project_path: &Path) -> Result<(), String> {
    match package_manager {
        "npm" => {
            run_command("npm", &["install"], Some(project_path))?;
        }
        "pnpm" => {
            run_command("pnpm", &["install"], Some(project_path))?;
        }
        "yarn" => {
            run_command("yarn", &["install"], Some(project_path))?;
        }
        _ => return Err("unsupported package manager".into()),
    };
    Ok(())
}

#[tauri::command]
fn scan_environment() -> Vec<DiagnosticItem> {
    build_diagnostics()
}

#[tauri::command]
fn get_system_info() -> SystemInfo {
    SystemInfo {
        os_name: os_name(),
        os_version: os_version(),
        arch: env::consts::ARCH.to_string(),
    }
}

#[tauri::command]
fn list_tools() -> Vec<ToolItem> {
    let diagnostics = build_diagnostics();
    let lookup = |id: &str| diagnostics.iter().find(|item| item.id == id);
    let current = |id: &str| lookup(id).and_then(|item| item.version.clone());

    vec![
        ToolItem {
            id: "node".into(),
            name: "Node.js".into(),
            description: "JavaScript runtime built on V8".into(),
            current_version: lookup("node").and_then(|x| x.version.clone()),
            latest_version: None,
            installed: lookup("node").map(|x| x.status == "ok").unwrap_or(false),
            category: "Runtime".into(),
            managed: false,
        },
        ToolItem {
            id: "npm".into(),
            name: "npm".into(),
            description: "Node package manager".into(),
            current_version: current("npm"),
            latest_version: current("npm"),
            installed: lookup("npm").map(|x| x.status == "ok").unwrap_or(false),
            category: "Package Manager".into(),
            managed: true,
        },
        ToolItem {
            id: "pnpm".into(),
            name: "pnpm".into(),
            description: "Fast, disk space efficient package manager".into(),
            current_version: current("pnpm"),
            latest_version: current("pnpm"),
            installed: lookup("pnpm").map(|x| x.status == "ok").unwrap_or(false),
            category: "Package Manager".into(),
            managed: true,
        },
        ToolItem {
            id: "yarn".into(),
            name: "yarn".into(),
            description: "Reliable dependency management".into(),
            current_version: current("yarn"),
            latest_version: current("yarn"),
            installed: lookup("yarn").map(|x| x.status == "ok").unwrap_or(false),
            category: "Package Manager".into(),
            managed: true,
        },
        ToolItem {
            id: "git".into(),
            name: "Git".into(),
            description: "Distributed version control system".into(),
            current_version: lookup("git").and_then(|x| x.version.clone()),
            latest_version: None,
            installed: lookup("git").map(|x| x.status == "ok").unwrap_or(false),
            category: "Version Control".into(),
            managed: false,
        },
    ]
}

#[tauri::command]
fn get_node_runtime_info() -> NodeRuntimeInfo {
    let manager = detect_node_manager();
    let manager_name = manager_label(&manager);
    let active_version = current_node_version();

    let mut installed_versions = list_nvm_installations(&manager)
        .into_iter()
        .map(|(_, version, path)| inspect_nvm_installation(&version, &path, active_version.as_deref()))
        .collect::<Vec<_>>();

    if installed_versions.is_empty() {
        let node_path = resolve_program("node");
        if node_path.exists() {
            installed_versions.push(NodeVersionItem {
                version: active_version.clone().unwrap_or_else(|| "unknown".into()),
                is_active: true,
                node_path: Some(node_path.to_string_lossy().to_string()),
                npm_version: non_empty(run_command("npm", &["--version"], None)).or_else(npm_version_fallback),
                pnpm_version: package_manager_version("pnpm"),
                yarn_version: package_manager_version("yarn"),
            });
        }
    }

    let message = match &manager {
        NodeManager::None => Some("nvm was not detected. Install nvm (or nvm-windows) to manage multiple Node versions.".into()),
        _ => None,
    };

    NodeRuntimeInfo {
        manager: manager_name,
        available: !matches!(manager, NodeManager::None),
        active_version,
        installed_versions,
        stable_versions: load_stable_versions(&manager),
        message,
    }
}

#[tauri::command]
fn install_node_version(version: String) -> Result<ActionResult, String> {
    let manager = detect_node_manager();
    if matches!(manager, NodeManager::None) {
        return Err("nvm is not available. Please install nvm (or nvm-windows) first.".into());
    }

    let Some(version_arg) = nvm_version_arg(&version) else {
        return Err("Version is required.".into());
    };

    let output = run_nvm_command(&manager, &["install", &version_arg])?;
    Ok(ActionResult {
        success: true,
        message: if output.is_empty() {
            format!("Node {version_arg} installed.")
        } else {
            output
        },
    })
}

#[tauri::command]
fn switch_node_version(version: String) -> Result<ActionResult, String> {
    let manager = detect_node_manager();
    if matches!(manager, NodeManager::None) {
        return Err("nvm is not available. Please install nvm (or nvm-windows) first.".into());
    }

    let Some(version_arg) = nvm_version_arg(&version) else {
        return Err("Version is required.".into());
    };

    let output = match &manager {
        #[cfg(target_os = "windows")]
        NodeManager::NvmWindows { .. } => run_nvm_command(&manager, &["use", &version_arg])?,
        #[cfg(not(target_os = "windows"))]
        NodeManager::NvmUnix { nvm_dir } => {
            let quoted = quoted_shell(&version_arg);
            let command = format!("nvm use {quoted} && nvm alias default {quoted}");
            run_nvm_shell(nvm_dir, &command)?
        }
        NodeManager::None => unreachable!(),
    };

    Ok(ActionResult {
        success: true,
        message: if output.is_empty() {
            format!("Switched to Node {version_arg}.")
        } else {
            output
        },
    })
}

#[tauri::command]
fn manage_tool(tool_id: String, action: String) -> Result<ActionResult, String> {
    if !package_manager_exists("npm") {
        return Err("npm is required to manage tools.".into());
    }

    let result = match (tool_id.as_str(), action.as_str()) {
        ("npm", "update") => run_command("npm", &["install", "-g", "npm@latest"], None),
        ("pnpm", "install") => run_command("npm", &["install", "-g", "pnpm"], None),
        ("pnpm", "update") => run_command("npm", &["install", "-g", "pnpm@latest"], None),
        ("pnpm", "uninstall") => run_command("npm", &["uninstall", "-g", "pnpm"], None),
        ("yarn", "install") => run_command("npm", &["install", "-g", "yarn"], None),
        ("yarn", "update") => run_command("npm", &["install", "-g", "yarn@latest"], None),
        ("yarn", "uninstall") => run_command("npm", &["uninstall", "-g", "yarn"], None),
        _ => return Err("This tool/action is not supported by one-click management.".into()),
    }?;

    Ok(ActionResult {
        success: true,
        message: if result.is_empty() {
            "Action completed.".into()
        } else {
            result
        },
    })
}

#[tauri::command]
fn fix_issue(issue_id: String, value: Option<String>) -> Result<ActionResult, String> {
    let message = match issue_id.as_str() {
        "yarn" => run_command("npm", &["install", "-g", "yarn"], None)?,
        "pnpm" => run_command("npm", &["install", "-g", "pnpm"], None)?,
        "git-config-name" => {
            let name = value.unwrap_or_default();
            if name.trim().is_empty() {
                return Err("Git user.name cannot be empty.".into());
            }
            run_command("git", &["config", "--global", "user.name", name.trim()], None)?
        }
        "git-config-email" => {
            let email = value.unwrap_or_default();
            if email.trim().is_empty() {
                return Err("Git user.email cannot be empty.".into());
            }
            run_command("git", &["config", "--global", "user.email", email.trim()], None)?
        }
        _ => return Err("This issue is not fixable automatically.".into()),
    };

    Ok(ActionResult {
        success: true,
        message: if message.is_empty() {
            "Fixed.".into()
        } else {
            message
        },
    })
}

#[tauri::command]
fn default_project_base() -> String {
    let base = home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("Projects");
    base.to_string_lossy().to_string()
}

#[tauri::command]
fn create_project(payload: CreateProjectPayload) -> Result<CreateProjectResult, String> {
    let project_name = payload.project_name.trim();
    if project_name.is_empty() {
        return Err("Project name is required.".into());
    }
    if !project_name
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_')
    {
        return Err("Project name can only contain letters, numbers, '-' or '_'.".into());
    }
    let _selected_node = payload.selected_node.as_deref();

    let base = payload
        .base_path
        .as_deref()
        .map(expand_home_path)
        .unwrap_or_else(|| PathBuf::from(default_project_base()));
    fs::create_dir_all(&base).map_err(|err| format!("failed to create base path: {err}"))?;

    let project_path = base.join(project_name);
    if project_path.exists() {
        return Err(format!(
            "Target path already exists: {}",
            project_path.to_string_lossy()
        ));
    }

    let template = payload.template.as_str();
    let package_manager = payload.package_manager.as_str();

    match template {
        "react-ts" | "vue-ts" => {
            let vite_template = if template == "react-ts" {
                "react-ts"
            } else {
                "vue-ts"
            };
            match package_manager {
                "npm" => {
                    let args = vec![
                        "create".to_string(),
                        "vite@latest".to_string(),
                        project_name.to_string(),
                        "--".to_string(),
                        "--template".to_string(),
                        vite_template.to_string(),
                    ];
                    run_command_owned("npm", &args, Some(&base))?;
                }
                "pnpm" => {
                    let args = vec![
                        "create".to_string(),
                        "vite".to_string(),
                        project_name.to_string(),
                        "--template".to_string(),
                        vite_template.to_string(),
                    ];
                    run_command_owned("pnpm", &args, Some(&base))?;
                }
                "yarn" => {
                    let args = vec![
                        "create".to_string(),
                        "vite".to_string(),
                        project_name.to_string(),
                        "--template".to_string(),
                        vite_template.to_string(),
                    ];
                    run_command_owned("yarn", &args, Some(&base))?;
                }
                _ => return Err("Unsupported package manager.".into()),
            }

            install_dependencies(package_manager, &project_path)?;
            if payload.init_git {
                run_command("git", &["init"], Some(&project_path))?;
            }
        }
        "next" => {
            let mut args = vec![
                "create-next-app@latest".to_string(),
                project_name.to_string(),
                "--ts".to_string(),
                "--eslint".to_string(),
                "--src-dir".to_string(),
                "--app".to_string(),
                "--import-alias".to_string(),
                "@/*".to_string(),
                "--yes".to_string(),
            ];
            match package_manager {
                "npm" => args.push("--use-npm".to_string()),
                "pnpm" => args.push("--use-pnpm".to_string()),
                "yarn" => args.push("--use-yarn".to_string()),
                _ => return Err("Unsupported package manager.".into()),
            }
            if !payload.init_git {
                args.push("--disable-git".to_string());
            }
            run_command_owned("npx", &args, Some(&base))?;
        }
        "node-ts" => {
            create_node_ts_project(&project_path, package_manager)?;
            if payload.init_git {
                run_command("git", &["init"], Some(&project_path))?;
            }
        }
        _ => return Err("Unsupported template.".into()),
    }

    Ok(CreateProjectResult {
        success: true,
        path: project_path.to_string_lossy().to_string(),
        message: "Project created successfully.".into(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            scan_environment,
            get_system_info,
            list_tools,
            get_node_runtime_info,
            install_node_version,
            switch_node_version,
            manage_tool,
            fix_issue,
            default_project_base,
            create_project
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
