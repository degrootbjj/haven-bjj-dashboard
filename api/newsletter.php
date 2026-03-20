<?php
// Haven BJJ Dashboard — Newsletter API (Mailchimp + Claude)
// GET  ?action=fetch       → fetch latest NL campaign + HTML
// POST ?action=spellcheck  → spellcheck Dutch HTML via Claude
// POST ?action=translate   → translate to English via Claude
// POST ?action=create      → create NL + EN campaigns in Mailchimp
// POST ?action=upload      → upload image to Mailchimp File Manager

error_reporting(E_ALL & ~E_DEPRECATED);
ini_set('display_errors', 0);
ini_set('max_execution_time', 300);  // 5 minuten voor Claude API calls
ini_set('memory_limit', '256M');      // Genoeg voor grote HTML

require_once __DIR__ . '/../includes/session.php';
requireAuthAPI();

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

// ─── Mailchimp helpers ─────────────────────────────────────────────────────

function mc_request($method, $endpoint, $data = null) {
    $url = 'https://' . MAILCHIMP_DC . '.api.mailchimp.com/3.0' . $endpoint;

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => [
            'Authorization: Basic ' . base64_encode('anystring:' . MAILCHIMP_API_KEY),
            'Content-Type: application/json',
        ],
    ]);

    if ($data !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }

    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false || empty($response)) {
        throw new Exception('Mailchimp API request mislukt: ' . ($curlError ?: 'geen response'));
    }

    $result = json_decode($response, true);

    if (isset($result['status']) && is_int($result['status']) && $result['status'] >= 400) {
        throw new Exception('Mailchimp: ' . ($result['detail'] ?? $result['title'] ?? 'Unknown error'));
    }

    return $result;
}

// ─── Anthropic helper ──────────────────────────────────────────────────────

function claude_request($prompt) {
    $url = 'https://api.anthropic.com/v1/messages';

    $body = json_encode([
        'model' => 'claude-sonnet-4-6',
        'max_tokens' => 16000,
        'messages' => [
            ['role' => 'user', 'content' => $prompt]
        ]
    ]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 180,         // 3 minuten max
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_HTTPHEADER => [
            'x-api-key: ' . ANTHROPIC_API_KEY,
            'anthropic-version: 2023-06-01',
            'content-type: application/json',
        ],
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false || empty($response)) {
        throw new Exception('Anthropic API request mislukt: ' . ($curlError ?: 'geen response'));
    }

    $result = json_decode($response, true);

    if (isset($result['error'])) {
        throw new Exception('Claude: ' . ($result['error']['message'] ?? 'Unknown error'));
    }

    if (!isset($result['content'][0]['text'])) {
        throw new Exception('Onverwacht antwoord van Claude (HTTP ' . $httpCode . ')');
    }

    $text = $result['content'][0]['text'];

    // Strip markdown code blocks if Claude wraps the response
    $text = preg_replace('/^```(?:html)?\s*\n?/i', '', $text);
    $text = preg_replace('/\n?```\s*$/', '', $text);

    return trim($text);
}

// ─── Actions ───────────────────────────────────────────────────────────────

try {

    // === FETCH: Get latest NL campaign ===
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'fetch') {

        $params = http_build_query([
            'sort_field' => 'send_time',
            'sort_dir' => 'DESC',
            'count' => 20,
            'status' => 'sent',
            'list_id' => MAILCHIMP_LIST_ID,
        ]);

        $campaigns = mc_request('GET', '/campaigns?' . $params);

        $found = null;
        foreach ($campaigns['campaigns'] as $c) {
            $title = $c['settings']['title'] ?? '';
            if (strpos($title, 'NL') !== false && strpos($title, 'Nieuwsbrief') !== false) {
                $found = $c;
                break;
            }
        }

        if (!$found) {
            throw new Exception('Geen NL nieuwsbrief campagne gevonden');
        }

        // Get HTML content
        $content = mc_request('GET', '/campaigns/' . $found['id'] . '/content');
        $html = $content['html'] ?? '';

        // Extract number
        $number = null;
        if (preg_match('/#(\d+)/', $found['settings']['title'], $m)) {
            $number = (int)$m[1];
        }

        echo json_encode([
            'campaign_id' => $found['id'],
            'title' => $found['settings']['title'],
            'subject_line' => $found['settings']['subject_line'],
            'send_time' => substr($found['send_time'] ?? '', 0, 10),
            'next_number' => $number ? $number + 1 : null,
            'html' => $html,
        ]);
        exit;
    }

    // === UPLOAD: Handle file upload BEFORE JSON parsing (multipart form data) ===
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'upload') {
        requireCsrf();

        if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            $uploadErrors = [
                UPLOAD_ERR_INI_SIZE => 'Bestand te groot (server limiet)',
                UPLOAD_ERR_FORM_SIZE => 'Bestand te groot (formulier limiet)',
                UPLOAD_ERR_PARTIAL => 'Bestand maar gedeeltelijk geüpload',
                UPLOAD_ERR_NO_FILE => 'Geen bestand geselecteerd',
            ];
            $errCode = $_FILES['image']['error'] ?? UPLOAD_ERR_NO_FILE;
            throw new Exception($uploadErrors[$errCode] ?? 'Upload fout (code ' . $errCode . ')');
        }

        $file = $_FILES['image'];
        $maxSize = 10 * 1024 * 1024; // 10MB
        if ($file['size'] > $maxSize) {
            throw new Exception('Afbeelding is te groot (max 10MB)');
        }

        $allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        $mime = mime_content_type($file['tmp_name']);
        if (!in_array($mime, $allowed)) {
            throw new Exception('Ongeldig bestandstype. Gebruik JPG, PNG, GIF of WebP.');
        }

        $fileData = base64_encode(file_get_contents($file['tmp_name']));
        $fileName = 'newsletter_' . date('Ymd_His') . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $file['name']);

        $url = 'https://' . MAILCHIMP_DC . '.api.mailchimp.com/3.0/file-manager/files';

        $postData = json_encode([
            'name' => $fileName,
            'file_data' => $fileData,
        ]);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $postData,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_HTTPHEADER => [
                'Authorization: Basic ' . base64_encode('anystring:' . MAILCHIMP_API_KEY),
                'Content-Type: application/json',
            ],
        ]);

        $response = curl_exec($ch);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false || empty($response)) {
            throw new Exception('Upload naar Mailchimp mislukt: ' . ($curlError ?: 'geen response'));
        }

        $result = json_decode($response, true);

        if (isset($result['status']) && is_int($result['status']) && $result['status'] >= 400) {
            throw new Exception('Mailchimp: ' . ($result['detail'] ?? $result['title'] ?? 'Upload error'));
        }

        $imageUrl = $result['full_size_url'] ?? '';
        if (empty($imageUrl)) {
            throw new Exception('Geen URL ontvangen van Mailchimp');
        }

        echo json_encode([
            'url' => $imageUrl,
            'name' => $fileName,
            'size' => $file['size'],
        ]);
        exit;
    }

    // All other POST actions require CSRF + JSON body
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        requireCsrf();
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            throw new Exception('Ongeldige JSON input');
        }
    }

    // === Helper: Extract text segments from HTML ===
    // Returns array of unique text strings found in the HTML (visible content only)
    function extract_text_segments($html) {
        // Remove style, script, and head blocks first
        $clean = preg_replace('/<style[^>]*>.*?<\/style>/si', '', $html);
        $clean = preg_replace('/<script[^>]*>.*?<\/script>/si', '', $clean);
        $clean = preg_replace('/<head[^>]*>.*?<\/head>/si', '', $clean);

        // Find text content between HTML tags
        $segments = [];
        // Match text between > and < that contains actual words
        preg_match_all('/>[^<]{3,}</', $clean, $matches);
        foreach ($matches[0] as $m) {
            $text = trim(substr($m, 1, -1));
            // Skip if only whitespace, entities, or non-text content
            if (empty($text)) continue;
            if (preg_match('/^[\s\r\n&;#\d]*$/', $text)) continue;
            if (preg_match('/^\*\|/', $text)) continue; // Mailchimp merge tags
            if (strlen($text) < 3) continue;
            $segments[] = $text;
        }
        return array_values(array_unique($segments));
    }

    // === SPELLCHECK: Check Dutch spelling/grammar ===
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'spellcheck') {
        $html = $input['html'] ?? '';
        if (empty($html)) throw new Exception('Geen HTML ontvangen');

        $segments = extract_text_segments($html);

        if (empty($segments)) {
            echo json_encode(['html' => $html, 'corrections' => 0]);
            exit;
        }

        $textBlock = implode("\n---\n", $segments);

        $prompt = "Je bent een Nederlandse taalexpert. Hieronder staan teksten uit een nieuwsbrief.\n"
            . "Controleer op spelfouten, grammaticafouten en onnatuurlijke zinnen.\n\n"
            . "Geef je antwoord als JSON array met correcties. Alleen fouten!\n"
            . "Formaat: [{\"oud\": \"fout woord of zin\", \"nieuw\": \"correcte versie\"}]\n"
            . "Als er GEEN fouten zijn, antwoord dan met: []\n\n"
            . "Teksten:\n" . $textBlock;

        $response = claude_request($prompt);

        // Parse corrections JSON
        // Extract JSON array from response (Claude might add text around it)
        if (preg_match('/\[[\s\S]*\]/', $response, $jsonMatch)) {
            $corrections = json_decode($jsonMatch[0], true);
        } else {
            $corrections = [];
        }

        // Apply corrections to HTML
        $corrected = $html;
        $count = 0;
        if (is_array($corrections)) {
            foreach ($corrections as $c) {
                $old = $c['oud'] ?? '';
                $new = $c['nieuw'] ?? '';
                if (!empty($old) && !empty($new) && $old !== $new) {
                    $corrected = str_replace($old, $new, $corrected);
                    $count++;
                }
            }
        }

        echo json_encode(['html' => $corrected, 'corrections' => $count]);
        exit;
    }

    // === TRANSLATE: Translate Dutch to English ===
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'translate') {
        $html = $input['html'] ?? '';
        if (empty($html)) throw new Exception('Geen HTML ontvangen');

        $segments = extract_text_segments($html);

        if (empty($segments)) {
            echo json_encode(['html' => $html]);
            exit;
        }

        // Number each segment for reliable matching
        $numberedText = "";
        foreach ($segments as $i => $seg) {
            $numberedText .= "[" . ($i + 1) . "] " . $seg . "\n";
        }

        $prompt = "You are a professional Dutch-to-English translator for a BJJ gym newsletter.\n\n"
            . "Translate each numbered text segment below. Return ONLY a JSON array with the translations.\n"
            . "Format: [{\"nr\": 1, \"en\": \"English translation\"}, {\"nr\": 2, \"en\": \"...\"}]\n\n"
            . "Rules:\n"
            . "- Keep proper nouns unchanged (Haven BJJ, Rotterdam, people's names, etc.)\n"
            . "- Keep BJJ/martial arts terms that are commonly used in English\n"
            . "- Natural, fluent English\n"
            . "- Return ALL segments, even if no translation is needed\n\n"
            . "Segments:\n" . $numberedText;

        $response = claude_request($prompt);

        // Parse translations JSON
        if (preg_match('/\[[\s\S]*\]/', $response, $jsonMatch)) {
            $translations = json_decode($jsonMatch[0], true);
        } else {
            throw new Exception('Kon vertalingen niet parsen');
        }

        // Build lookup: nr → english text
        $lookup = [];
        if (is_array($translations)) {
            foreach ($translations as $t) {
                $nr = $t['nr'] ?? 0;
                $en = $t['en'] ?? '';
                if ($nr > 0 && !empty($en)) {
                    $lookup[$nr] = $en;
                }
            }
        }

        // Apply translations to HTML
        $translated = $html;
        foreach ($segments as $i => $seg) {
            $nr = $i + 1;
            if (isset($lookup[$nr]) && $lookup[$nr] !== $seg) {
                $translated = str_replace($seg, $lookup[$nr], $translated);
            }
        }

        echo json_encode(['html' => $translated]);
        exit;
    }

    // === CREATE: Create NL + EN campaigns in Mailchimp ===
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'create') {
        $number = $input['number'] ?? null;
        $subjectNl = $input['subject_nl'] ?? '';
        $subjectEn = $input['subject_en'] ?? '';
        $htmlNl = $input['html_nl'] ?? '';
        $htmlEn = $input['html_en'] ?? '';

        if (!$number || !$subjectNl || !$subjectEn || !$htmlNl || !$htmlEn) {
            throw new Exception('Niet alle velden zijn ingevuld');
        }

        // Create NL campaign
        $nlCampaign = mc_request('POST', '/campaigns', [
            'type' => 'regular',
            'recipients' => [
                'list_id' => MAILCHIMP_LIST_ID,
                'segment_opts' => [
                    'saved_segment_id' => MAILCHIMP_NL_SEGMENT_ID,
                    'match' => 'any',
                    'conditions' => [
                        ['condition_type' => 'Language', 'field' => 'language', 'op' => 'is', 'value' => 'nl'],
                        ['condition_type' => 'StaticSegment', 'field' => 'static_segment', 'op' => 'static_is', 'value' => MAILCHIMP_NL_TAG_ID],
                    ]
                ]
            ],
            'settings' => [
                'subject_line' => $subjectNl,
                'title' => 'Nieuwsbrief #' . $number . ' NL',
                'from_name' => NEWSLETTER_FROM_NAME,
                'reply_to' => NEWSLETTER_REPLY_TO,
            ]
        ]);

        $nlId = $nlCampaign['id'];
        $nlWebId = $nlCampaign['web_id'] ?? $nlId;

        // Set NL HTML content
        mc_request('PUT', '/campaigns/' . $nlId . '/content', [
            'html' => $htmlNl,
        ]);

        // Create EN campaign
        $enCampaign = mc_request('POST', '/campaigns', [
            'type' => 'regular',
            'recipients' => [
                'list_id' => MAILCHIMP_LIST_ID,
                'segment_opts' => [
                    'saved_segment_id' => MAILCHIMP_EN_SEGMENT_ID,
                    'match' => 'all',
                    'conditions' => [
                        ['condition_type' => 'Language', 'field' => 'language', 'op' => 'not', 'value' => 'nl'],
                        ['condition_type' => 'StaticSegment', 'field' => 'static_segment', 'op' => 'static_not', 'value' => MAILCHIMP_NL_TAG_ID],
                    ]
                ]
            ],
            'settings' => [
                'subject_line' => $subjectEn,
                'title' => 'Nieuwsbrief #' . $number . ' ENG',
                'from_name' => NEWSLETTER_FROM_NAME,
                'reply_to' => NEWSLETTER_REPLY_TO,
            ]
        ]);

        $enId = $enCampaign['id'];
        $enWebId = $enCampaign['web_id'] ?? $enId;

        // Set EN HTML content
        mc_request('PUT', '/campaigns/' . $enId . '/content', [
            'html' => $htmlEn,
        ]);

        echo json_encode([
            'nl_campaign_id' => $nlId,
            'en_campaign_id' => $enId,
            'nl_url' => 'https://us13.admin.mailchimp.com/campaigns/edit?id=' . $nlWebId,
            'en_url' => 'https://us13.admin.mailchimp.com/campaigns/edit?id=' . $enWebId,
        ]);
        exit;
    }

    // Unknown action
    http_response_code(400);
    echo json_encode(['error' => 'Onbekende actie: ' . $action]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
