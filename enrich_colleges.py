import csv
import json
import time
import os
from openai import OpenAI
from typing import Dict, List, Optional

# Configuration
CSV_INPUT = 'us_universities.csv'
CSV_OUTPUT = 'us_universities_enriched.csv'
GPT_KEY_FILE = '../gpt-key.txt'  # One level up from data folder
BATCH_SIZE = 10  # Number of requests per minute (adjust based on rate limits)
DELAY_BETWEEN_REQUESTS = 6  # seconds between requests (60/10 = 6 for 10/min)

# Read API key
def get_api_key() -> str:
    """Read API key from file or environment variable"""
    if os.path.exists(GPT_KEY_FILE):
        with open(GPT_KEY_FILE, 'r') as f:
            return f.read().strip()
    return os.getenv('GPT_API_KEY', '')

# Initialize OpenAI client
api_key = get_api_key()
if not api_key:
    raise ValueError("API key not found. Please set GPT_API_KEY environment variable or ensure gpt-key.txt exists.")

client = OpenAI(api_key=api_key)

def get_college_data(college_name: str, url: str) -> Dict:
    """
    Use GPT API to get comprehensive data for a college.
    Returns a dictionary with college information.
    """
    prompt = f"""For the college "{college_name}" (website: {url}), provide the following information as JSON:
{{
    "name": "{college_name}",
    "city": "city name",
    "state": "state abbreviation (2 letters)",
    "type": "Public, Private, or Private For-Profit",
    "size_category": "Small, Medium, or Large (based on enrollment)",
    "acceptance_rate": 0.0 to 1.0 (as decimal, null if unknown),
    "sat_50th_percentile": integer or null,
    "act_50th_percentile": integer or null,
    "tuition_in_state": integer dollars per year or null,
    "tuition_out_state": integer dollars per year or null,
    "graduation_rate": 0.0 to 1.0 (as decimal) or null,
    "enrollment": integer or null,
    "region": "Northeast, Southeast, Midwest, Southwest, or West",
    "popular_majors": ["major1", "major2", "major3"] or null,
    "median_earnings_10_years": integer dollars or null,
    "campus_setting": "Urban, Suburban, or Rural" or null,
    "ipeds_id": "IPEDS ID if known" or null
}}

Return ONLY valid JSON, no additional text or explanation."""

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that provides accurate college information in JSON format. Always return valid JSON only."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,  # Lower temperature for more consistent/factual responses
            max_tokens=1000
        )
        
        content = response.choices[0].message.content.strip()
        
        # Try to extract JSON from response (in case GPT adds explanation)
        if content.startswith('```json'):
            content = content[7:]
        if content.startswith('```'):
            content = content[3:]
        if content.endswith('```'):
            content = content[:-3]
        content = content.strip()
        
        # Parse JSON
        data = json.loads(content)
        
        # Add original URL
        data['url'] = url
        
        return data
        
    except json.JSONDecodeError as e:
        print(f"  ⚠️  JSON decode error for {college_name}: {e}")
        print(f"  Response was: {content[:200]}")
        return None
    except Exception as e:
        print(f"  ❌ Error fetching data for {college_name}: {e}")
        return None

def read_existing_progress() -> set:
    """Read already processed colleges from output file"""
    processed = set()
    if os.path.exists(CSV_OUTPUT):
        try:
            with open(CSV_OUTPUT, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    processed.add(row['name'].lower().strip())
        except Exception as e:
            print(f"Warning: Could not read existing progress: {e}")
    return processed

def main():
    """Main function to process all colleges"""
    print("🚀 Starting college data enrichment...")
    print(f"📁 Reading from: {CSV_INPUT}")
    print(f"💾 Writing to: {CSV_OUTPUT}")
    print()
    
    # Read existing progress
    processed = read_existing_progress()
    print(f"✅ Already processed: {len(processed)} colleges")
    print()
    
    # Read input CSV
    colleges = []
    with open(CSV_INPUT, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            colleges.append({
                'name': row['name'].strip(),
                'url': row['url'].strip()
            })
    
    print(f"📊 Total colleges to process: {len(colleges)}")
    print(f"🔄 Remaining: {len(colleges) - len(processed)}")
    print()
    
    # Determine output columns
    output_columns = [
        'name', 'url', 'city', 'state', 'type', 'size_category', 
        'acceptance_rate', 'sat_50th_percentile', 'act_50th_percentile',
        'tuition_in_state', 'tuition_out_state', 'graduation_rate',
        'enrollment', 'region', 'popular_majors', 'median_earnings_10_years',
        'campus_setting', 'ipeds_id'
    ]
    
    # Open output file
    file_exists = os.path.exists(CSV_OUTPUT)
    mode = 'a' if file_exists else 'w'
    
    with open(CSV_OUTPUT, mode, newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=output_columns, extrasaction='ignore')
        
        # Write header if new file
        if not file_exists:
            writer.writeheader()
        
        # Process each college
        success_count = 0
        error_count = 0
        skipped_count = 0
        
        for i, college in enumerate(colleges, 1):
            college_name = college['name']
            college_key = college_name.lower().strip()
            
            # Skip if already processed
            if college_key in processed:
                skipped_count += 1
                continue
            
            print(f"[{i}/{len(colleges)}] Processing: {college_name}")
            
            # Get data from GPT
            data = get_college_data(college['name'], college['url'])
            
            if data:
                # Convert popular_majors list to string if needed
                if 'popular_majors' in data and isinstance(data['popular_majors'], list):
                    data['popular_majors'] = ', '.join(data['popular_majors']) if data['popular_majors'] else ''
                
                # Write to CSV
                writer.writerow(data)
                f.flush()  # Ensure data is written immediately
                success_count += 1
                print(f"  ✅ Success")
            else:
                error_count += 1
                print(f"  ❌ Failed")
            
            # Rate limiting
            if i < len(colleges):
                time.sleep(DELAY_BETWEEN_REQUESTS)
            
            # Progress update every 10 colleges
            if i % 10 == 0:
                print()
                print(f"📊 Progress: {i}/{len(colleges)}")
                print(f"   ✅ Success: {success_count}")
                print(f"   ❌ Errors: {error_count}")
                print(f"   ⏭️  Skipped: {skipped_count}")
                print()
    
    print()
    print("=" * 50)
    print("✨ Processing Complete!")
    print(f"   ✅ Success: {success_count}")
    print(f"   ❌ Errors: {error_count}")
    print(f"   ⏭️  Skipped: {skipped_count}")
    print(f"   📁 Output saved to: {CSV_OUTPUT}")
    print("=" * 50)

if __name__ == '__main__':
    main()

