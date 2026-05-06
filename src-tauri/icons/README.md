# Icons

Place a 1024×1024 PNG named `app-icon.png` here, then run:

```powershell
npm run tauri:icon
```

This generates all required sizes automatically:
- 32x32.png
- 128x128.png
- 128x128@2x.png
- icon.ico  (Windows executable icon)
- icon.png

These files are gitignored (binary assets). Do not commit them.
