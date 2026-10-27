$base = 'https://www.caninelogy.online'
$ts   = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$email = "e2e-test-$ts@caninelogy-test.invalid"
$pass1 = 'TestPass1!'
$pass2 = 'TestPass2!'
$results = [System.Collections.Generic.List[object]]::new()

function Chk($label, $ok, $detail) {
    $results.Add([pscustomobject]@{
        Test   = $label
        Pass   = if ($ok) { 'PASS' } else { 'FAIL' }
        Detail = $detail
    })
}

$jar = [System.Net.CookieContainer]::new()

function DoReq($method, $path, $bodyObj, $origin = '') {
    $req = [System.Net.HttpWebRequest]::Create("$base$path")
    $req.Method = $method
    $req.CookieContainer = $jar
    $req.AllowAutoRedirect = $false
    if ($origin) { $req.Headers.Add('Origin', $origin) }
    if ($null -ne $bodyObj) {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes(($bodyObj | ConvertTo-Json -Compress))
        $req.ContentType = 'application/json'
        $req.ContentLength = $bytes.Length
        $s = $req.GetRequestStream(); $s.Write($bytes, 0, $bytes.Length); $s.Close()
    } else { $req.ContentLength = 0 }
    try {
        $resp = $req.GetResponse()
        $sr = [System.IO.StreamReader]::new($resp.GetResponseStream())
        $b = $sr.ReadToEnd(); $sr.Close()
        [pscustomobject]@{ Status = [int]$resp.StatusCode; Body = $b }
    } catch [System.Net.WebException] {
        $resp = $_.Exception.Response
        if ($resp) {
            $sr = [System.IO.StreamReader]::new($resp.GetResponseStream())
            $b = $sr.ReadToEnd(); $sr.Close()
            [pscustomobject]@{ Status = [int]$resp.StatusCode; Body = $b }
        } else { [pscustomobject]@{ Status = 0; Body = $_.Exception.Message } }

Write-Output "Target : $base"
Write-Output "Account: $email"
Write-Output ""

$r = DoReq 'GET' '/api/auth/session' $null
Chk '01. GET /api/auth/session unauthenticated -> 401' ($r.Status -eq 401) "Status=$($r.Status)"

$r = DoReq 'POST' '/api/auth/register' @{name='E2E Test';email=$email;password=$pass1;workspaceName='E2E Workspace'}
Chk '02. POST /api/auth/register -> 201' ($r.Status -eq 201) "Status=$($r.Status) Body=$($r.Body)"

$r = DoReq 'GET' '/api/auth/session' $null
$sess = $r.Body | ConvertFrom-Json -ErrorAction SilentlyContinue
Chk '03. GET /api/auth/session after register -> 200 owner' ($r.Status -eq 200 -and $sess.data.user.email -eq $email -and $sess.data.role -eq 'owner') "Status=$($r.Status) email=$($sess.data.user.email) role=$($sess.data.role)"

$r = DoReq 'POST' '/api/auth/logout' $null
Chk '04. POST /api/auth/logout -> 200' ($r.Status -eq 200) "Status=$($r.Status)"

$r = DoReq 'GET' '/api/auth/session' $null
Chk '05. GET /api/auth/session after logout -> 401' ($r.Status -eq 401) "Status=$($r.Status)"

$r = DoReq 'POST' '/api/auth/login' @{email=$email;password='WrongPass!'}
Chk '06. POST /api/auth/login wrong password -> 401' ($r.Status -eq 401) "Status=$($r.Status) Body=$($r.Body)"

$r = DoReq 'POST' '/api/auth/login' @{email=$email;password=$pass1}
Chk '07. POST /api/auth/login correct -> 200' ($r.Status -eq 200) "Status=$($r.Status)"

$r = DoReq 'GET' '/api/auth/session' $null
$sess2 = $r.Body | ConvertFrom-Json -ErrorAction SilentlyContinue
Chk '08. GET /api/auth/session after login -> 200 owner' ($r.Status -eq 200 -and $sess2.data.role -eq 'owner') "Status=$($r.Status) role=$($sess2.data.role) workspace=$($sess2.data.workspace.name)"

$r = DoReq 'POST' '/api/auth/register' @{name='Dup';email=$email;password=$pass1}
Chk '09. POST /api/auth/register duplicate -> 409' ($r.Status -eq 409) "Status=$($r.Status)"

$r = DoReq 'POST' '/api/auth/register' @{name='';email='bad';password='x'}
Chk '10. POST /api/auth/register bad fields -> 400' ($r.Status -eq 400) "Status=$($r.Status)"

$r = DoReq 'POST' '/api/auth/forgot-password' @{email=$email}
Chk '11. POST /api/auth/forgot-password valid email -> 200 or 503' ($r.Status -in @(200,503)) "Status=$($r.Status) Body=$($r.Body)"

$r = DoReq 'POST' '/api/auth/forgot-password' @{email='notanemail'}
Chk '12. POST /api/auth/forgot-password bad email -> 400' ($r.Status -eq 400) "Status=$($r.Status)"

$r = DoReq 'POST' '/api/auth/forgot-password' @{email='nobody@caninelogy-test.invalid'}
Chk '13. POST /api/auth/forgot-password unknown email -> 200 no enumeration' ($r.Status -eq 200) "Status=$($r.Status)"

$r = DoReq 'POST' '/api/auth/reset-password' @{token='badtoken';password=$pass2}
Chk '14. POST /api/auth/reset-password bad token -> 400' ($r.Status -eq 400) "Status=$($r.Status)"

$r = DoReq 'POST' '/api/auth/reset-password' @{token='anytoken';password='abc'}
Chk '15. POST /api/auth/reset-password short password -> 400' ($r.Status -eq 400) "Status=$($r.Status)"

$r = DoReq 'POST' '/api/auth/developer-reset' @{action='verify';secret='wrongsecret'}
Chk '16. POST /api/auth/developer-reset wrong secret -> 403' ($r.Status -eq 403) "Status=$($r.Status)"

$r = DoReq 'POST' '/api/auth/developer-reset' @{action='verify';secret=''}
Chk '17. POST /api/auth/developer-reset empty secret -> 403 or 503' ($r.Status -in @(403,503)) "Status=$($r.Status)"

$r = DoReq 'POST' '/api/auth/logout' $null 'https://evil.example.com'
Chk '18. Cross-origin POST CSRF -> 403' ($r.Status -eq 403) "Status=$($r.Status)"

$pass = ($results | Where-Object { $_.Pass -eq 'PASS' }).Count
$fail = ($results | Where-Object { $_.Pass -eq 'FAIL' }).Count
$results | Format-Table -AutoSize
Write-Output "TOTAL: $pass PASS  /  $fail FAIL"

    }
}
