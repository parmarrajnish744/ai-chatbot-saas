param (
    [Parameter(Mandatory=$true)]
    [string]$IpAddress,
    
    [Parameter(Mandatory=$false)]
    [string]$KeyPath = "C:\Users\Administrator\Downloads\LightsailDefaultKey-ap-south-1.pem"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 Deploying to AWS Lightsail Instance ($IpAddress)..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if (-not (Test-Path $KeyPath)) {
    Write-Error "SSH Key not found at: $KeyPath"
    exit 1
}

# Adjust key permissions for Windows OpenSSH
try {
    icacls $KeyPath /inheritance:r /grant:r "$($env:USERNAME):(R)" | Out-Null
} catch {
    # Ignore if already set
}

Write-Host "📡 Testing SSH connectivity to ubuntu@$IpAddress..." -ForegroundColor Yellow
$testSsh = ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -i $KeyPath ubuntu@$IpAddress "echo 'SSH_CONNECTED'"

if ($testSsh -notmatch "SSH_CONNECTED") {
    Write-Error "Failed to connect to ubuntu@$IpAddress. Please verify the IP address and make sure Port 22 is open in AWS Lightsail Networking tab."
    exit 1
}

Write-Host "✅ SSH Connection established!" -ForegroundColor Green

# Read Gemini API key from local .env if available
$geminiKey = ""
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match 'GEMINI_API_KEY=["'']?([^"''\r\n]+)["'']?') {
        $geminiKey = $matches[1]
    }
}

Write-Host "🚀 Running full automated deployment script on AWS Lightsail..." -ForegroundColor Cyan

$remoteCommand = "curl -sSL https://raw.githubusercontent.com/parmarrajnish744/ai-chatbot-saas/main/deploy-aws-automated.sh | bash -s -- '$geminiKey'"

ssh -t -o StrictHostKeyChecking=no -i $KeyPath ubuntu@$IpAddress $remoteCommand

Write-Host "`n✅ AWS Deployment Execution Finished!" -ForegroundColor Green
