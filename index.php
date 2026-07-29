<?php

declare(strict_types=1);

require_once __DIR__ . '/control_security.php';

$name = htmlspecialchars((string) ($_SESSION['name'] ?? 'User'), ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>justText</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Manrope:wght@400;500&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: "Manrope", sans-serif;
      color: #1a2421;
      background:
        radial-gradient(ellipse 80% 60% at 10% 20%, #dceee6 0%, transparent 55%),
        linear-gradient(160deg, #eef4f0 0%, #f7faf8 100%);
    }
    h1 {
      font-family: "Fraunces", serif;
      font-weight: 600;
      letter-spacing: -0.03em;
      margin: 0 0 0.4rem;
    }
    p { margin: 0; color: #5c6b66; }
  </style>
</head>
<body>
  <main>
    <h1>justText</h1>
    <p>Signed in as <?= $name ?>.</p>
  </main>
</body>
</html>
