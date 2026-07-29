<?php

if ($_GET['action'] == "WhatsAppCallback") {
    if (empty($_POST)) {
        $raw_input = file_get_contents("php://input");
        $_POST = json_decode($raw_input, true);
    }

    if (isset($_GET['hub_verify_token'])) {
        if ($_GET['hub_verify_token'] == "abcdefghijklmnopqrstuvwxyz") {
            echo $_GET['hub_challenge'];
            exit;
        } else {
            $error = "Token Mismatch";
        }
    }

    echo "OK: " . time();
}