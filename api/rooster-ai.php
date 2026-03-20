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

// Build system prompt
$coachesJson = json_encode($roster['coaches'] ?? [], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
$balieJson = json_encode($roster['balie'] ?? [], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
$allCoachesStr = implode(', ', $allCoaches);
$allBalieStr = implode(', ', $allBalie);
$slotsStr = implode(', ', $slots);

$systemPrompt = <<<PROMPT
Je bent een assistent die helpt bij het aanpassen van het lesrooster van een BJJ (Brazilian Jiu-Jitsu) sportschool genaamd Haven BJJ.

## Huidige maand
{$month}

## Beschikbare coaches
{$allCoachesStr}

## Beschikbare balie medewerkers
{$allBalieStr}

## Slot namen (tijdslots per dag voor coaches)
{$slotsStr}

Uitleg slots:
- Morning: ochtendtraining
- Noon: middagtraining
- Kids: kinderles
- Fundamentals: beginners/fundamentals les
- Evening 1: eerste avondles (meestal de hoofd BJJ of Grappling les)
- Evening 2: tweede avondles (meestal de vervolgles na Evening 1)

## Dagen
- Coaches rooster: maandag t/m zaterdag (ma, di, wo, do, vr, za)
- Balie rooster: maandag t/m vrijdag + zondag (ma, di, wo, do, vr, zo)

## Datumformaat
Gebruik YYYY-MM-DD formaat voor alle datums (bijv. 2026-04-07 voor 7 april 2026).

## Huidig coaches rooster
{$coachesJson}

## Huidig balie rooster
{$balieJson}

## Jouw taak
De gebruiker geeft een instructie in het Nederlands over wijzigingen in het rooster. Pas het rooster aan volgens de instructie.

## BELANGRIJK: Antwoordformaat
Je MOET antwoorden met ALLEEN een geldig JSON object in exact dit formaat, zonder markdown codeblokken of andere tekst:

{
  "message": "Uitleg in het Nederlands van wat je hebt gewijzigd",
  "changes": {
    "coaches": {
      "YYYY-MM-DD": {
        "Slot naam": "Coach naam"
      }
    },
    "balie": {
      "YYYY-MM-DD": "Naam"
    }
  }
}

Regels:
- Het "changes" object bevat ALLEEN de gewijzigde cellen, niet het hele rooster.
- Als er geen coaches wijzigingen zijn, gebruik een leeg object: "coaches": {}
- Als er geen balie wijzigingen zijn, gebruik een leeg object: "balie": {}
- Gebruik exacte namen uit de beschikbare coaches/balie lijsten.
- Gebruik exacte slot namen: Morning, Noon, Kids, Fundamentals, Evening 1, Evening 2
- De "message" moet in het Nederlands zijn en kort uitleggen wat er is gewijzigd.
- Als de instructie onduidelijk is of niet uitgevoerd kan worden, geef dan een leeg changes object en leg uit waarom in het message veld.
- Retourneer ALLEEN het JSON object, geen andere tekst of formatting.
PROMPT;

// Call Anthropic API
$payload = [
    'model' => 'claude-sonnet-4-20250514',
    'max_tokens' => 4096,
    'temperature' => 0.3,
    'system' => $systemPrompt,
    'messages' => [
        ['role' => 'user', 'content' => $message]
    ]
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
curl_close($ch);

if ($curlError) {
    http_response_code(502);
    echo json_encode(['error' => 'Verbindingsfout met AI service: ' . $curlError]);
    exit;
}

if ($httpCode !== 200) {
    http_response_code(502);
    $errBody = json_decode($response, true);
    $errMsg = $errBody['error']['message'] ?? 'AI service gaf fout ' . $httpCode;
    echo json_encode(['error' => $errMsg]);
    exit;
}

$apiResult = json_decode($response, true);
if (!$apiResult || empty($apiResult['content'][0]['text'])) {
    http_response_code(502);
    echo json_encode(['error' => 'Ongeldig antwoord van AI service']);
    exit;
}

$aiText = trim($apiResult['content'][0]['text']);

// Strip markdown code fences if present
if (preg_match('/^```(?:json)?\s*\n?(.*?)\n?\s*```$/s', $aiText, $m)) {
    $aiText = trim($m[1]);
}

// Parse JSON response from Claude
$aiData = json_decode($aiText, true);
if (!$aiData || !isset($aiData['message'])) {
    // Try to extract JSON from the response if it has extra text
    if (preg_match('/\{[\s\S]*\}/', $aiText, $matches)) {
        $aiData = json_decode($matches[0], true);
    }
    if (!$aiData || !isset($aiData['message'])) {
        http_response_code(200);
        echo json_encode([
            'message' => 'Ik kon het antwoord niet verwerken. Probeer je vraag anders te formuleren.',
            'changes' => null
        ]);
        exit;
    }
}

// Return the structured response
echo json_encode([
    'message' => $aiData['message'],
    'changes' => $aiData['changes'] ?? null
], JSON_UNESCAPED_UNICODE);
