# Script para probar el webhook de Ko-fi
# Simula una donación de Ko-fi enviando un payload de prueba

# Configuración
$ngrokUrl = "https://floatier-uninterpretable-marlee.ngrok-free.dev"
$webhookUrl = "$ngrokUrl/webhooks/kofi"
$verificationToken = "7a0c9ae3-57f5-489f-b0fc-953f9b36e7b4"

# IMPORTANTE: Cambia este email por el que tengas registrado en Firebase
$testEmail = "TU_EMAIL_AQUI@gmail.com"

# Payload de prueba simulando una donación de Ko-fi
$payload = @{
    verification_token = $verificationToken
    message_id = "test-message-id-$(Get-Date -Format 'yyyyMMddHHmmss')"
    timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    type = "Donation"
    is_public = $true
    from_name = "Usuario de Prueba"
    message = "Esta es una donación de prueba!"
    amount = "5.00"  # $5 = Premium Pro por 30 días
    url = "https://ko-fi.com/test"
    email = $testEmail
    kofi_transaction_id = "test-txn-$(Get-Date -Format 'yyyyMMddHHmmss')"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   PRUEBA DE WEBHOOK KO-FI" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URL del webhook: $webhookUrl" -ForegroundColor Yellow
Write-Host "Email de prueba: $testEmail" -ForegroundColor Yellow
Write-Host "Monto: $($payload.amount)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Enviando payload..." -ForegroundColor Green

try {
    $jsonPayload = $payload | ConvertTo-Json -Depth 10

    $response = Invoke-WebRequest `
        -Uri $webhookUrl `
        -Method POST `
        -Body $jsonPayload `
        -ContentType "application/json" `
        -UseBasicParsing

    Write-Host ""
    Write-Host "✓ Respuesta recibida!" -ForegroundColor Green
    Write-Host "  Status Code: $($response.StatusCode)" -ForegroundColor Cyan
    Write-Host "  Respuesta: $($response.Content)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Revisa:" -ForegroundColor Yellow
    Write-Host "  1. Los logs del bot en la consola" -ForegroundColor White
    Write-Host "  2. El canal de logs en Discord (ID: 1450196179794268325)" -ForegroundColor White
    Write-Host "  3. Tu DM del bot (si el email está registrado)" -ForegroundColor White

} catch {
    Write-Host ""
    Write-Host "✗ Error al enviar el webhook:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red

    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Respuesta del servidor: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
