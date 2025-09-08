# GapJunction Sidecar Installers for Windows

This directory contains PowerShell scripts for installing and configuring sidecar services for the GapJunction Agent on Windows systems.

## Prerequisites

- Windows 10 or Windows Server 2016 or later
- PowerShell 5.1 or later
- Administrator privileges
- Internet connection for downloading installers

## Available Installers

### 1. Orthanc DICOM Server (`install-orthanc.ps1`)

Installs and configures Orthanc DICOM server with GapJunction-specific settings.

**Features:**
- Downloads appropriate Orthanc installer (32/64-bit detection)
- Configures authentication with runtime ID and admin password
- Sets up DICOM worklist functionality
- Opens required firewall ports (4242/TCP, 8042/TCP)
- Configures and restarts the Orthanc service

**Usage:**
```powershell
# Basic installation
.\install-orthanc.ps1 -RuntimeId "your-runtime-id" -AdminPassword "your-secure-password"

# With custom worklist path
.\install-orthanc.ps1 -RuntimeId "your-runtime-id" -AdminPassword "your-secure-password" -WorklistPath "C:\PACSData\Worklists"

# With custom log path
.\install-orthanc.ps1 -RuntimeId "your-runtime-id" -AdminPassword "your-secure-password" -LogPath "C:\Logs\orthanc-install.log"
```

**Parameters:**
- `RuntimeId` (Required): The runtime ID for the GapJunction agent
- `AdminPassword` (Required): The admin password for Orthanc authentication
- `WorklistPath` (Optional): Custom path for DICOM worklist database
- `LogPath` (Optional): Custom path for installation logs

**Post-Installation:**
- Orthanc HTTP interface: `http://localhost:8042`
- DICOM port: `localhost:4242`
- Service name: `Orthanc`

### 2. Syncthing File Synchronization (`install-syncthing.ps1`)

Installs and configures Syncthing for file synchronization.

**Features:**
- Downloads and installs Syncthing Windows setup
- Opens required firewall ports (22000/TCP, 22000/UDP, 21027/UDP)
- Verifies and starts the Syncthing service
- Handles existing installations gracefully

**Usage:**
```powershell
# Basic installation
.\install-syncthing.ps1

# With custom log path
.\install-syncthing.ps1 -LogPath "C:\Logs\syncthing-install.log"
```

**Parameters:**
- `LogPath` (Optional): Custom path for installation logs

**Post-Installation:**
- Service name: `Syncthing Service` (or `Syncthing`)
- Web interface: `http://localhost:8384` (default)

## Running the Scripts

### Method 1: PowerShell as Administrator
1. Right-click on PowerShell and select "Run as Administrator"
2. Navigate to the installer directory:
   ```powershell
   cd "C:\path\to\gapjunction-engine\tools\installers\windows"
   ```
3. Run the desired installer script with required parameters

### Method 2: From Command Prompt as Administrator
1. Right-click on Command Prompt and select "Run as Administrator"
2. Run PowerShell with the script:
   ```cmd
   powershell -ExecutionPolicy Bypass -File "install-orthanc.ps1" -RuntimeId "your-id" -AdminPassword "your-password"
   ```

### Method 3: Using PowerShell ISE as Administrator
1. Right-click on PowerShell ISE and select "Run as Administrator"
2. Open the script file
3. Modify parameters at the top of the script if needed
4. Run the script (F5)

## Execution Policy

If you encounter execution policy errors, you can temporarily bypass them:

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

Or run with bypass flag:
```powershell
powershell -ExecutionPolicy Bypass -File "install-orthanc.ps1" -RuntimeId "your-id" -AdminPassword "your-password"
```

## Logging

Both scripts create detailed logs of the installation process:
- Default log location: `%TEMP%\orthanc-install.log` or `%TEMP%\syncthing-install.log`
- Custom log location can be specified with `-LogPath` parameter
- Logs include timestamps, operation details, and error information

## Error Handling

The scripts include comprehensive error handling:
- **File Logging**: All operations are logged to a file
- **Popup Notifications**: Critical errors display popup messages
- **Exit Codes**: Scripts exit with appropriate codes (0 = success, 1+ = error)
- **Rollback**: Failed installations attempt cleanup of downloaded files

## Firewall Configuration

The scripts automatically configure Windows Firewall rules:

**Orthanc:**
- TCP 8042 (HTTP interface)
- TCP 4242 (DICOM protocol)

**Syncthing:**
- TCP 22000 (file synchronization)
- UDP 22000 (file synchronization)
- UDP 21027 (device discovery)

## Troubleshooting

### Common Issues

1. **"Execution of scripts is disabled on this system"**
   - Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
   - Or use: `powershell -ExecutionPolicy Bypass -File script.ps1`

2. **"Access is denied"**
   - Ensure you're running PowerShell as Administrator
   - Check that the script files are not blocked (right-click → Properties → Unblock)

3. **Download failures**
   - Check internet connection
   - Verify firewall/proxy settings allow downloads
   - Check if antivirus is blocking downloads

4. **Service start failures**
   - Check Windows Event Logs for service-specific errors
   - Verify configuration files are valid
   - Ensure required ports are not in use by other applications

### Log Analysis

Check the log files for detailed error information:
```powershell
Get-Content "$env:TEMP\orthanc-install.log" | Select-String "ERROR"
Get-Content "$env:TEMP\syncthing-install.log" | Select-String "ERROR"
```

### Manual Verification

**Orthanc:**
```powershell
Get-Service -Name "Orthanc"
Test-NetConnection -ComputerName localhost -Port 8042
Test-NetConnection -ComputerName localhost -Port 4242
```

**Syncthing:**
```powershell
Get-Service -Name "Syncthing Service"
Test-NetConnection -ComputerName localhost -Port 22000
```

## Integration with GapJunction Agent

These scripts are designed to be called by the GapJunction Agent when:
- `installOrthanc: true` is received from the control API
- `installSyncthing: true` is received from the control API

The agent will:
1. Generate a secure admin password for Orthanc
2. Store the password in the OS keychain
3. Execute the appropriate installer script with the runtime ID and password
4. Update the agent configuration to reflect the installed sidecars

## Security Considerations

- **Admin Password**: Orthanc admin passwords should be cryptographically secure
- **Firewall Rules**: Only necessary ports are opened with specific service names
- **Service Accounts**: Services run with appropriate Windows service account privileges
- **Configuration Files**: Sensitive configuration is stored in protected directories

## Support

For issues with these installer scripts:
1. Check the generated log files for detailed error information
2. Verify all prerequisites are met
3. Ensure proper administrator privileges
4. Review Windows Event Logs for system-level errors

For GapJunction Agent integration issues, refer to the main agent documentation.