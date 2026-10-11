# Cấu hình gửi email cho LIFELY: ghi các dòng MAIL_* vào file .env.
# Mật khẩu ứng dụng chỉ được nhập lúc chạy, không nằm trong mã nguồn và không bị đưa lên GitHub.
$ErrorActionPreference = 'Stop'
$envFile = Join-Path $PSScriptRoot '.env'
$example = Join-Path $PSScriptRoot '.env.example'

if (-not (Test-Path $envFile)) {
    if (Test-Path $example) {
        Copy-Item $example $envFile
        Write-Host 'Đã tạo .env từ .env.example'
    } else {
        throw 'Không tìm thấy .env hoặc .env.example trong thư mục này.'
    }
}

$defaultUser = 'nguyentrannhungoc260@gmail.com'
$user = Read-Host "Gmail dùng để gửi, phải là Gmail đã tạo mật khẩu ứng dụng (Enter = $defaultUser)"
if ([string]::IsNullOrWhiteSpace($user)) { $user = $defaultUser }
$user = $user.Trim()

$secure = Read-Host 'Dán mật khẩu ứng dụng 16 ký tự (sẽ không hiện ra màn hình)' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $pass = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
$pass = $pass -replace '\s', ''
if ($pass.Length -ne 16) {
    throw "Mật khẩu ứng dụng phải đủ 16 ký tự (đang có $($pass.Length)). Hãy copy lại cho đúng."
}

$admin = Read-Host "Gmail nhận thông báo của admin (Enter = $user)"
if ([string]::IsNullOrWhiteSpace($admin)) { $admin = $user }
$admin = $admin.Trim()

function Set-EnvVar([string]$text, [string]$name, [string]$value) {
    $pattern = "(?m)^$name=[^\r\n]*"
    if ([regex]::IsMatch($text, $pattern)) {
        return [regex]::Replace($text, $pattern, "$name=$value")
    }
    return $text.TrimEnd() + "`r`n$name=$value`r`n"
}

$text = [IO.File]::ReadAllText($envFile, [Text.Encoding]::UTF8)
$text = Set-EnvVar $text 'MAIL_ENABLED' 'true'
$text = Set-EnvVar $text 'MAIL_USERNAME' $user
$text = Set-EnvVar $text 'MAIL_PASSWORD' $pass
$text = Set-EnvVar $text 'ADMIN_NOTIFY_EMAIL' $admin
[IO.File]::WriteAllText($envFile, $text, (New-Object Text.UTF8Encoding($false)))

Write-Host ''
Write-Host "Xong. Đã ghi cấu hình gửi email vào $envFile"
Write-Host 'Bây giờ tắt backend (Ctrl + C) rồi chạy lại: mvn spring-boot:run'
Write-Host 'Trong terminal phải thấy dòng: Email: ĐÃ BẬT, gửi từ ...'
