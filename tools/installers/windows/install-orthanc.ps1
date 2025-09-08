#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Installs and configures Orthanc DICOM server as a sidecar service for GapJunction Agent.

.DESCRIPTION
    This script downloads, installs, and configures Orthanc DICOM server on Windows.
    It handles:
    - Downloading the appropriate Orthanc installer (32/64-bit)
    - Running the installer
    - Configuring orthanc.json with GapJunction-specific settings
    - Configuring worklists.json to enable the Worklist feature
    - Opening required firewall ports (4242/TCP, 8042/TCP)
    - Restarting the Orthanc service

.PARAMETER RuntimeId
    The runtime ID for the GapJunction agent (used as username)

.PARAMETER AdminPassword
    The admin password for Orthanc authentication

.PARAMETER WorklistPath
    Optional path for the DICOM worklist database (defaults to user Documents folder)

.PARAMETER LogPath
    Optional path for installation logs (defaults to temp directory)

.EXAMPLE
    .\install-orthanc.ps1 -RuntimeId "agent-123" -AdminPassword "securepass123"

.EXAMPLE
    .\install-orthanc.ps1 -RuntimeId "agent-123" -AdminPassword "securepass123" -WorklistPath "C:\PACSData\Worklists"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$RuntimeId,
    
    [Parameter(Mandatory=$true)]
    [SecureString]$AdminPassword,
    
    [Parameter(Mandatory=$false)]
    [string]$WorklistPath,
    
    [Parameter(Mandatory=$false)]
    [string]$LogPath = "$env:TEMP\orthanc-install.log"
)

# Script configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Orthanc download URLs
$OrthancVersion = "25.8.1"
$Orthanc64Url = "https://orthanc.uclouvain.be/downloads/windows-64/installers/OrthancInstaller-Win64-$OrthancVersion.exe"
$Orthanc32Url = "https://orthanc.uclouvain.be/downloads/windows-32/installers/OrthancInstaller-Win32-$OrthancVersion.exe"

# Default paths
$DefaultConfigPath = "C:\Program Files\Orthanc Server\Configuration"
$ServiceName = "Orthanc"

# Logging function
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    Write-Host $logEntry
    Add-Content -Path $LogPath -Value $logEntry -ErrorAction SilentlyContinue
}

# Error handling function
function Handle-Error {
    param(
        [string]$Message,
        [int]$ExitCode = 1
    )
    
    Write-Log "ERROR: $Message" "ERROR"
    
    # Show popup for critical errors
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show(
        "Orthanc Installation Error:`n`n$Message`n`nCheck log file: $LogPath",
        "GapJunction Orthanc Installer",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Error
    )
    
    exit $ExitCode
}

# Check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Detect system architecture
function Get-SystemArchitecture {
    if ([Environment]::Is64BitOperatingSystem) {
        return "64"
    } else {
        return "32"
    }
}

# Download file with progress
function Download-File {
    param(
        [string]$Url,
        [string]$OutputPath
    )
    
    try {
        Write-Log "Downloading from: $Url"
        Write-Log "Saving to: $OutputPath"
        
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($Url, $OutputPath)
        
        if (Test-Path $OutputPath) {
            Write-Log "Download completed successfully"
            return $true
        } else {
            throw "Downloaded file not found"
        }
    }
    catch {
        Write-Log "Download failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Install Orthanc
function Install-Orthanc {
    param(
        [string]$InstallerPath
    )
    
    try {
        Write-Log "Starting Orthanc installation..."
        
        # Run installer silently
        $process = Start-Process -FilePath $InstallerPath -ArgumentList "/S" -Wait -PassThru
        
        if ($process.ExitCode -eq 0) {
            Write-Log "Orthanc installation completed successfully"
            return $true
        } else {
            throw "Installer exited with code: $($process.ExitCode)"
        }
    }
    catch {
        Write-Log "Installation failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Configure Orthanc
function Configure-Orthanc {
    param(
        [string]$ConfigPath,
        [string]$RuntimeId,
        [SecureString]$AdminPassword,
        [string]$WorklistPath
    )
    
    try {
        $orthancConfigFile = Join-Path $ConfigPath "orthanc.json"
        $worklistConfigFile = Join-Path $ConfigPath "worklists.json"
        
        Write-Log "Configuring Orthanc at: $orthancConfigFile"
        
        # Create orthanc.json configuration
        $orthancConfig = @{
            "AuthenticationEnabled" = $true
            "RegisteredUsers" = @{
                $RuntimeId = $AdminPassword
            }
            "RemoteAccessAllowed" = $false
            "DicomServerEnabled" = $true
            "ExecuteLuaEnabled" = $true
            "HttpServerEnabled" = $true
            "OrthancExplorerEnabled" = $false
            "HttpPort" = 8042
            "DicomPort" = 4242
            "Name" = "Gapjunction VNA"
            "DicomAet" = "GAPJUNCTION"
        }
        
        # Write orthanc.json
        $orthancConfig | ConvertTo-Json -Depth 10 | Set-Content -Path $orthancConfigFile -Encoding UTF8
        Write-Log "Created orthanc.json configuration"
        
        # Create worklists.json configuration
        if (-not $WorklistPath) {
            $WorklistPath = Join-Path $env:USERPROFILE "Documents\PACSWorklists"
        }
        
        # Ensure worklist directory exists
        if (-not (Test-Path $WorklistPath)) {
            New-Item -ItemType Directory -Path $WorklistPath -Force | Out-Null
            Write-Log "Created worklist directory: $WorklistPath"
        }
        
        $worklistConfig = @{
            "Worklists" = @{
                "Enabled" = $true
                "Database" = $WorklistPath
            }
        }
        
        # Write worklists.json
        $worklistConfig | ConvertTo-Json -Depth 10 | Set-Content -Path $worklistConfigFile -Encoding UTF8
        Write-Log "Created worklists.json configuration"
        
        return $true
    }
    catch {
        Write-Log "Configuration failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Open firewall ports
function Open-FirewallPorts {
    try {
        Write-Log "Opening firewall ports for Orthanc..."
        
        # Open HTTP port (8042)
        New-NetFirewallRule -DisplayName "Orthanc HTTP" -Direction Inbound -Protocol TCP -LocalPort 8042 -Action Allow -ErrorAction SilentlyContinue
        Write-Log "Opened TCP port 8042 (HTTP)"
        
        # Open DICOM port (4242)
        New-NetFirewallRule -DisplayName "Orthanc DICOM" -Direction Inbound -Protocol TCP -LocalPort 4242 -Action Allow -ErrorAction SilentlyContinue
        Write-Log "Opened TCP port 4242 (DICOM)"
        
        return $true
    }
    catch {
        Write-Log "Failed to open firewall ports: $($_.Exception.Message)" "WARNING"
        return $false
    }
}

# Restart Orthanc service
function Restart-OrthancService {
    try {
        Write-Log "Restarting Orthanc service..."
        
        # Stop service if running
        $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($service -and $service.Status -eq "Running") {
            Stop-Service -Name $ServiceName -Force
            Write-Log "Stopped Orthanc service"
        }
        
        # Start service
        Start-Service -Name $ServiceName
        Write-Log "Started Orthanc service"
        
        # Verify service is running
        Start-Sleep -Seconds 10
        $service = Get-Service -Name $ServiceName
        if ($service.Status -eq "Running") {
            Write-Log "Orthanc service is running successfully"
            return $true
        } else {
            throw "Service failed to start properly"
        }
    }
    catch {
        Write-Log "Failed to restart service: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Main installation process
function Main {
    Write-Log "=== GapJunction Orthanc Installer Started ==="
    Write-Log "Runtime ID: $RuntimeId"
    Write-Log "Log Path: $LogPath"
    
    # Verify administrator privileges
    if (-not (Test-Administrator)) {
        Handle-Error "This script must be run as Administrator"
    }
    
    # Detect architecture and set download URL
    $architecture = Get-SystemArchitecture
    $downloadUrl = if ($architecture -eq "64") { $Orthanc64Url } else { $Orthanc32Url }
    $installerFileName = "OrthancInstaller-Win$architecture-$OrthancVersion.exe"
    $installerPath = Join-Path $env:TEMP $installerFileName
    
    Write-Log "Detected $architecture-bit system"
    Write-Log "Using installer: $installerFileName"
    
    try {
        # Step 1: Download Orthanc installer
        Write-Log "Step 1: Downloading Orthanc installer..."
        if (-not (Download-File -Url $downloadUrl -OutputPath $installerPath)) {
            Handle-Error "Failed to download Orthanc installer"
        }
        
        # Step 2: Install Orthanc
        Write-Log "Step 2: Installing Orthanc..."
        if (-not (Install-Orthanc -InstallerPath $installerPath)) {
            Handle-Error "Failed to install Orthanc"
        }
        
        # Wait for installation to complete
        Start-Sleep -Seconds 10
        
        # Step 3: Configure Orthanc
        Write-Log "Step 3: Configuring Orthanc..."
        if (-not (Configure-Orthanc -ConfigPath $DefaultConfigPath -RuntimeId $RuntimeId -AdminPassword $AdminPassword -WorklistPath $WorklistPath)) {
            Handle-Error "Failed to configure Orthanc"
        }
        
        # Step 4: Open firewall ports
        Write-Log "Step 4: Opening firewall ports..."
        Open-FirewallPorts | Out-Null
        
        # Step 5: Restart Orthanc service
        Write-Log "Step 5: Restarting Orthanc service..."
        if (-not (Restart-OrthancService)) {
            Handle-Error "Failed to restart Orthanc service"
        }
        
        # Cleanup
        if (Test-Path $installerPath) {
            Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
            Write-Log "Cleaned up installer file"
        }
        
        Write-Log "=== Orthanc Installation Completed Successfully ==="
        Write-Log "Orthanc is now running on:"
        Write-Log "  - HTTP: http://localhost:8042"
        Write-Log "  - DICOM: localhost:4242"
        Write-Log "  - Username: $RuntimeId"
        Write-Log "  - Worklist Path: $(if ($WorklistPath) { $WorklistPath } else { Join-Path $env:USERPROFILE 'Documents\PACSWorklists' })"
        
        # Show success popup
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show(
            "Orthanc installation completed successfully!`n`nHTTP: http://localhost:8042`nDICOM: localhost:4242`nUsername: $RuntimeId",
            "GapJunction Orthanc Installer",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Information
        )
        
        exit 0
    }
    catch {
        Handle-Error "Unexpected error during installation: $($_.Exception.Message)"
    }
}

# Run main function
Main