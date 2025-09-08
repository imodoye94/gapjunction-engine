#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Installs and configures Syncthing as a sidecar service for GapJunction Agent.

.DESCRIPTION
    This script downloads, installs, and configures Syncthing on Windows.
    It handles:
    - Downloading the Syncthing Windows installer
    - Running the installer
    - Opening required firewall ports (22000/TCP, 22000/UDP, 21027/UDP)
    - Starting the Syncthing service

.PARAMETER LogPath
    Optional path for installation logs (defaults to temp directory)

.EXAMPLE
    .\install-syncthing.ps1

.EXAMPLE
    .\install-syncthing.ps1 -LogPath "C:\Logs\syncthing-install.log"
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$LogPath = "$env:TEMP\syncthing-install.log"
)

# Script configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Syncthing download URL
$SyncthingVersion = "v2.0.0"
$SyncthingUrl = "https://github.com/Bill-Stewart/SyncthingWindowsSetup/releases/download/$SyncthingVersion/syncthing-windows-setup.exe"

# Service name
$ServiceName = "Syncthing Service"

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
        "Syncthing Installation Error:`n`n$Message`n`nCheck log file: $LogPath",
        "GapJunction Syncthing Installer",
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

# Install Syncthing
function Install-Syncthing {
    param(
        [string]$InstallerPath
    )
    
    try {
        Write-Log "Starting Syncthing installation..."
        
        # Run installer silently
        $process = Start-Process -FilePath $InstallerPath -ArgumentList "/S" -Wait -PassThru
        
        if ($process.ExitCode -eq 0) {
            Write-Log "Syncthing installation completed successfully"
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

# Open firewall ports
function Open-FirewallPorts {
    try {
        Write-Log "Opening firewall ports for Syncthing..."
        
        # Open TCP port 22000 (file synchronization)
        New-NetFirewallRule -DisplayName "Syncthing TCP" -Direction Inbound -Protocol TCP -LocalPort 22000 -Action Allow -ErrorAction SilentlyContinue
        Write-Log "Opened TCP port 22000 (file synchronization)"
        
        # Open UDP port 22000 (file synchronization)
        New-NetFirewallRule -DisplayName "Syncthing UDP" -Direction Inbound -Protocol UDP -LocalPort 22000 -Action Allow -ErrorAction SilentlyContinue
        Write-Log "Opened UDP port 22000 (file synchronization)"
        
        # Open UDP port 21027 (discovery)
        New-NetFirewallRule -DisplayName "Syncthing Discovery" -Direction Inbound -Protocol UDP -LocalPort 21027 -Action Allow -ErrorAction SilentlyContinue
        Write-Log "Opened UDP port 21027 (discovery)"
        
        return $true
    }
    catch {
        Write-Log "Failed to open firewall ports: $($_.Exception.Message)" "WARNING"
        return $false
    }
}

# Verify Syncthing service
function Verify-SyncthingService {
    try {
        Write-Log "Verifying Syncthing service..."
        
        # Wait a moment for service to be registered
        Start-Sleep -Seconds 5
        
        # Check if service exists
        $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if (-not $service) {
            Write-Log "Syncthing service not found, checking alternative names..." "WARNING"
            
            # Try alternative service names
            $alternativeNames = @("Syncthing", "syncthing")
            foreach ($name in $alternativeNames) {
                $service = Get-Service -Name $name -ErrorAction SilentlyContinue
                if ($service) {
                    Write-Log "Found Syncthing service with name: $name"
                    $script:ServiceName = $name
                    break
                }
            }
        }
        
        if ($service) {
            Write-Log "Syncthing service status: $($service.Status)"
            
            # Start service if not running
            if ($service.Status -ne "Running") {
                Write-Log "Starting Syncthing service..."
                Start-Service -Name $ServiceName
                Start-Sleep -Seconds 3
                
                $service = Get-Service -Name $ServiceName
                if ($service.Status -eq "Running") {
                    Write-Log "Syncthing service started successfully"
                } else {
                    Write-Log "Syncthing service failed to start" "WARNING"
                }
            } else {
                Write-Log "Syncthing service is already running"
            }
            
            return $true
        } else {
            Write-Log "Syncthing service not found after installation" "WARNING"
            Write-Log "Syncthing may have been installed but service registration failed" "WARNING"
            return $false
        }
    }
    catch {
        Write-Log "Failed to verify service: $($_.Exception.Message)" "WARNING"
        return $false
    }
}

# Check if Syncthing is already installed
function Test-SyncthingInstalled {
    try {
        # Check for service
        $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($service) {
            Write-Log "Syncthing service already exists"
            return $true
        }
        
        # Check for executable in common locations
        $commonPaths = @(
            "${env:ProgramFiles}\Syncthing\syncthing.exe",
            "${env:ProgramFiles(x86)}\Syncthing\syncthing.exe",
            "${env:LOCALAPPDATA}\Syncthing\syncthing.exe"
        )
        
        foreach ($path in $commonPaths) {
            if (Test-Path $path) {
                Write-Log "Syncthing executable found at: $path"
                return $true
            }
        }
        
        return $false
    }
    catch {
        return $false
    }
}

# Main installation process
function Main {
    Write-Log "=== GapJunction Syncthing Installer Started ==="
    Write-Log "Log Path: $LogPath"
    
    # Verify administrator privileges
    if (-not (Test-Administrator)) {
        Handle-Error "This script must be run as Administrator"
    }
    
    # Check if Syncthing is already installed
    if (Test-SyncthingInstalled) {
        Write-Log "Syncthing appears to be already installed"
        
        # Still try to open firewall ports and verify service
        Write-Log "Configuring firewall ports..."
        Open-FirewallPorts | Out-Null
        
        Write-Log "Verifying service status..."
        Verify-SyncthingService | Out-Null
        
        Write-Log "=== Syncthing Configuration Completed ==="
        
        # Show info popup
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show(
            "Syncthing was already installed.`n`nFirewall ports have been configured and service verified.",
            "GapJunction Syncthing Installer",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Information
        )
        
        exit 0
    }
    
    # Set up installer path
    $installerFileName = "syncthing-windows-setup.exe"
    $installerPath = Join-Path $env:TEMP $installerFileName
    
    Write-Log "Using installer: $installerFileName"
    
    try {
        # Step 1: Download Syncthing installer
        Write-Log "Step 1: Downloading Syncthing installer..."
        if (-not (Download-File -Url $SyncthingUrl -OutputPath $installerPath)) {
            Handle-Error "Failed to download Syncthing installer"
        }
        
        # Step 2: Install Syncthing
        Write-Log "Step 2: Installing Syncthing..."
        if (-not (Install-Syncthing -InstallerPath $installerPath)) {
            Handle-Error "Failed to install Syncthing"
        }
        
        # Wait for installation to complete
        Start-Sleep -Seconds 10
        
        # Step 3: Open firewall ports
        Write-Log "Step 3: Opening firewall ports..."
        Open-FirewallPorts | Out-Null
        
        # Step 4: Verify and start Syncthing service
        Write-Log "Step 4: Verifying Syncthing service..."
        Verify-SyncthingService | Out-Null
        
        # Cleanup
        if (Test-Path $installerPath) {
            Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
            Write-Log "Cleaned up installer file"
        }
        
        Write-Log "=== Syncthing Installation Completed Successfully ==="
        Write-Log "Syncthing is now installed and configured"
        Write-Log "Firewall ports opened:"
        Write-Log "  - TCP 22000 (file synchronization)"
        Write-Log "  - UDP 22000 (file synchronization)"
        Write-Log "  - UDP 21027 (discovery)"
        
        # Show success popup
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show(
            "Syncthing installation completed successfully!`n`nFirewall ports have been configured:`n- TCP 22000 (file sync)`n- UDP 22000 (file sync)`n- UDP 21027 (discovery)",
            "GapJunction Syncthing Installer",
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