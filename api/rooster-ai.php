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
$month = $input['month'] ?? '';
$slots = $input['slots'] ?? ['Morning', 'Noon', 'Kids', 'Fundamentals', 'Evening 1', 'Evening 2'];
$allCoaches = $input['allCoaches'] ?? [];
$allBalie = $input['allBalie'] ?? [];
$history = $input['history'] ?? [];
$weekdaySummary = $input['weekdaySummary'] ?? '';

$allCoachesStr = implode(', ', $allCoaches);
$allBalieStr = implode(', ', $allBalie);
$slotsStr = implode(', ', $slots);

$systemPrompt = <<<PROMPT
Je bent een rooster-assistent voor Haven BJJ (Brazilian Jiu-Jitsu sportschool).

## Maand: {$month}

## Beschikbare coaches
{$allCoachesStr}

## Beschikbare balie medewerkers
{$allBalieStr}

## Tijdslots (coaches)
{$slotsStr}

Betekenis:
- Morning = ochtendtraining
- Noon = middagtraining
- Kids = kinderles
- Fundamentals = beginners les
- Evening 1 = eerste avondles (hoofd BJJ/Grappling les)
- Evening 2 = tweede avondles (vervolgles, niet elke dag)

## Huidige standaard verdeling per weekdag
{$weekdaySummary}

## Werkdagen
- Coaches: maandag t/m zaterdag
- Balie: maandag t/m vrijdag + zondag

## BELANGRIJK: Hoe je antwoordt

Je antwoordt ALLEEN met een JSON object. GEEN markdown, GEEN backticks, GEEN uitleg buiten de JSON.

### Bij een WIJZIGING:

Gebruik WEEKDAGEN (niet datums). Het systeem vertaalt dit automatisch naar alle juiste datums.

Format:
{
  "message": "Uitleg wat je hebt gewijzigd",
  "changes": [
    {
      "type": "coaches",
      "days": ["maandag", "dinsdag"],
      "slot": "Evening 1",
      "name": "Daniel",
      "scope": "all"
    }
  ]
}

Elke change heeft:
- "type": "coaches" of "balie"
- "days": array van weekdagen: "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"
- "slot": alleen bij type "coaches" — een van: {$slotsStr}
- "name": exacte naam uit de beschikbare lijst, of "" om leeg te maken
- "scope": "all" (hele maand) of "specific"
- "dates": alleen bij scope "specific" — array van dagnummers, bijv. [7, 14, 21]

### Voorbeelden:

Instructie: "Daniel geeft elke dinsdag en donderdag Evening 1"
{
  "message": "Daniel ingepland voor Evening 1 op alle dinsdagen en donderdagen.",
  "changes": [
    { "type": "coaches", "days": ["dinsdag", "donderdag"], "slot": "Evening 1", "name": "Daniel", "scope": "all" }
  ]
}

Instructie: "Daniel geeft dinsdag en donderdag Evening 1, Joran geeft daarna Evening 2"
{
  "message": "Daniel op Evening 1 en Joran op Evening 2, alle dinsdagen en donderdagen.",
  "changes": [
    { "type": "coaches", "days": ["dinsdag", "donderdag"], "slot": "Evening 1", "name": "Daniel", "scope": "all" },
    { "type": "coaches", "days": ["dinsdag", "donderdag"], "slot": "Evening 2", "name": "Joran", "scope": "all" }
  ]
}

Instructie: "Milou werkt maandag en woensdag aan de balie"
{
  "message": "Milou ingepland voor balie op maandag en woensdag.",
  "changes": [
    { "type": "balie", "days": ["maandag", "woensdag"], "name": "Milou", "scope": "all" }
  ]
}

Instructie: "Op 7 en 14 april geeft Kamen de Morning"
{
  "message": "Kamen ingepland voor Morning op 7 en 14 april.",
  "changes": [
    { "type": "coaches", "days": [], "slot": "Morning", "name": "Kamen", "scope": "specific", "dates": [7, 14] }
  ]
}

### Bij een VRAAG (geen wijziging):
{
  "message": "Je antwoord",
  "changes": []
}

### Bij onduidelijke instructie:
{
  "message": "Kun je verduidelijken? Bedoel je ... of ...?",
  "changes": []
}

## REGELS
- ALLEEN geldig JSON teruggeven
- Gebruik EXACTE namen uit de lijsten hierboven
- Gebruik EXACTE slot namen
- "avondles" / "BJJ les" = Evening 1
- "les erna" / "daarna" / "tweede les" = Evening 2
- Bij "de hele maand" of "elke [weekdag]" → scope: "all"
- Bij specifieke datums → scope: "specific" met dates array
PROMPT;

// Build messages with history
$messages = [];
foreach ($history as $msg) {
    $messages[] = ['role' => $msg['role'], 'content' => $msg['content']];
}
$messages[] = ['role' => 'user', 'content' => $message];

$payload = [
    'model' => 'claude-sonnet-4-20250514',
    'max_tokens' => 2048,
    'temperature' => 0.1,
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

// Strip markdown code fences
if (preg_match('/```(?:json)?\s*\n?(.*?)\n?\s*```/s', $aiText, $m)) {
    $aiText = trim($m[1]);
}

$aiData = json_decode($aiText, true);
if (!$aiData || !isset($aiData['message'])) {
    if (preg_match('/\{[\s\S]*\}/', $aiText, $matches)) {
        $aiData = json_decode($matches[0], true);
    }
    if (!$aiData || !isset($aiData['message'])) {
        echo json_encode([
            'message' => 'Ik kon het antwoord niet verwerken. Probeer het anders te formuleren.',
            'changes' => []
        ]);
        exit;
    }
}

echo json_encode([
    'message' => $aiData['message'],
    'changes' => $aiData['changes'] ?? []
], JSON_UNESCAPED_UNICODE);
