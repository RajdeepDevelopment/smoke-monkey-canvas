use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use tauri::{Emitter, Manager, State, WindowEvent};

// ── Backend Handle & Port Configuration ─────────────────────────────────

struct BackendHandle(Mutex<Vec<Child>>);

// Default Canvas server port (matches server/app.server.ts)
const DEFAULT_CANVAS_PORT: u16 = 3333;

fn get_canvas_port() -> u16 {
    std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse::<u16>().ok())
        .unwrap_or(DEFAULT_CANVAS_PORT)
}

fn connect_api() -> Result<TcpStream, String> {
    let port = get_canvas_port();
    let addrs = [
        std::net::SocketAddr::from(([127, 0, 0, 1], port)),
        std::net::SocketAddr::from(([0, 0, 0, 0, 0, 0, 0, 1], port)), // [::1]
    ];
    let mut last_err = String::from("no addresses tried");
    for addr in &addrs {
        match TcpStream::connect_timeout(addr, Duration::from_millis(1000)) {
            Ok(stream) => return Ok(stream),
            Err(e) => last_err = format!("{}: {}", addr, e),
        }
    }
    Err(format!("Connection failed: {}", last_err))
}

#[derive(serde::Deserialize)]
pub struct ProxyRequest {
    pub url: String,
    pub method: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
}

#[derive(serde::Serialize)]
pub struct ProxyResponse {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body: String,
}

// ── Non-blocking HTTP Proxy ─────────────────────────────────────────────

#[tauri::command]
async fn proxy_fetch(req: ProxyRequest) -> Result<ProxyResponse, String> {
    let port = get_canvas_port();
    let path = req.url.trim_start_matches('/').to_string();
    let method = req.method.to_uppercase();
    let body_bytes = req.body.unwrap_or_default();

    let mut header_str = String::new();
    for (k, v) in &req.headers {
        header_str.push_str(&format!("{}: {}\r\n", k, v));
    }

    // The actual HTTP round-trip is blocking I/O (connect + read the full body).
    // Running it on a worker thread keeps the main thread — and the webview/UI —
    // fully responsive, preventing UI freezes during high network or agent loads.
    let join = tauri::async_runtime::spawn_blocking(move || -> Result<ProxyResponse, String> {
        let mut stream = connect_api()?;
        stream
            .set_read_timeout(Some(Duration::from_secs(30)))
            .ok();

        let raw = format!(
            "{} /{} HTTP/1.1\r\nHost: localhost:{port}\r\n{}Content-Length: {}\r\nConnection: close\r\n\r\n{}",
            method, path, header_str, body_bytes.len(), body_bytes
        );

        stream
            .write_all(raw.as_bytes())
            .map_err(|e| format!("Write failed: {}", e))?;

        let mut resp = Vec::new();
        stream
            .read_to_end(&mut resp)
            .map_err(|e| format!("Read failed: {}", e))?;

        let resp_str = String::from_utf8_lossy(&resp);
        let (status, resp_headers, body) = parse_http_response(&resp_str);

        Ok(ProxyResponse {
            status,
            headers: resp_headers,
            body,
        })
    })
    .await
    .map_err(|e| format!("Proxy fetch task failed: {}", e))??;

    Ok(join)
}

fn parse_http_response(raw: &str) -> (u16, HashMap<String, String>, String) {
    let header_end = raw.find("\r\n\r\n").unwrap_or(raw.len());
    let head = &raw[..header_end];
    let body = raw[header_end..].trim_start_matches("\r\n\r\n").to_string();

    let status = head
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .and_then(|s| s.parse().ok())
        .unwrap_or(500);

    let mut headers = HashMap::new();
    for line in head.lines().skip(1) {
        if let Some((k, v)) = line.split_once(':') {
            headers.insert(k.trim().to_string(), v.trim().to_string());
        }
    }

    (status, headers, body)
}

// ── Non-blocking Streaming Proxy ────────────────────────────────────────

#[derive(serde::Serialize, Clone)]
struct StreamChunk {
    stream_id: String,
    data: String,
}

#[derive(serde::Serialize, Clone)]
struct StreamDone {
    stream_id: String,
}

#[derive(serde::Serialize, Clone)]
struct StreamError {
    stream_id: String,
    message: String,
}

#[tauri::command]
async fn proxy_fetch_streaming(
    app: tauri::AppHandle,
    req: ProxyRequest,
    stream_id: String,
) -> Result<ProxyResponse, String> {
    let port = get_canvas_port();
    let path = req.url.trim_start_matches('/').to_string();
    let method = req.method.to_uppercase();
    let body_owned = req.body.clone().unwrap_or_default();
    let body_len = body_owned.len();

    // Phase 1 — Connect, send request, read up to end of headers.
    // Runs on a blocking worker thread; async command awaits it, keeping the
    // main thread and webview event loop completely responsive.
    let mut header_build = format!(
        "{} /{} HTTP/1.1\r\nHost: localhost:{port}\r\n",
        method, path
    );
    for (k, v) in &req.headers {
        header_build.push_str(&format!("{}: {}\r\n", k, v));
    }
    header_build.push_str(&format!(
        "Content-Length: {}\r\nConnection: close\r\n\r\n",
        body_len
    ));

    let join = tauri::async_runtime::spawn_blocking(
        move || -> Result<(TcpStream, Vec<u8>, usize), String> {
            let mut stream = connect_api()?;
            stream.set_read_timeout(Some(Duration::from_secs(120))).ok();
            let mut wire = header_build;
            wire.push_str(&body_owned);
            stream
                .write_all(wire.as_bytes())
                .map_err(|e| format!("Write failed: {}", e))?;

            let mut resp_buf = Vec::new();
            let mut tmp = [0u8; 4096];
            let header_end_pos;
            loop {
                let n = stream
                    .read(&mut tmp)
                    .map_err(|e| format!("Read failed: {}", e))?;
                if n == 0 {
                    header_end_pos = resp_buf.len();
                    break;
                }
                resp_buf.extend_from_slice(&tmp[..n]);
                if let Some(pos) = resp_buf.windows(4).position(|w| w == b"\r\n\r\n") {
                    header_end_pos = pos + 4;
                    break;
                }
            }
            Ok((stream, resp_buf, header_end_pos))
        },
    )
    .await
    .map_err(|e| format!("Streaming task failed: {}", e))?;

    let (mut stream, resp_buf, header_end_pos) = join?;

    let header_str = String::from_utf8_lossy(&resp_buf[..header_end_pos]).to_string();
    let (status, resp_headers, _) = parse_http_response(&header_str);

    let _ = app.emit(
        "proxy-headers",
        StreamChunk {
            stream_id: stream_id.clone(),
            data: header_str,
        },
    );

    if resp_buf.len() > header_end_pos {
        let initial_body = String::from_utf8_lossy(&resp_buf[header_end_pos..]).to_string();
        if !initial_body.is_empty() {
            let _ = app.emit(
                "proxy-data",
                StreamChunk {
                    stream_id: stream_id.clone(),
                    data: initial_body,
                },
            );
        }
    }

    // Phase 2 — Pump the remaining body from a DETACHED blocking thread so
    // this command returns right away without pinning the main thread.
    let pump_app = app.clone();
    let pump_sid = stream_id.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut tmp = [0u8; 4096];
        let started = Instant::now();
        let mut consecutive_idle = 0u32;
        loop {
            // Hard lifetime cap so abandoned streams cannot linger forever
            if started.elapsed() > Duration::from_secs(30 * 60) {
                break;
            }
            match stream.read(&mut tmp) {
                Ok(0) => break,
                Ok(n) => {
                    consecutive_idle = 0;
                    let chunk = String::from_utf8_lossy(&tmp[..n]).to_string();
                    let _ = pump_app.emit(
                        "proxy-data",
                        StreamChunk {
                            stream_id: pump_sid.clone(),
                            data: chunk,
                        },
                    );
                }
                // SSE / Agent streams idle silently between reasoning deltas and
                // tool executions. A socket timeout is NOT the end of stream; keep
                // waiting instead of closing mid-run.
                Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => {
                    consecutive_idle += 1;
                    if consecutive_idle >= 10 {
                        break;
                    }
                }
                Err(e) => {
                    let _ = pump_app.emit(
                        "proxy-error",
                        StreamError {
                            stream_id: pump_sid.clone(),
                            message: e.to_string(),
                        },
                    );
                    break;
                }
            }
        }
        let _ = pump_app.emit(
            "proxy-done",
            StreamDone {
                stream_id: pump_sid,
            },
        );
    });

    Ok(ProxyResponse {
        status,
        headers: resp_headers,
        body: String::new(),
    })
}

// ── Process metadata & Environment Snapshot ─────────────────────────────

#[derive(Debug, Clone, serde::Serialize)]
pub struct ProcessInfo {
    pub id: String,
    pub pid: u32,
    pub command: String,
    pub cwd: String,
    pub started_at: u64,
    pub status: String,
    pub exit_code: Option<i32>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct EnvSnapshot {
    pub os: String,
    pub arch: String,
    pub shell: String,
    pub node: Option<String>,
    pub npm: Option<String>,
    pub pnpm: Option<String>,
    pub yarn: Option<String>,
    pub python: Option<String>,
    pub git: Option<String>,
    pub docker: Option<String>,
    pub docker_compose: Option<String>,
    pub rust: Option<String>,
    pub cargo: Option<String>,
    pub java: Option<String>,
    pub go: Option<String>,
    pub cwd: String,
    pub home: String,
    pub username: String,
    pub hostname: String,
}

// ── Permission & Risk Classification ────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
pub enum RiskLevel {
    Safe,
    Medium,
    Dangerous,
}

pub fn classify_command(cmd: &str) -> RiskLevel {
    let trimmed = cmd.trim();
    let lower = trimmed.to_lowercase();

    let dangerous_patterns = [
        "rm -rf", "rm -fr", "sudo rm", "chmod -r", "chown -r", "mkfs", "dd if=",
        "git reset --hard", "git push --force", "git push -f", "docker system prune",
        "docker container prune", "docker image prune", ":(){ :|:& };:",
        "> /dev/sda", "mv /*", "rm -r /", "rm -rf /",
    ];
    for p in &dangerous_patterns {
        if lower.contains(p) {
            return RiskLevel::Dangerous;
        }
    }

    if lower.starts_with("sudo ") {
        return RiskLevel::Dangerous;
    }

    let medium_patterns = [
        "npm install", "pnpm install", "yarn install", "git checkout",
        "git reset", "git merge", "git rebase", "docker build",
        "docker compose", "docker run", "git commit", "git push",
        "git pull", "git branch -d", "git branch -D",
    ];
    for p in &medium_patterns {
        if lower.contains(p) {
            return RiskLevel::Medium;
        }
    }

    RiskLevel::Safe
}

#[tauri::command]
fn classify_risk(command: String) -> Result<String, String> {
    let level = classify_command(&command);
    Ok(serde_json::to_string(&level).unwrap_or_default())
}

// ── PTY Terminal Manager ─────────────────────────────────────────────────

struct PtySession {
    id: String,
    pid: u32,
    command: String,
    cwd: String,
    started_at: Instant,
    writer: Mutex<Option<Box<dyn Write + Send>>>,
    child: Mutex<Option<Box<dyn portable_pty::Child + Send + Sync>>>,
    master: Mutex<Option<Box<dyn portable_pty::MasterPty + Send>>>,
    status: Mutex<String>,
    exit_code: Mutex<Option<i32>>,
}

pub struct TerminalManager {
    sessions: Mutex<HashMap<String, Arc<PtySession>>>,
    counter: std::sync::atomic::AtomicU64,
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
            counter: std::sync::atomic::AtomicU64::new(0),
        }
    }

    fn next_id(&self) -> String {
        let id = self.counter.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        format!("term_{}", id)
    }
}

#[tauri::command]
fn pty_spawn(
    window: tauri::Window,
    state: State<'_, TerminalManager>,
    cwd: Option<String>,
    shell: Option<String>,
    rows: Option<u16>,
    cols: Option<u16>,
) -> Result<String, String> {
    let shell_path = shell.unwrap_or_else(|| {
        if cfg!(target_os = "windows") {
            "powershell.exe".to_string()
        } else {
            let home = std::env::var("HOME").unwrap_or_default();
            if std::path::Path::new(&format!("{}/.zshrc", home)).exists() {
                "/bin/zsh".to_string()
            } else {
                "/bin/bash".to_string()
            }
        }
    });

    let working_dir = cwd.unwrap_or_else(|| {
        std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| ".".to_string())
    });

    let pty_system = NativePtySystem::default();
    let pair = pty_system
        .openpty(PtySize {
            rows: rows.unwrap_or(24),
            cols: cols.unwrap_or(80),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    let mut cmd_builder = CommandBuilder::new(&shell_path);
    if !cfg!(target_os = "windows") {
        cmd_builder.arg("--login");
    }
    cmd_builder.cwd(&working_dir);

    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_default();
    let user_path = augmented_path();
    cmd_builder.env("TERM", "xterm-256color");
    cmd_builder.env("COLORTERM", "truecolor");
    cmd_builder.env("HOME", &home);
    cmd_builder.env("PATH", &user_path);
    cmd_builder.env("SHELL", &shell_path);

    let child = pair
        .slave
        .spawn_command(cmd_builder)
        .map_err(|e| format!("Failed to spawn in PTY: {}", e))?;

    let pid = child.process_id().unwrap_or(0);
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to get PTY writer: {}", e))?;
    let reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone PTY reader: {}", e))?;

    let session_id = state.next_id();
    let session = Arc::new(PtySession {
        id: session_id.clone(),
        pid,
        command: shell_path.clone(),
        cwd: working_dir.clone(),
        started_at: Instant::now(),
        writer: Mutex::new(Some(writer)),
        child: Mutex::new(Some(child)),
        master: Mutex::new(Some(pair.master)),
        status: Mutex::new("running".to_string()),
        exit_code: Mutex::new(None),
    });

    state
        .sessions
        .lock()
        .map_err(|e| e.to_string())?
        .insert(session_id.clone(), session.clone());

    // Reader thread — PTY stdout -> Tauri events
    let win = window.clone();
    let id = session_id.clone();
    thread::spawn(move || {
        let mut reader = reader;
        let mut buf = [0u8; 16384];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = win.emit(
                        "pty-output",
                        serde_json::json!({
                            "id": id,
                            "data": data,
                        }),
                    );
                }
                Err(_) => break,
            }
        }
        let _ = win.emit(
            "pty-exit",
            serde_json::json!({
                "id": id,
            }),
        );
    });

    // Process exit detector — take ownership of the child out of the session
    // so we never hold the session lock while blocking in wait()
    let win2 = window.clone();
    let id2 = session_id.clone();
    let session_for_exit = session.clone();
    let mut child_to_wait = {
        let mut guard = session_for_exit.child.lock().map_err(|e| e.to_string())?;
        guard.take()
    };
    thread::spawn(move || {
        let exit_status = child_to_wait.as_mut().and_then(|child| child.wait().ok());

        let ec = exit_status.as_ref().map(|s| s.exit_code() as i32);
        let status_str = match ec {
            Some(0) => "completed".to_string(),
            Some(_) => "failed".to_string(),
            None => "killed".to_string(),
        };

        *session_for_exit.status.lock().unwrap() = status_str;
        *session_for_exit.exit_code.lock().unwrap() = ec;

        // Close the master PTY now that the child is gone
        session_for_exit.master.lock().ok().and_then(|mut m| m.take());

        let _ = win2.emit(
            "pty-process-exit",
            serde_json::json!({
                "id": id2,
                "exitCode": ec,
            }),
        );
    });

    Ok(session_id)
}

#[tauri::command]
fn pty_write(
    state: State<'_, TerminalManager>,
    id: String,
    data: String,
) -> Result<(), String> {
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    let session = sessions.get(&id).ok_or("Session not found")?;
    let mut writer_guard = session.writer.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut writer) = *writer_guard {
        writer
            .write_all(data.as_bytes())
            .map_err(|e| e.to_string())?;
        writer.flush().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn pty_resize(
    state: State<'_, TerminalManager>,
    id: String,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    let session = sessions.get(&id).ok_or("Session not found")?;
    let master_guard = session.master.lock().map_err(|e| e.to_string())?;
    if let Some(master) = master_guard.as_ref() {
        master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to resize PTY: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
fn pty_kill(
    state: State<'_, TerminalManager>,
    id: String,
) -> Result<(), String> {
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    if let Some(session) = sessions.get(&id) {
        #[cfg(unix)]
        {
            use nix::sys::signal::{kill, Signal};
            use nix::unistd::Pid;
            let pid = session.pid as i32;
            let _ = kill(Pid::from_raw(pid), Signal::SIGTERM);
            thread::sleep(Duration::from_millis(100));
            let _ = kill(Pid::from_raw(pid), Signal::SIGKILL);
        }

        #[cfg(windows)]
        {
            let mut child_guard = session.child.lock().map_err(|e| e.to_string())?;
            if let Some(ref mut child) = *child_guard {
                let _ = child.kill();
            }
        }

        {
            let mut writer_guard = session.writer.lock().map_err(|e| e.to_string())?;
            *writer_guard = None;
        }

        *session.status.lock().map_err(|e| e.to_string())? = "killed".to_string();
    }
    Ok(())
}

#[tauri::command]
fn pty_list(
    state: State<'_, TerminalManager>,
) -> Result<Vec<ProcessInfo>, String> {
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    Ok(sessions
        .values()
        .map(|s| ProcessInfo {
            id: s.id.clone(),
            pid: s.pid,
            command: s.command.clone(),
            cwd: s.cwd.clone(),
            started_at: s.started_at.elapsed().as_secs(),
            status: s.status.lock().unwrap().clone(),
            exit_code: *s.exit_code.lock().unwrap(),
        })
        .collect())
}

#[tauri::command]
fn pty_kill_all(
    state: State<'_, TerminalManager>,
) -> Result<(), String> {
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    for session in sessions.values() {
        #[cfg(unix)]
        {
            use nix::sys::signal::{kill, Signal};
            use nix::unistd::Pid;
            let pid = session.pid as i32;
            let _ = kill(Pid::from_raw(pid), Signal::SIGTERM);
        }
        {
            let mut child_guard = session.child.lock().map_err(|e| e.to_string())?;
            if let Some(ref mut child) = *child_guard {
                child.kill().ok();
            }
        }
        {
            let mut writer_guard = session.writer.lock().map_err(|e| e.to_string())?;
            *writer_guard = None;
        }
        *session.status.lock().map_err(|e| e.to_string())? = "killed".to_string();
    }
    Ok(())
}

// ── Environment Detection ────────────────────────────────────────────────

// GUI apps launched from Finder/Dock/Start Menu inherit a minimal PATH.
// Augment PATH so system tools (node, git, python, cargo, nvm) are found.
pub fn augmented_path() -> String {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_default();
    let mut dirs: Vec<String> = Vec::new();
    let push = |dirs: &mut Vec<String>, dir: String| {
        if !dir.is_empty()
            && std::path::Path::new(&dir).is_dir()
            && !dirs.iter().any(|d| d == &dir)
        {
            dirs.push(dir);
        }
    };

    let sep = if cfg!(target_os = "windows") { ';' } else { ':' };

    for d in std::env::var("PATH").unwrap_or_default().split(sep) {
        push(&mut dirs, d.to_string());
    }

    if cfg!(target_os = "macos") {
        for d in [
            "/opt/homebrew/bin",
            "/opt/homebrew/sbin",
            "/usr/local/bin",
            "/usr/local/sbin",
            "/usr/local/go/bin",
        ] {
            push(&mut dirs, d.to_string());
        }
    }

    push(&mut dirs, format!("{}/.cargo/bin", home));
    push(&mut dirs, format!("{}/.volta/bin", home));
    push(&mut dirs, format!("{}/.bun/bin", home));
    push(&mut dirs, format!("{}/go/bin", home));

    let nvm_dir = format!("{}/.nvm/versions/node", home);
    if let Ok(entries) = std::fs::read_dir(&nvm_dir) {
        let mut versions: Vec<String> = entries
            .filter_map(|e| e.ok())
            .map(|e| e.path().join("bin").to_string_lossy().to_string())
            .collect();
        versions.sort();
        if let Some(latest) = versions.last() {
            push(&mut dirs, latest.clone());
        }
    }

    dirs.join(&sep.to_string())
}

fn detect_version(cmd: &str, args: &[&str], path_env: &str) -> Option<String> {
    Command::new(cmd)
        .args(args)
        .env("PATH", path_env)
        .output()
        .ok()
        .filter(|o| o.status.success())
        .and_then(|o| {
            let s = String::from_utf8_lossy(&o.stdout).trim().to_string();
            if s.is_empty() { None } else { Some(s) }
        })
}

#[tauri::command]
fn detect_environment() -> Result<EnvSnapshot, String> {
    let os = std::env::consts::OS.to_string();
    let arch = std::env::consts::ARCH.to_string();
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_default();
    let cwd = std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();
    let username = whoami::username().to_string();
    let hostname = whoami::fallible::hostname().unwrap_or_else(|_| "unknown".to_string());
    let shell = std::env::var("SHELL").unwrap_or_else(|_| {
        if cfg!(target_os = "windows") { "powershell.exe".to_string() } else { "/bin/sh".to_string() }
    });

    let path_env = augmented_path();

    Ok(EnvSnapshot {
        os,
        arch,
        shell,
        node: detect_version("node", &["--version"], &path_env),
        npm: detect_version("npm", &["--version"], &path_env),
        pnpm: detect_version("pnpm", &["--version"], &path_env),
        yarn: detect_version("yarn", &["--version"], &path_env),
        python: detect_version("python3", &["--version"], &path_env)
            .or_else(|| detect_version("python", &["--version"], &path_env)),
        git: detect_version("git", &["--version"], &path_env),
        docker: detect_version("docker", &["--version"], &path_env),
        docker_compose: detect_version("docker", &["compose", "version"], &path_env)
            .or_else(|| detect_version("docker-compose", &["--version"], &path_env)),
        rust: detect_version("rustc", &["--version"], &path_env),
        cargo: detect_version("cargo", &["--version"], &path_env),
        java: detect_version("java", &["--version"], &path_env),
        go: detect_version("go", &["version"], &path_env),
        cwd,
        home,
        username,
        hostname,
    })
}

// ── IDE Launcher ─────────────────────────────────────────────────────────

fn resolve_ide() -> Option<String> {
    let candidates = if cfg!(target_os = "macos") {
        vec![
            "/Applications/Smoke Monkey AI IDE.app/Contents/MacOS/Smoke Monkey AI IDE".into(),
            "/Applications/Visual Studio Code.app/Contents/MacOS/Visual Studio Code".into(),
            "/Applications/Cursor.app/Contents/MacOS/Cursor".into(),
            "/usr/local/bin/code".into(),
            "/opt/homebrew/bin/code".into(),
            "code".into(),
        ]
    } else if cfg!(target_os = "linux") {
        vec![
            "/usr/bin/code".into(),
            "/usr/share/code/code".into(),
            "code".into(),
        ]
    } else {
        vec![
            "C:\\Program Files\\Microsoft VS Code\\Code.exe".into(),
            "C:\\Program Files (x86)\\Microsoft VS Code\\Code.exe".into(),
            "code".into(),
        ]
    };

    for candidate in candidates {
        if candidate == "code" {
            if Command::new("code")
                .arg("--version")
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
            {
                return Some(candidate);
            }
            continue;
        }
        let p = std::path::Path::new(&candidate);
        if p.exists() {
            return Some(candidate);
        }
    }
    None
}

#[tauri::command]
fn ide_available() -> bool {
    resolve_ide().is_some()
}

#[tauri::command]
fn open_in_ide(workspace_path: String) -> Result<(), String> {
    let ide = resolve_ide().ok_or_else(|| {
        "Visual Studio Code (or a compatible editor) is not installed on this device.".to_string()
    })?;

    Command::new(ide)
        .arg(&workspace_path)
        .spawn()
        .map_err(|e| format!("Failed to launch IDE: {}", e))?;

    Ok(())
}

// ── Node & Canvas Server Lifecycle ───────────────────────────────────────

fn find_node() -> Option<String> {
    let candidates = [
        "/opt/homebrew/bin/node",
        "/usr/local/bin/node",
        "/usr/bin/node",
    ];

    if let Ok(output) = Command::new("which").arg("node").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Some(path);
            }
        }
    }

    for c in &candidates {
        if std::path::Path::new(c).exists() {
            return Some(c.to_string());
        }
    }

    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_default();
    let nvm_dir = format!("{}/.nvm/versions/node", home);
    if let Ok(entries) = std::fs::read_dir(&nvm_dir) {
        let mut versions: Vec<String> = entries
            .filter_map(|e| e.ok())
            .map(|e| e.file_name().to_string_lossy().to_string())
            .collect();
        versions.sort();
        if let Some(latest) = versions.last() {
            let path = format!("{}/bin/node", latest);
            if std::path::Path::new(&path).exists() {
                return Some(path);
            }
        }
    }

    None
}

fn spawn_canvas_server() -> Option<Child> {
    let manifest = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    // Walk up from desktop/src-tauri to root workspace
    let project_root = manifest.parent()?.parent()?;
    let server_cli = project_root.join("bin/cli.js");

    let node_path = find_node().unwrap_or_else(|| "node".to_string());
    let port = get_canvas_port();

    eprintln!(
        "[smoke-monkey-canvas] Forcefully launching Canvas daemon with {} (node: {}) on port {}",
        server_cli.display(),
        node_path,
        port
    );

    let mut cmd = Command::new(&node_path);
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_default();

    // Start in background daemon mode so backend persists even if desktop window closes
    cmd.arg(server_cli.to_str()?)
        .arg("start")
        .arg("--no-open")
        .arg("--port")
        .arg(port.to_string())
        .current_dir(project_root)
        .env("HOME", &home)
        .env("PATH", augmented_path())
        .env("PORT", port.to_string());

    let child = cmd
        .stdin(Stdio::null())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .ok()?;

    Some(child)
}

fn api_probe_healthy() -> bool {
    let port = get_canvas_port();
    let mut stream = match connect_api() {
        Ok(s) => s,
        Err(_) => return false,
    };
    let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
    let req = format!("GET /api/space HTTP/1.1\r\nHost: localhost:{port}\r\nConnection: close\r\n\r\n");
    if stream.write_all(req.as_bytes()).is_ok() {
        let mut buf = [0u8; 1024];
        if let Ok(n) = stream.read(&mut buf) {
            let resp = String::from_utf8_lossy(&buf[..n]);
            return resp.contains("200") || resp.contains("OK");
        }
    }
    false
}

fn wait_for_api(timeout_ms: u64) {
    let start = Instant::now();
    let port = get_canvas_port();
    eprintln!("[smoke-monkey-canvas] Waiting for API on port {port}...");

    while start.elapsed() < Duration::from_millis(timeout_ms) {
        if api_probe_healthy() {
            eprintln!("[smoke-monkey-canvas] Canvas API ready (took {:?})", start.elapsed());
            return;
        }
        thread::sleep(Duration::from_millis(500));
    }

    eprintln!(
        "[smoke-monkey-canvas] WARNING: API not ready after {}ms, proceeding",
        timeout_ms
    );
}

#[tauri::command]
fn open_system_link(app: tauri::AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_shell::ShellExt;
    app.shell().open(&url, None).map_err(|e| e.to_string())
}

// ── Entry Point ──────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .manage(TerminalManager::new())
        .invoke_handler(tauri::generate_handler![
            proxy_fetch,
            proxy_fetch_streaming,
            pty_spawn,
            pty_write,
            pty_resize,
            pty_kill,
            pty_list,
            pty_kill_all,
            detect_environment,
            classify_risk,
            open_in_ide,
            ide_available,
            open_system_link,
        ])
        .setup(|app| {
            // Build the main canvas window with strict navigation interceptor
            // so any external links automatically open in default system browser
            let app_handle = app.handle().clone();
            let _main_window = tauri::WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::default(),
            )
            .title("Smoke Monkey Canvas")
            .inner_size(1440.0, 920.0)
            .min_inner_size(1024.0, 700.0)
            .resizable(true)
            .center()
            .on_navigation(move |url| {
                let scheme = url.scheme();
                let host = url.host_str().unwrap_or("");

                // Allow internal custom protocols and local host addresses
                if scheme == "tauri"
                    || scheme == "asset"
                    || (scheme == "http"
                        && (host == "tauri.localhost"
                            || host == "localhost"
                            || host == "127.0.0.1"))
                {
                    return true;
                }

                // Any external web navigation: intercept and open in default OS browser!
                if scheme == "http" || scheme == "https" || scheme == "mailto" {
                    use tauri_plugin_shell::ShellExt;
                    let _ = app_handle.shell().open(url.as_str(), None);
                    return false;
                }

                true
            })
            .build()?;

            // Background initialization — never blocks window startup
            thread::spawn(move || {
                let port = get_canvas_port();

                // If Canvas server is already running, connect directly to it
                if api_probe_healthy() {
                    eprintln!("[smoke-monkey-canvas] Healthy Canvas API already active on port {port}");
                } else {
                    eprintln!("[smoke-monkey-canvas] Canvas server not active on port {port}, forcefully starting daemon...");
                    if let Some(mut launcher) = spawn_canvas_server() {
                        let _ = launcher.wait();
                    }
                    wait_for_api(20000);
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Background operations must keep working even if user closes the window.
                // On macOS, hide the window so background agent crons and runs continue,
                // and clicking the Dock icon brings it right back.
                #[cfg(target_os = "macos")]
                {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building Smoke Monkey Canvas Desktop")
        .run(|app_handle, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = event {
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        });
}
