<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/control_security.php';

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $userName = trim((string) ($_POST['user_name'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');

    if ($userName === '' || $password === '') {
        $error = 'Enter your username and password.';
    } else {
        try {
            $response = supabase_request(
                'GET',
                'users?user_name=eq.' . rawurlencode($userName) . '&select=id,name,user_name,password&limit=1'
            );

            $user = $response['data'][0] ?? null;

            if (!$user || !password_verify($password, (string) ($user['password'] ?? ''))) {
                $error = 'Invalid username or password.';
            } else {
                $_SESSION['user_id'] = (int) $user['id'];
                $_SESSION['user_name'] = (string) $user['user_name'];
                $_SESSION['name'] = (string) $user['name'];

                supabase_request(
                    'PATCH',
                    'users?id=eq.' . (int) $user['id'],
                    ['last_logged_in' => gmdate('c')]
                );

                header('Location: index.php');
                exit;
            }
        } catch (Throwable $e) {
            $error = 'Could not sign in. Try again.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign in · justText</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --ink: #1a2421;
      --muted: #5c6b66;
      --line: #d5ddd8;
      --paper: #f7faf8;
      --field: #ffffff;
      --accent: #1f6b57;
      --accent-hover: #185445;
      --danger: #9b2c2c;
      --danger-bg: #fdf2f2;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 1.5rem;
      font-family: "Manrope", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(ellipse 80% 60% at 10% 20%, #dceee6 0%, transparent 55%),
        radial-gradient(ellipse 70% 50% at 90% 80%, #e8ebe4 0%, transparent 50%),
        linear-gradient(160deg, #eef4f0 0%, #f7faf8 45%, #e9efe9 100%);
    }

    .shell {
      width: min(100%, 22rem);
    }

    .brand {
      font-family: "Fraunces", serif;
      font-size: 1.75rem;
      font-weight: 600;
      letter-spacing: -0.03em;
      margin: 0 0 0.35rem;
    }

    .lede {
      margin: 0 0 1.75rem;
      color: var(--muted);
      font-size: 0.95rem;
      line-height: 1.45;
    }

    form {
      display: grid;
      gap: 1rem;
    }

    label {
      display: grid;
      gap: 0.4rem;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      color: var(--muted);
    }

    input {
      width: 100%;
      padding: 0.75rem 0.85rem;
      border: 1px solid var(--line);
      border-radius: 0.55rem;
      background: var(--field);
      color: var(--ink);
      font: inherit;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(31, 107, 87, 0.15);
    }

    button {
      margin-top: 0.35rem;
      padding: 0.8rem 1rem;
      border: 0;
      border-radius: 0.55rem;
      background: var(--accent);
      color: #fff;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.1s ease;
    }

    button:hover { background: var(--accent-hover); }
    button:active { transform: translateY(1px); }

    .error {
      margin: 0 0 1rem;
      padding: 0.7rem 0.85rem;
      border-radius: 0.55rem;
      background: var(--danger-bg);
      color: var(--danger);
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <main class="shell">
    <h1 class="brand">justText</h1>
    <p class="lede">Sign in to continue.</p>

    <?php if ($error !== ''): ?>
      <p class="error"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p>
    <?php endif; ?>

    <form method="post" action="" autocomplete="on">
      <label>
        Username
        <input type="text" name="user_name" required autofocus
               value="<?= htmlspecialchars((string) ($_POST['user_name'] ?? ''), ENT_QUOTES, 'UTF-8') ?>">
      </label>
      <label>
        Password
        <input type="password" name="password" required>
      </label>
      <button type="submit">Sign in</button>
    </form>
  </main>
</body>
</html>
