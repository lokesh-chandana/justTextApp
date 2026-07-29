<?php

declare(strict_types=1);

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

$script = basename((string) ($_SERVER['SCRIPT_NAME'] ?? ''));

if (empty($_SESSION['user_id'])) {
    if ($script !== 'login.php') {
        header('Location: login.php');
        exit;
    }
} else {
    if ($script === 'login.php') {
        header('Location: index.php');
        exit;
    }
}
