<?php
error_reporting(E_ALL & ~E_DEPRECATED);
require_once __DIR__ . '/../includes/session.php';
requireAuthAPI();
verifyCsrfToken();

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['message']) || !isset($input['roster'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Ontbrekende data']);
    exit;
}

$apiKey = defined('ANTHROPIC_API_KEY') ? ANTHROPIC_API_KEY : '';
if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'API key niet geconfigureerd']);
    exit;
}

$message = trim($input['message']);
$roster = $input['roster'];
$month = $input['month'] ?? '';
$slots = $input['slots'] ?? ['Morning', 'Noon', 'Kids', 'Fundamentals', 'Evening 1', 'Evening 2'];
$allCoaches = $input['allCoaches'] ?? [];
$allBalie = $input['allBalie'] ?? [];
$history = $input['history'] ?? [];

// Build a date->weekday mapping for the month
$dateMap = [];
if (preg_match('/^(\d{4})-(\d{2})$/', $month, $m)) {
    $year = (int)$m[1];
    $mon = (int)$m[2];
    $daysInMonth = cal_days_in_month(CAL_GREGORIAN, $mon, $year);
    $dayNames = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
    for ($d = 1; $d <= $daysInMonth; $d++) {
        $date = sprintf('%04d-%02d-%02d', $year, $mon, $d);
        $dow = (int)date('w', mktime(0, 0, 0, $mon, $d, $year));
        $dateMap[$date] = $dayNames[$dow];
    }
}
$dateMapStr = '';
foreach ($dateMap as $date => $day) {
    $dateMapStr .= "$date = $day\n";
}

// Build system prompt
$coachesJson = json_encode($roster['coaches'] ?? [], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
$balieJson = json_encode($roster['balie'] ?? [], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
$allCoachesStr = implode(', ', $allCoaches);
$allBalieStr = implode(', ', $allBalie);
$slotsStr = implode(', ', $slots);

$systemPrompt = <<<PROMPT
Je bent een slimme rooster-assistent voor Haven BJJ, een Brazilian Jiu-Jitsu sportschool. Je helpt het maandrooster aan te passen op basis van instructies in het Nederlands.

## Maand: {$month}

## Datum → weekdag overzicht
{$dateMapStr}

## Beschikbare coaches
{$allCoachesStr}

## Beschikbare balie medewerkers
{$allBalieStr}

## Tijdslots (coaches)
{$slotsStr}

Wat de slots betekenen:
- Morning: ochtendtraining (meestal 1 coach)
- Noon: middagtraining (meestal 1 coach)
- Kids: kinderles (kan meerdere coaches zijn, gescheiden door " & " of ", ")
- Fundamentals: beginners BJJ les
- Evening 1: eerste avondles — de hoofd BJJ of Grappling les
- Evening 2: tweede avondles — de vervolgles na Evening 1 (niet elke dag bezet)

## Werkdagen
- Coaches: maandag t/m zaterdag
- Balie: maandag t/m vrijdag + zondag (geen zaterdag)

## Huidig coaches rooster
{$coachesJson}

## Huidig balie rooster
{$balieJson}

## Instructies

Je krijgt een bericht van de gebruiker. Dit kan zijn:
1. Een wijzigingsinstructie ("Daniel geeft elke dinsdag Evening 1")
2. Een vraag over het rooster ("Wie geeft er woensdag les?")
3. Een undo-verzoek ("maak dat ongedaan", "ga terug")

### Bij een WIJZIGING:
Analyseer welke cellen moeten veranderen. Denk stap voor stap:
- "elke dinsdag" = alle dinsdagen in de maand
- "op 7 en 14 april" = alleen die specifieke datums
- "de hele maand" = alle relevante dagen
- "dinsdag en donderdag" = alle dinsdagen EN donderdagen

Antwoord met dit JSON formaat:
{
  "message": "Korte uitleg in het Nederlands",
  "changes": {
    "coaches": {
      "YYYY-MM-DD": { "Slot": "Naam" }
    },
    "balie": {
      "YYYY-MM-DD": "Naam"
    }
  }
}

### Bij een VRAAG (geen wijziging nodig):
{
  "message": "Je antwoord hier",
  "changes": null
}

### Bij UNDO:
Dit kun je NIET doen — antwoord:
{
  "message": "Ik kan helaas niet ongedaan maken. Gebruik de knop 'Laden uit Notion' om het originele rooster opnieuw te laden, of pas de specifieke cellen handmatig aan.",
  "changes": null
}

## REGELS
- Antwoord ALLEEN met een geldig JSON object — geen markdown, geen backticks, geen extra tekst.
- "changes" bevat ALLEEN gewijzigde cellen, niet het hele rooster.
- Gebruik EXACTE namen: {$allCoachesStr}
- Gebruik EXACTE slot namen: {$slotsStr}
- Lege coaches/balie changes = leeg object {}
- Wees slim: als iemand zegt "Daniel geeft dinsdag en donderdag avondles", bedoelen ze Evening 1.
- Als er "en daarna" of "de les erna" wordt gezegd, is dat Evening 2.
- "BJJ les" of "avondles" = Evening 1. "Grappling les" kan ook Evening 1 zijn.
- Bij onduidelijkheid: vraag om verduidelijking in het message veld, met changes: null.
PROMPT;

// Build messages array with conversation history
$messages = [];
foreach ($history as $msg) {
    $messages[] = ['role' => $msg['role'], 'content' => $msg['content']];
}
$messages[] = ['role' => 'user', 'content' => $message];

// Call Anthropic API
$payload = [
    'model' => 'claude-sonnet-4-20250514',
    'max_tokens' => 4096,
    'temperature' => 0.2,
    'system' => $systemPrompt,
    'messages' => $messages
];

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01'
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_TIMEOUT => 60,
    CURLOPT_CONNECTTIMEOUT => 10
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);

if ($curlError) {
    http_response_code(502);
    echo json_encode(['error' => 'Verbindingsfout: ' . $curlError]);
    exit;
}

if ($httpCode !== 200) {
    $errBody = json_decode($response, true);
    $errMsg = $errBody['error']['message'] ?? 'AI fout ' . $httpCode;
    http_response_code(502);
    echo json_encode(['error' => $errMsg]);
    exit;
}

$apiResult = json_decode($response, true);
if (!$apiResult || empty($apiResult['content'][0]['text'])) {
    http_response_code(502);
    echo json_encode(['error' => 'Ongeldig antwoord van AI']);
    exit;
}

$aiText = trim($apiResult['content'][0]['text']);

// Strip markdown code fences if present
if (preg_match('/^```(?:json)?\s*\n?(.*?)\n?\s*```$/s', $aiText, $matches)) {
    $aiText = trim($matches[1]);
}

// Parse JSON
$aiData = json_decode($aiText, true);
if (!$aiData || !isset($aiData['message'])) {
    // Try to extract JSON from mixed text
    if (preg_match('/\{[\s\S]*\}/', $aiText, $matches)) {
        $aiData = json_decode($matches[0], true);
    }
    if (!$aiData || !isset($aiData['message'])) {
        echo json_encode([
            'message' => 'Ik kon het antwoord niet verwerken. Probeer je vraag anders te formuleren.',
            'changes' => null
        ]);
        exit;
    }
}

echo json_encode([
    'message' => $aiData['message'],
    'changes' => $aiData['changes'] ?? null
], JSON_UNESCAPED_UNICODE);
