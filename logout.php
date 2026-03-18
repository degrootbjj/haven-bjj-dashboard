<?php
require_once __DIR__ . '/includes/session.php';
logout();
header('Location: login.php');
exit;
