Param(
  [string]$Base = "http://localhost:3000",
  [string]$Senha = "SenhaF0rte!123",
  [string]$Email,
  [switch]$SkipRegister
)

$ErrorActionPreference = "Stop"

if ($SkipRegister) {
  if (-not $Email) {
    throw "SkipRegister foi definido, mas nenhum -Email foi informado."
  }
  $email = $Email
} else {
  $email = if ($Email) { $Email } else { "vendedor.test." + (Get-Random -Maximum 99999999) + "@example.com" }
}

if (-not $SkipRegister) {
  Write-Host ("Registrando vendedor " + $email + "...")

  $regBody = @{
      nome = "Teste"
      sobrenome = "Vendedor"
      email = $email
      senha = $Senha
      nomeLoja = "Loja Teste"
      documento = "12345678900"
  } | ConvertTo-Json -Depth 5

  $reg = Invoke-RestMethod -Uri ($Base + "/api/vendors/register") -Method Post -ContentType "application/json" -Body $regBody
  ($reg | ConvertTo-Json -Depth 6) | Write-Output
}

Write-Host "Fazendo login como vendedor..."
$loginBody = @{
    email = $email
    senha = $Senha
    context = "vendedor"
} | ConvertTo-Json -Depth 5

$sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$login = Invoke-RestMethod -Uri ($Base + "/api/auth/login?context=vendedor") -Method Post -ContentType "application/json" -Headers @{ "X-Login-Role" = "vendedor" } -Body $loginBody -WebSession $sess
($login | ConvertTo-Json -Depth 6) | Write-Output

Write-Host "Importando um produto..."
$prodBody = @{
    nome = "Teclado Mecânico Teste"
    descricao = "Switch blue"
    fotoUrl = "https://via.placeholder.com/256"
    linkMercadoLivre = "https://www.mercadolivre.com.br/item-test"
    linkAmazon = "https://www.amazon.com.br/item-test"
    categoria = "Periféricos"
    subcategoria = "Teclados"
    precoMercadoLivre = 199.90
    precoAmazon = 209.90
} | ConvertTo-Json -Depth 6

$imp = Invoke-RestMethod -Uri ($Base + "/api/vendors/products/import") -Method Post -ContentType "application/json" -Body $prodBody -WebSession $sess
($imp | ConvertTo-Json -Depth 6) | Write-Output

$productId = $imp.data.id
Write-Host ("Produto criado com id: " + $productId)

Write-Host "Alternando status para inativo..."
<# Preencher todos os campos esperados pela API para evitar erros de placeholders #>
$existing = $imp.data
$firstImage = $null
try {
  if ($existing.imagens -is [string]) {
    $firstImage = (ConvertFrom-Json $existing.imagens)[0]
  } elseif ($existing.imagens -is [object]) {
    $firstImage = $existing.imagens[0]
  }
} catch { $firstImage = $null }

$toggleBodyObj = @{
  status = "inativo"
  nome = $existing.titulo
  descricao = $existing.descricao
  fotoUrl = $firstImage
  categoria = $existing.categoria
  subcategoria = $existing.subcategoria
  linkMercadoLivre = $existing.linkMercadoLivre
  linkAmazon = $existing.linkAmazon
  precoMercadoLivre = $existing.precoMercadoLivre
  precoAmazon = $existing.precoAmazon
}
$toggleBody = $toggleBodyObj | ConvertTo-Json -Depth 6
$upd = Invoke-RestMethod -Uri ($Base + "/api/vendors/products/" + $productId) -Method Put -ContentType "application/json" -Body $toggleBody -WebSession $sess
($upd | ConvertTo-Json -Depth 6) | Write-Output

Write-Host "Listando produtos do vendedor..."
$mine = Invoke-RestMethod -Uri ($Base + "/api/vendors/products/me") -Method Get -WebSession $sess
($mine | ConvertTo-Json -Depth 6) | Write-Output
