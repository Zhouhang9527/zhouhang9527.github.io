$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    throw '未找到 ssh 命令。请先确认 Windows OpenSSH Client 已安装。'
}
if (-not (Get-Command curl.exe -ErrorAction SilentlyContinue)) {
    throw '未找到 curl.exe，无法完成更新后的播放验证。'
}

$secureCookie = Read-Host '粘贴 MUSIC_U 的值或完整 Cookie 请求头（输入不会显示）' -AsSecureString
$cookiePointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureCookie)

try {
    $cookieValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($cookiePointer).Trim()
    if ([string]::IsNullOrWhiteSpace($cookieValue)) {
        throw 'MUSIC_U 不能为空。'
    }
    if ($cookieValue.Contains("`r") -or $cookieValue.Contains("`n")) {
        throw 'MUSIC_U 必须是单行内容。'
    }

    $hasMusicU = [regex]::IsMatch($cookieValue, '(^|;\s*)MUSIC_U=')
    $cookieLine = if ($hasMusicU) {
        $cookieValue
    } else {
        "MUSIC_U=$cookieValue"
    }

    $remoteCommand = 'umask 077; mkdir -p /home/deploy/.secrets; IFS= read -r cookie; printf "%s\n" "$cookie" > /home/deploy/.secrets/netease-cookie; unset cookie; chmod 600 /home/deploy/.secrets/netease-cookie; test -s /home/deploy/.secrets/netease-cookie'
    $cookieLine | & ssh aliyun-blog $remoteCommand
    if ($LASTEXITCODE -ne 0) {
        throw "SSH 写入失败，退出码：$LASTEXITCODE"
    }

    Write-Host 'Cookie 已安全写入，正在验证音频长度……'
    $testUrl = 'https://meting.mm9527.top/api?server=netease&type=url&id=26082347'
    $headers = & curl.exe -sS -L -r 0-0 -D - -o NUL $testUrl 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "接口验证失败，curl 退出码：$LASTEXITCODE"
    }

    $match = [regex]::Match(($headers -join "`n"), '(?im)^Content-Range:\s*bytes\s+\d+-\d+/(\d+)')
    if (-not $match.Success) {
        throw '接口可访问，但没有返回 Content-Range，无法确认音频长度。'
    }

    $totalBytes = [int64]$match.Groups[1].Value
    Write-Host ("测试音频大小：{0:N0} bytes" -f $totalBytes)
    if ($totalBytes -gt 1000000) {
        Write-Host '验证通过：测试歌曲已不是 45 秒试听文件。' -ForegroundColor Green
    } else {
        Write-Warning 'Cookie 已写入，但测试歌曲仍返回试听文件。请确认 Cookie 有效且账号拥有播放权限。'
        exit 2
    }
} finally {
    if ($cookiePointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($cookiePointer)
    }
    $cookieValue = $null
    $cookieLine = $null
}
