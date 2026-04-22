// /**
//  * Electron Main Process — License Integration Example
//  *
//  * Copy electron-license-client.ts into your Electron project,
//  * then follow this pattern in main.ts (or main.js).
//  */

// import { app, BrowserWindow, dialog } from "electron";
// import Store from "electron-store"; // npm install electron-store
// import { initLicense, LicenseClient } from "./license-client";

// // ── Config ────────────────────────────────────────────────────────────────────
// const DASHBOARD_URL = "https://your-dashboard.com"; // 🔴 change this
// const HEARTBEAT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

// // Persistent encrypted store for the license key
// const store = new Store<{ licenseKey: string }>({ encryptionKey: "your-app-secret" });

// let licenseClient: LicenseClient | null = null;
// let mainWindow: BrowserWindow | null = null;

// // ── App events ────────────────────────────────────────────────────────────────

// app.whenReady().then(async () => {
//   const licenseKey = store.get("licenseKey");

//   if (!licenseKey) {
//     // No key stored — show license entry UI
//     await showLicenseEntryWindow();
//     return;
//   }

//   // Verify license on every startup
//   const { result, client } = await initLicense({
//     serverUrl: DASHBOARD_URL,
//     licenseKey,
//     heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
//     appName: "YourAppName",
//     appVersion: app.getVersion()
//   });

//   licenseClient = client;

//   if (!result.valid) {
//     await dialog.showMessageBox({
//       type: "error",
//       title: "License Error",
//       message: result.message,
//       detail:
//         result.status === "EXPIRED"
//           ? "Your license has expired. Please renew."
//           : "Contact support if you believe this is an error.",
//       buttons: ["Quit"]
//     });
//     app.quit();
//     return;
//   }

//   // License valid — open main window
//   createMainWindow();
// });

// app.on("before-quit", () => {
//   licenseClient?.stopHeartbeat();
// });

// // ── Windows ───────────────────────────────────────────────────────────────────

// function createMainWindow() {
//   mainWindow = new BrowserWindow({
//     width: 1280,
//     height: 800,
//     webPreferences: { nodeIntegration: false, contextIsolation: true }
//   });
//   mainWindow.loadFile("dist/index.html"); // your Electron renderer entry
// }

// async function showLicenseEntryWindow() {
//   // Simple prompt — in production, build a proper renderer UI for this
//   const {
//     response,
//     checkboxChecked: _,
//     ...__
//   } = await dialog.showMessageBox({
//     type: "question",
//     title: "Activate License",
//     message: "Enter your license key to activate the application.",
//     buttons: ["Cancel", "Activate"],
//     defaultId: 1
//   });

//   if (response === 0) {
//     app.quit();
//     return;
//   }

//   // In a real app, show a proper window with an input field.
//   // Here we use a prompt via the devtools trick (for demo only):
//   const key = "XXXX-XXXX-XXXX-XXXX"; // replace with actual input from user

//   const { result, client } = await initLicense({
//     serverUrl: DASHBOARD_URL,
//     licenseKey: key,
//     appName: "YourAppName",
//     appVersion: app.getVersion()
//   });

//   if (result.valid) {
//     store.set("licenseKey", key);
//     licenseClient = client;
//     createMainWindow();
//   } else {
//     await dialog.showErrorBox("Activation Failed", result.message);
//     app.quit();
//   }
// }
