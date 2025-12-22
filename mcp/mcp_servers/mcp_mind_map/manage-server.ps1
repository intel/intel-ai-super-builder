param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "status", "restart")]
    [string]$Command
)

$ServerPath = Join-Path $PSScriptRoot "server.py"

switch ($Command) {
    "start" {
        python $ServerPath start --json
    }
    "stop" {
        python $ServerPath stop --json
    }
    "status" {
        python $ServerPath status --json
    }
    "restart" {
        python $ServerPath stop --json
        Start-Sleep -Seconds 2
        python $ServerPath start --json
    }
}