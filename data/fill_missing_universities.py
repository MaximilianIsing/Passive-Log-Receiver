import csv
import os

BASE_PATH = os.path.join(os.path.dirname(__file__), "us_universities.csv")
ENRICHED_PATH = os.path.join(os.path.dirname(__file__), "us_universities_enriched.csv.csv")


def load_base_universities():
  """Load the simple name/url list from us_universities.csv."""
  with open(BASE_PATH, "r", encoding="utf-8", newline="") as f:
    reader = csv.reader(f)
    rows = list(reader)

  if not rows:
    return []

  # Detect and drop header if present
  if rows[0] and rows[0][0].strip().lower() == "name":
    rows = rows[1:]

  return rows


def load_enriched_universities():
  """Load the enriched CSV (which currently has no header row)."""
  if not os.path.exists(ENRICHED_PATH):
    return []

  with open(ENRICHED_PATH, "r", encoding="utf-8", newline="") as f:
    reader = csv.reader(f)
    rows = list(reader)

  return rows


def main():
  base_rows = load_base_universities()
  enriched_rows = load_enriched_universities()

  if not base_rows:
    print("No rows found in us_universities.csv – nothing to do.")
    return

  if not enriched_rows:
    print("No rows found in us_universities_enriched.csv.csv – nothing to merge into.")
    return

  # We assume the first column in enriched is the college name, just like base.
  existing_names = set()
  for row in enriched_rows:
    if not row:
      continue
    name = row[0].strip()
    if name:
      existing_names.add(name.lower())

  # Determine how many columns an enriched row has so we can pad new ones.
  enriched_cols = max(len(r) for r in enriched_rows if r)
  if enriched_cols < 2:
    print("Enriched CSV appears malformed (fewer than 2 columns). Aborting.")
    return

  missing_count = 0
  for base_row in base_rows:
    if not base_row:
      continue
    name = base_row[0].strip()
    url = base_row[1].strip() if len(base_row) > 1 else ""

    if not name:
      continue

    if name.lower() in existing_names:
      continue

    # Create a new enriched row using the known name and URL.
    # The rest of the columns are left blank for now.
    new_row = ["" for _ in range(enriched_cols)]
    new_row[0] = name
    new_row[1] = url

    enriched_rows.append(new_row)
    existing_names.add(name.lower())
    missing_count += 1

  # Write back the enriched file (still without header, to match current structure).
  with open(ENRICHED_PATH, "w", encoding="utf-8", newline="") as f:
    writer = csv.writer(f)
    writer.writerows(enriched_rows)

  print(f"Completed. Added {missing_count} missing universities from us_universities.csv into us_universities_enriched.csv.csv.")


if __name__ == "__main__":
  main()


