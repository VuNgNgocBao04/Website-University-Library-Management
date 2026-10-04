function Test-LocalPort([int]$Port) {
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $connected = $client.ConnectAsync('127.0.0.1', $Port).Wait(1000)
    return $connected -and $client.Connected
  } catch { return $false } finally { $client.Dispose() }
}
