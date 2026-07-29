<?php

declare(strict_types=1);

$envPath = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';
if (is_readable($envPath)) {
    foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$name, $value] = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        $_ENV[$name] = $value;
        putenv($name . '=' . $value);
    }
}

function env_value(string $key): string
{
    $value = $_ENV[$key] ?? getenv($key);
    return is_string($value) ? $value : '';
}

function supabase_request(string $method, string $path, ?array $body = null, array $extraHeaders = []): array
{
    $base = rtrim(env_value('SUPABASE_URL'), '/');
    $key = env_value('SUPABASE_SERVICE_ROLE_KEY');

    if ($base === '' || $key === '') {
        throw new RuntimeException('Supabase credentials are missing.');
    }

    $url = $base . '/rest/v1/' . ltrim($path, '/');
    $headers = array_merge([
        'apikey: ' . $key,
        'Authorization: Bearer ' . $key,
        'Content-Type: application/json',
        'Prefer: return=representation',
    ], $extraHeaders);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 20,
    ]);

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }

    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($raw === false) {
        throw new RuntimeException('Supabase request failed: ' . $error);
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        $decoded = [];
    }

    return ['status' => $status, 'data' => $decoded];
}
