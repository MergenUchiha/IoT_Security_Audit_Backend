param(
    [Parameter(Mandatory=$true)]
    [string]$DeviceId,

    [string]$ApiUrl = "http://localhost:5005",

    [int]$PollIntervalSec = 3,

    [int]$InitialMinutes = 60
)

function Map-EntryType([string]$entryType) {
    switch ($entryType) {
        "Error"       { return "ERROR" }
        "Warning"     { return "WARN" }
        "Information" { return "INFO" }
        "FailureAudit"{ return "WARN" }
        "SuccessAudit"{ return "INFO" }
        default       { return "INFO" }
    }
}

function Send-Log([hashtable]$payload) {
    $url = "$ApiUrl/ingest/$DeviceId/logs"
    try {
        $body = ConvertTo-Json $payload -Compress -Depth 3
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
        $req = [System.Net.WebRequest]::Create($url)
        $req.Method = "POST"
        $req.ContentType = "application/json; charset=utf-8"
        $req.ContentLength = $bytes.Length
        $req.Timeout = 5000
        $stream = $req.GetRequestStream()
        $stream.Write($bytes, 0, $bytes.Length)
        $stream.Close()
        $resp = $req.GetResponse()
        $resp.Close()
        return $true
    } catch {
        return $false
    }
}

function Write-LevelLog([string]$level, [string]$source, [string]$message) {
    $color = switch ($level) {
        "ERROR" { "Red" }
        "WARN"  { "Yellow" }
        "INFO"  { "Green" }
        "DEBUG" { "Cyan" }
        default { "Gray" }
    }
    $ts = Get-Date -Format "HH:mm:ss"
    $shortMsg = if ($message.Length -gt 100) { $message.Substring(0, 100) + "..." } else { $message }
    Write-Host "[$ts] " -NoNewline -ForegroundColor DarkGray
    Write-Host "$($level.PadRight(5))" -NoNewline -ForegroundColor $color
    Write-Host " [$source] $shortMsg" -ForegroundColor White
}

# ─── Start ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=== IoT Security Audit - Windows Log Agent ===" -ForegroundColor Cyan
Write-Host "  Device ID  : $DeviceId" -ForegroundColor Yellow
Write-Host "  API URL    : $ApiUrl" -ForegroundColor Yellow
Write-Host "  Poll every : ${PollIntervalSec}s" -ForegroundColor Yellow
Write-Host ""

# Check API
try {
    $wc = New-Object System.Net.WebClient
    $json = $wc.DownloadString("$ApiUrl/devices/$DeviceId/summary")
    $obj = ConvertFrom-Json $json
    Write-Host "  OK - Device: $($obj.device.name)" -ForegroundColor Green
} catch {
    Write-Host "  WARN - API check failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Starting collection. Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

$logs = @("System", "Application")
$since = (Get-Date).AddMinutes(-$InitialMinutes)
$lastSeen = @{}
foreach ($l in $logs) { $lastSeen[$l] = $since }

$sent = 0
$errors = 0

# ─── Initial batch ───────────────────────────────────────────────────────────
Write-Host "  Reading initial events from last $InitialMinutes minutes..." -ForegroundColor DarkGray

foreach ($logName in $logs) {
    try {
        $events = Get-EventLog -LogName $logName -After $since -ErrorAction Stop |
            Sort-Object TimeGenerated

        Write-Host "  [$logName]: $($events.Count) events found" -ForegroundColor DarkGray

        foreach ($ev in $events) {
            $level  = Map-EntryType $ev.EntryType.ToString()
            $source = $ev.Source
            $msg    = $ev.Message
            if (-not $msg) { $msg = "EventID=$($ev.EventID)" }
            if ($msg.Length -gt 1000) { $msg = $msg.Substring(0, 1000) + "..." }

            $payload = @{
                message = $msg
                level   = $level
                app     = $source
                host    = $env:COMPUTERNAME
                source  = "HTTP"
                ts      = $ev.TimeGenerated.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
                raw     = @{
                    eventId = $ev.EventID
                    channel = $logName
                    category = $ev.Category
                }
            }

            $ok = Send-Log $payload
            if ($ok) {
                $sent++
                Write-LevelLog $level $source $msg
            } else {
                $errors++
            }

            if ($ev.TimeGenerated -gt $lastSeen[$logName]) {
                $lastSeen[$logName] = $ev.TimeGenerated
            }
        }
    } catch {
        Write-Host "  [$logName] Error: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "  Initial batch: $sent sent, $errors errors" -ForegroundColor DarkGray
Write-Host ""

# ─── Main loop ───────────────────────────────────────────────────────────────
while ($true) {
    Start-Sleep -Seconds $PollIntervalSec

    foreach ($logName in $logs) {
        try {
            $after = $lastSeen[$logName]
            $events = Get-EventLog -LogName $logName -After $after -ErrorAction SilentlyContinue |
                Sort-Object TimeGenerated

            if (-not $events) { continue }

            foreach ($ev in $events) {
                $level  = Map-EntryType $ev.EntryType.ToString()
                $source = $ev.Source
                $msg    = $ev.Message
                if (-not $msg) { $msg = "EventID=$($ev.EventID)" }
                if ($msg.Length -gt 1000) { $msg = $msg.Substring(0, 1000) + "..." }

                $payload = @{
                    message = $msg
                    level   = $level
                    app     = $source
                    host    = $env:COMPUTERNAME
                    source  = "HTTP"
                    ts      = $ev.TimeGenerated.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
                    raw     = @{
                        eventId  = $ev.EventID
                        channel  = $logName
                        category = $ev.Category
                    }
                }

                $ok = Send-Log $payload
                if ($ok) {
                    $sent++
                    Write-LevelLog $level $source $msg
                } else {
                    $errors++
                }

                if ($ev.TimeGenerated -gt $lastSeen[$logName]) {
                    $lastSeen[$logName] = $ev.TimeGenerated
                }
            }
        } catch {
            # skip
        }
    }
}