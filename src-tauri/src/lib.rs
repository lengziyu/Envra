use serde::{Deserialize, Serialize};
use std::{
    env, fs,
    path::{Path, PathBuf},
    process::Command,
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
    let mut command = Command::new(resolve_program(program));
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

fn run_command(program: &str, args: &[&str], cwd: Option<&Path>) -> Result<String, String> {
    let mut command = prepare_command(program, cwd);
    command.args(args);

    let output = command
        .output()
        .map_err(|err| format!("failed to execute {program}: {err}"))?;

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
    let mut command = prepare_command(program, cwd);
    command.args(args);

    let output = command
        .output()
        .map_err(|err| format!("failed to execute {program}: {err}"))?;

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

fn package_manager_exists(name: &str) -> bool {
    run_command(name, &["--version"], None).is_ok()
}

fn build_diagnostics() -> Vec<DiagnosticItem> {
    let node_version = non_empty(run_command("node", &["--version"], None));
    let npm_version = non_empty(run_command("npm", &["--version"], None));
    let pnpm_version = non_empty(run_command("pnpm", &["--version"], None));
    let yarn_version = non_empty(run_command("yarn", &["--version"], None));
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
            manage_tool,
            fix_issue,
            default_project_base,
            create_project
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
