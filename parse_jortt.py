import csv, json, os, re
from datetime import date

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JORTT_DIR = os.path.join(BASE_DIR, 'jortt-exports')
DATA_JS = os.path.join(BASE_DIR, 'data.js')

# Base month = winst-en-verlies.csv (no number) = feb 2026
BASE_YEAR, BASE_MONTH = 2026, 2

# Short names for cost categories
COST_NAME_MAP = {
    'Onderhoudskosten bedrijfsmiddelen': 'Onderhoud',
    'Andere kosten': 'Andere kosten',
    'Huisvestingskosten': 'Huisvesting',
    'Auto- en transportkosten': 'Auto & transport',
    'Verkoopkosten': 'Verkoopkosten',
    'Uitbesteed werk': 'Uitbesteed werk',
    'Inkoop': 'Inkoop',
    'Afschrijvingen': 'Afschrijvingen',
    'Personeelskosten': 'Personeel',
    'Financiële kosten': 'Financieel',
}

def month_offset(n):
    y = BASE_YEAR
    m = BASE_MONTH - n
    while m <= 0:
        m += 12
        y -= 1
    return f"{y}-{m:02d}"

def parse_csv(filepath):
    rows = []
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        for row in reader:
            if not row or not row[0].strip():
                continue
            rows.append(row)

    result = {
        'revenue': 0, 'costs': 0, 'profit': 0, 'payroll': 0,
        'cost_categories': {}, 'revenue_categories': {}
    }

    section = None  # 'revenue' or 'costs'
    cost_group = None  # current level-0 cost group

    for row in rows:
        name = row[0].strip()
        # Find the value: rightmost non-empty cell
        val = None
        level = 0
        for i in range(len(row) - 1, 0, -1):
            cell = row[i].strip().strip('"')
            if cell:
                try:
                    val = float(cell.replace(',', '.'))
                    level = i
                except ValueError:
                    pass
                break

        if val is None:
            continue

        # Top-level totals
        if name == 'Opbrengsten':
            result['revenue'] = val
            section = 'revenue'
            continue
        if name == 'Kosten':
            result['costs'] = val
            section = 'costs'
            continue

        # Revenue sub-items (level 2+: specific revenue sources)
        if section == 'revenue' and level >= 3:
            result['revenue_categories'][name] = result['revenue_categories'].get(name, 0) + val

        # Revenue level 2 items that aren't parents (Omzet uit facturen)
        if section == 'revenue' and level == 2 and name == 'Omzet uit facturen':
            result['revenue_categories']['Facturen'] = val

        # Cost processing
        if section == 'costs':
            # Level 0 cost groups (value in col 1)
            if level == 1:
                cost_group = name
                # Some groups are leaf categories themselves
                if name in ('Afschrijvingen', 'Financiële kosten', 'Personeelskosten'):
                    short = COST_NAME_MAP.get(name, name)
                    result['cost_categories'][short] = val
                    if name == 'Personeelskosten':
                        result['payroll'] += val

            # Level 1 cost items (value in col 2)
            elif level == 2:
                short = COST_NAME_MAP.get(name, name)
                if name == 'Uitbesteed werk':
                    result['cost_categories'][short] = val
                    result['payroll'] += val
                elif cost_group in ('Overige kosten', 'Inkoopkosten'):
                    result['cost_categories'][short] = val

    result['profit'] = round(result['revenue'] - result['costs'], 2)
    result['payroll'] = round(result['payroll'], 2)
    return result

def main():
    # Parse all CSV files
    jortt_data = {}
    for fname in os.listdir(JORTT_DIR):
        if not fname.endswith('.csv'):
            continue
        match = re.search(r'\((\d+)\)', fname)
        n = int(match.group(1)) if match else 0
        ym = month_offset(n)
        filepath = os.path.join(JORTT_DIR, fname)
        jortt_data[ym] = parse_csv(filepath)
        print(f"  {fname} -> {ym}: omzet={jortt_data[ym]['revenue']}, kosten={jortt_data[ym]['costs']}, winst={jortt_data[ym]['profit']}, payroll={jortt_data[ym]['payroll']}")

    # Load existing data.js
    with open(DATA_JS, 'r') as f:
        content = f.read()
    # Strip everything before the opening {
    idx = content.index('{')
    js_str = content[idx:].rstrip().rstrip(';')
    data = json.loads(js_str)

    # Merge jortt data
    for ym, jd in sorted(jortt_data.items()):
        if ym in data:
            data[ym]['jortt'] = jd
        else:
            print(f"  Warning: {ym} not in DASHBOARD_DATA, skipping")

    # Write back
    with open(DATA_JS, 'w') as f:
        f.write('const DASHBOARD_DATA = ')
        f.write(json.dumps(data, indent=2, ensure_ascii=False))
        f.write(';\n')

    print(f"\nDone! Updated {len(jortt_data)} months with Jortt data.")

if __name__ == '__main__':
    main()
