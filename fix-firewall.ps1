# 방화벽 포트 5000 인바운드 규칙 추가 스크립트
# 회사 내부망에서 다른 PC의 접속을 허용하기 위한 설정
# 관리자 권한으로 실행해야 합니다.

Write-Host "방화벽 규칙 확인 중..." -ForegroundColor Yellow

# 기존 규칙 확인
$existingRule = Get-NetFirewallRule -DisplayName "Node.js Server Port 5000" -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "이미 'Node.js Server Port 5000' 규칙이 존재합니다." -ForegroundColor Green
    $existingRule | Format-Table DisplayName, Enabled, Direction, Action
} else {
    Write-Host "기존 규칙이 없습니다. 새 규칙을 추가합니다..." -ForegroundColor Yellow
    
    # 인바운드 규칙 추가
    New-NetFirewallRule -DisplayName "Node.js Server Port 5000" `
        -Direction Inbound `
        -LocalPort 5000 `
        -Protocol TCP `
        -Action Allow `
        -Enabled True `
        -Profile Any
    
    if ($?) {
        Write-Host "방화벽 규칙이 성공적으로 추가되었습니다!" -ForegroundColor Green
        Write-Host "이제 회사 내부망의 다른 PC에서 http://172.17.6.238:5000 으로 접속할 수 있습니다." -ForegroundColor Green
        Write-Host "`n참고: 도메인, 개인, 공용 프로필 모두에 규칙이 적용되었습니다." -ForegroundColor Cyan
    } else {
        Write-Host "방화벽 규칙 추가에 실패했습니다. 관리자 권한으로 실행했는지 확인하세요." -ForegroundColor Red
    }
}

# 현재 포트 5000 관련 규칙 확인
Write-Host "`n포트 5000 관련 모든 방화벽 규칙:" -ForegroundColor Cyan
Get-NetFirewallRule | Where-Object { 
    $portFilter = Get-NetFirewallPortFilter -AssociatedNetFirewallRule $_
    $portFilter.LocalPort -eq 5000 -or $portFilter.LocalPort -like "*5000*"
} | Format-Table DisplayName, Enabled, Direction, Action -AutoSize

Write-Host "`n완료!" -ForegroundColor Green

