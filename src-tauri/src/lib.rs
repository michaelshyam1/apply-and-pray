use std::fs;
use std::net::TcpStream;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

// ── State ─────────────────────────────────────────────────────────────────────

struct NextServer(Mutex<Option<Child>>);

// ── Port helpers ──────────────────────────────────────────────────────────────

fn port_open(port: u16) -> bool {
    TcpStream::connect_timeout(
        &format!("127.0.0.1:{}", port).parse().unwrap(),
        Duration::from_millis(200),
    )
    .is_ok()
}

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

/// Kill any process already listening on `port` so our server can bind cleanly.
/// Uses `netstat -aon` to find the PID then `taskkill /F /PID`.
fn kill_port(port: u16) {
    if !port_open(port) {
        return; // nothing to kill
    }
    eprintln!("[app] port {port} is occupied — finding and killing the owner...");

    let output = Command::new("cmd")
        .args(["/C", "netstat", "-aon"])
        .output();

    let out = match output {
        Ok(o) => o,
        Err(e) => {
            eprintln!("[app] netstat failed: {e}");
            return;
        }
    };

    let text = String::from_utf8_lossy(&out.stdout);
    for line in text.lines() {
        // Lines look like:  TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    4567
        if line.contains(&format!(":{port}")) && line.to_ascii_uppercase().contains("LISTENING") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if let Some(pid_str) = parts.last() {
                if let Ok(pid) = pid_str.parse::<u32>() {
                    if pid > 4 {
                        eprintln!("[app] killing PID {pid} (was using port {port})");
                        let _ = Command::new("taskkill")
                            .args(["/F", "/PID", &pid.to_string()])
                            .output();
                    }
                }
            }
        }
    }

    // Wait for the port to be released
    std::thread::sleep(Duration::from_millis(600));
    eprintln!("[app] port {port} is now free: {}", !port_open(port));
}

// ── Project root discovery ────────────────────────────────────────────────────

/// Walk upward from the exe to find the directory that contains both
/// `package.json` and `.next/standalone/server.js`.
/// Logs every candidate path so crashes are diagnosable.
fn find_project_root() -> Option<PathBuf> {
    let exe = match std::env::current_exe() {
        Ok(p) => p,
        Err(e) => {
            eprintln!("[app] ERROR: could not get exe path: {e}");
            return None;
        }
    };
    eprintln!("[app] exe path: {:?}", exe);

    let mut dir = match exe.parent() {
        Some(p) => p.to_path_buf(),
        None => return None,
    };

    for depth in 0..8 {
        eprintln!("[app] checking depth {depth}: {:?}", dir);
        let has_pkg  = dir.join("package.json").exists();
        let has_next = dir.join(".next").exists();
        let has_srv  = dir.join(".next").join("standalone").join("server.js").exists();
        eprintln!("[app]   package.json={has_pkg}  .next/={has_next}  standalone/server.js={has_srv}");

        if has_pkg && has_srv {
            eprintln!("[app] found project root at: {:?}", dir);
            return Some(dir);
        }

        match dir.parent() {
            Some(p) => dir = p.to_path_buf(),
            None => break,
        }
    }

    // Fallback: current working directory — only accept if server.js is present
    let cwd = std::env::current_dir().unwrap_or_default();
    eprintln!("[app] cwd fallback: {:?}", cwd);
    if cwd.join(".next").join("standalone").join("server.js").exists() {
        eprintln!("[app] using cwd as project root");
        return Some(cwd);
    }

    eprintln!("[app] ERROR: project root not found");
    None
}

// ── .env.local loader ─────────────────────────────────────────────────────────

fn load_env_local(project_root: &PathBuf) -> std::collections::HashMap<String, String> {
    let mut env_vars = std::collections::HashMap::new();
    let env_file = project_root.join(".env.local");

    eprintln!("[app] loading env from: {:?} (exists={})", env_file, env_file.exists());

    if let Ok(content) = fs::read_to_string(&env_file) {
        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if let Some(eq) = line.find('=') {
                let key = line[..eq].trim().to_string();
                let mut value = line[eq + 1..].trim().to_string();
                if (value.starts_with('"') && value.ends_with('"'))
                    || (value.starts_with('\'') && value.ends_with('\''))
                {
                    value = value[1..value.len() - 1].to_string();
                }
                env_vars.insert(key, value);
            }
        }
    }
    eprintln!("[app] loaded {} env var(s)", env_vars.len());
    env_vars
}

// ── Fatal error helper ────────────────────────────────────────────────────────

/// Show a blocking error dialog then exit the process.
/// Used in production startup failures — ensures the window is never opened
/// when the server could not be started.
fn bail(handle: &AppHandle, title: &str, msg: &str) -> ! {
    eprintln!("[app] FATAL: {title} — {msg}");
    let _ = handle
        .dialog()
        .message(msg)
        .kind(MessageDialogKind::Error)
        .title(title)
        .blocking_show();
    std::process::exit(1);
}

// ── Tauri commands ────────────────────────────────────────────────────────────

#[tauri::command]
fn ollama_running() -> bool {
    port_open(11434)
}

#[tauri::command]
fn open_in_browser(url: String) -> Result<(), String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Not a valid http/https URL".to_string());
    }
    std::process::Command::new("cmd")
        .args(["/C", "start", "", &url])
        .spawn()
        .map_err(|e| format!("Failed to open URL: {e}"))?;
    Ok(())
}

// ── App entry point ───────────────────────────────────────────────────────────

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(NextServer(Mutex::new(None)))
        .setup(|app| {
            let handle = app.handle().clone();

            // ── Production: start the Next.js standalone server ───────────────
            // In dev mode, beforeDevCommand already started npm run dev.
            #[cfg(not(debug_assertions))]
            {
                eprintln!("[app] production startup — locating project root...");

                let root = match find_project_root() {
                    Some(r) => r,
                    None => bail(
                        &handle,
                        "Project Not Found",
                        "Could not locate the project directory.\n\n\
                         The app must remain inside the project folder.\n\n\
                         Make sure you cloned the repo and ran:\n  npm run tauri:build",
                    ),
                };

                let server_js  = root.join(".next").join("standalone").join("server.js");
                let server_cwd = root.join(".next").join("standalone");

                eprintln!("[app] server.js  : {:?}", server_js);
                eprintln!("[app] server.js exists: {}", server_js.exists());
                eprintln!("[app] server cwd : {:?}", server_cwd);

                if !server_js.exists() {
                    bail(
                        &handle,
                        "Build Missing",
                        "The Next.js build was not found.\n\n\
                         Run this command in the project folder and try again:\n\n\
                         \x20\x20npm run tauri:build\n\n\
                         Expected file:\n  .next/standalone/server.js",
                    );
                }

                // Kill anything already on port 3000 so our server can bind cleanly.
                // This handles the case where another dev server (e.g. from a different
                // project open in VS Code) is squatting on the port.
                kill_port(3000);

                let env_vars = load_env_local(&root);

                eprintln!("[app] spawning: node {:?}", server_js);
                eprintln!("[app]       cwd: {:?}", server_cwd);

                match Command::new("node")
                    .arg(&server_js)
                    .current_dir(&server_cwd)
                    .env("PORT", "3000")
                    .env("HOSTNAME", "127.0.0.1")
                    .envs(env_vars)
                    .spawn()
                {
                    Err(e) => bail(
                        &handle,
                        "Startup Error",
                        &format!(
                            "Could not start the Next.js server.\n\n\
                             Make sure Node.js is installed and in your PATH.\n\n\
                             Error: {e}"
                        ),
                    ),
                    Ok(child) => {
                        *app.state::<NextServer>().0.lock().unwrap() = Some(child);
                        eprintln!("[app] Next.js server spawned — waiting for port 3000...");

                        let ready = await_port(3000, 30);
                        eprintln!("[app] port 3000 ready: {ready}");

                        if !ready {
                            bail(
                                &handle,
                                "Server Timeout",
                                "The Next.js server did not respond within 30 seconds.\n\n\
                                 Make sure Node.js is working correctly and try again.",
                            );
                        }
                    }
                }
            }

            // ── Open the main window ──────────────────────────────────────────
            // Only reached in dev mode, OR after the production server confirmed ready.
            eprintln!("[app] opening WebView at http://localhost:3000");
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

            // ── Ollama check (non-blocking) ───────────────────────────────────
            if !port_open(11434) {
                let h = handle.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(Duration::from_millis(900));
                    let _ = h
                        .dialog()
                        .message(
                            "Ollama is not running.\n\n\
                             AI extraction won't work until you start it:\n\n\
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
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Ok(mut lock) = window.state::<NextServer>().0.lock() {
                    if let Some(mut child) = lock.take() {
                        eprintln!("[app] killing Next.js server process");
                        let _ = child.kill();
                        let _ = child.wait();
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![ollama_running, open_in_browser])
        .run(tauri::generate_context!())
        .expect("Tauri application error");
}
