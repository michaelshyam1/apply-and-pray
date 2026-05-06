use std::fs;
use std::net::TcpStream;
use std::path::PathBuf;
#[allow(unused_imports)]
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

// ── State ────────────────────────────────────────────────────────────────────

struct NextServer(Mutex<Option<Child>>);

// ── Helpers ──────────────────────────────────────────────────────────────────

fn port_open(port: u16) -> bool {
    TcpStream::connect_timeout(
        &format!("127.0.0.1:{}", port).parse().unwrap(),
        Duration::from_millis(200),
    )
    .is_ok()
}

#[allow(dead_code)]
fn await_port(port: u16, timeout_secs: u64) -> bool {
    let deadline = Instant::now() + Duration::from_secs(timeout_secs);
    while Instant::now() < deadline {
        if port_open(port) {
            return true;
        }
        std::thread::sleep(Duration::from_millis(300));
    }
    false
}

/// Walk upward from the executable to find the project root.
/// Recognises the root by the presence of both `package.json` and `.next/`.
///
/// In a normal dev/release layout the exe lives at:
///   <project>/src-tauri/target/{debug|release}/apply-and-pray.exe
/// so we travel up at most 8 levels.  As a fallback we also check cwd.
#[allow(dead_code)]
fn find_project_root() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let mut dir: &std::path::Path = exe.parent()?;

    for _ in 0..8 {
        if dir.join("package.json").exists() && dir.join(".next").exists() {
            return Some(dir.to_path_buf());
        }
        dir = dir.parent()?;
    }

    // Fallback: current working directory
    let cwd = std::env::current_dir().ok()?;
    if cwd.join("package.json").exists() {
        return Some(cwd);
    }

    None
}

/// Load environment variables from .env.local file.
/// Returns a map of KEY=VALUE pairs to be passed to child processes.
fn load_env_local(project_root: &PathBuf) -> std::collections::HashMap<String, String> {
    let mut env_vars = std::collections::HashMap::new();
    let env_file = project_root.join(".env.local");
    
    if let Ok(content) = fs::read_to_string(&env_file) {
        for line in content.lines() {
            let line = line.trim();
            // Skip comments and empty lines
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            // Parse KEY=VALUE
            if let Some(eq_pos) = line.find('=') {
                let key = line[..eq_pos].trim().to_string();
                let mut value = line[eq_pos + 1..].trim().to_string();
                // Strip surrounding quotes if present
                if (value.starts_with('"') && value.ends_with('"'))
                    || (value.starts_with('\'') && value.ends_with('\''))
                {
                    value = value[1..value.len() - 1].to_string();
                }
                env_vars.insert(key, value);
            }
        }
    }
    env_vars
}

// ── Tauri commands ────────────────────────────────────────────────────────────

/// Called from JS to check whether Ollama is reachable.
#[tauri::command]
fn ollama_running() -> bool {
    port_open(11434)
}

// ── App entry point ───────────────────────────────────────────────────────────

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(NextServer(Mutex::new(None)))
        .setup(|app| {
            let handle = app.handle().clone();

            // ── Production only: start the Next.js standalone server ──────────
            // In dev, `beforeDevCommand` already started `npm run dev`.
            #[cfg(not(debug_assertions))]
            {
                match find_project_root() {
                    None => {
                        let _ = handle
                            .dialog()
                            .message(
                                "Could not locate the project directory.\n\n\
                                 Run the app from the project folder, or make sure \
                                 `npm run build` has been executed.",
                            )
                            .kind(MessageDialogKind::Error)
                            .title("Project Not Found")
                            .blocking_show();
                    }
                    Some(root) => {
                        let server_js = root.join(".next").join("standalone").join("server.js");
                        let server_cwd = root.join(".next").join("standalone");

                        if !server_js.exists() {
                            let _ = handle
                                .dialog()
                                .message(
                                    "server.js not found. Run `npm run build` first.\n\n\
                                     Expected:\n  .next/standalone/server.js",
                                )
                                .kind(MessageDialogKind::Error)
                                .title("Build Missing")
                                .blocking_show();
                        } else {
                            // Load .env.local and spawn: node .next/standalone/server.js
                            let env_vars = load_env_local(&root);
                            match Command::new("node")
                                .arg(&server_js)
                                .current_dir(&server_cwd)
                                .env("PORT", "3000")
                                .env("HOSTNAME", "127.0.0.1")
                                .envs(env_vars)
                                .spawn()
                            {
                                Err(e) => {
                                    let _ = handle
                                        .dialog()
                                        .message(&format!(
                                            "Could not start the Next.js server.\n\n\
                                             Make sure Node.js is installed and in PATH.\n\n\
                                             Error: {e}"
                                        ))
                                        .kind(MessageDialogKind::Error)
                                        .title("Startup Error")
                                        .blocking_show();
                                }
                                Ok(child) => {
                                    *app.state::<NextServer>().0.lock().unwrap() = Some(child);
                                    eprintln!("[app] Next.js server spawned, waiting for port 3000…");
                                    if !await_port(3000, 30) {
                                        let _ = handle
                                            .dialog()
                                            .message(
                                                "The Next.js server did not respond within 30 s.\n\n\
                                                 Check that Node.js is working and try again.",
                                            )
                                            .kind(MessageDialogKind::Error)
                                            .title("Server Timeout")
                                            .blocking_show();
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // ── Main window ───────────────────────────────────────────────────
            // Always points to localhost:3000 — dev server or spawned server.
            WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External("http://localhost:3000".parse().unwrap()),
            )
            .title("Apply & Pray")
            .inner_size(1280.0, 800.0)
            .min_inner_size(900.0, 600.0)
            .resizable(true)
            .build()?;

            // ── Ollama check ──────────────────────────────────────────────────
            // Non-blocking: show a native warning dialog if Ollama is not running.
            if !port_open(11434) {
                let h = handle.clone();
                std::thread::spawn(move || {
                    // Small delay so the window opens before the dialog appears.
                    std::thread::sleep(Duration::from_millis(900));
                    let _ = h
                        .dialog()
                        .message(
                            "Ollama is not running.\n\n\
                             AI extraction (URL + screenshot) won't work until you start it:\n\n\
                             \x20\x20ollama serve\n\n\
                             Your dashboard and Google Sheets sync still work normally.",
                        )
                        .kind(MessageDialogKind::Warning)
                        .title("Ollama Not Detected")
                        .blocking_show();
                });
            }

            Ok(())
        })
        // ── Cleanup ───────────────────────────────────────────────────────────
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Ok(mut lock) = window.state::<NextServer>().0.lock() {
                    if let Some(mut child) = lock.take() {
                        let _ = child.kill();
                        let _ = child.wait(); // reap zombie
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![ollama_running])
        .run(tauri::generate_context!())
        .expect("Tauri application error");
}
