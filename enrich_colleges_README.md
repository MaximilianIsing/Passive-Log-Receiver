# College Data Enrichment Script

This script uses the ChatGPT API to enrich college data from `us_universities.csv` with comprehensive information.

## Setup

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Ensure API key is available:**
   - The script reads from `gpt-key.txt` (same as your Node.js app)
   - Or set environment variable: `export GPT_API_KEY=your-key-here`

## Usage

Navigate to the data folder and run:

```bash
cd data
python enrich_colleges.py
```

Or from the project root:

```bash
python data/enrich_colleges.py
```

## Features

- ✅ **Resume capability**: Skips already processed colleges if output file exists
- ✅ **Rate limiting**: Respects API rate limits with configurable delays
- ✅ **Error handling**: Continues processing even if individual requests fail
- ✅ **Progress tracking**: Shows real-time progress and statistics
- ✅ **Auto-save**: Writes data immediately to prevent loss on interruption

## Configuration

Edit these variables at the top of `enrich_colleges.py`:

```python
CSV_INPUT = 'data/us_universities.csv'      # Input file
CSV_OUTPUT = 'data/us_universities_enriched.csv'  # Output file
BATCH_SIZE = 10                             # Requests per minute
DELAY_BETWEEN_REQUESTS = 6                  # Seconds between requests
```

## Output Format

The enriched CSV includes these columns:

- `name` - College name
- `url` - Website URL
- `city` - City name
- `state` - State abbreviation (2 letters)
- `type` - Public, Private, or Private For-Profit
- `size_category` - Small, Medium, or Large
- `acceptance_rate` - Decimal (0.0-1.0)
- `sat_50th_percentile` - Median SAT score
- `act_50th_percentile` - Median ACT score
- `tuition_in_state` - In-state tuition (dollars/year)
- `tuition_out_state` - Out-of-state tuition (dollars/year)
- `graduation_rate` - 4-year graduation rate (decimal)
- `enrollment` - Total enrollment
- `region` - Geographic region
- `popular_majors` - Comma-separated list of popular majors
- `median_earnings_10_years` - Post-graduation earnings
- `campus_setting` - Urban, Suburban, or Rural
- `ipeds_id` - IPEDS identifier if available

## Processing Time

- With 10 requests/minute: ~2076 colleges ≈ **3.5 hours**
- With 5 requests/minute: ~2076 colleges ≈ **7 hours**

You can adjust `DELAY_BETWEEN_REQUESTS` based on your API tier limits.

## Cost Estimation

- GPT-3.5-turbo: ~$0.001 per request ≈ **$2 for 2076 colleges** ✅ (Currently using)
- GPT-4: ~$0.03 per request ≈ **$62 for 2076 colleges**

The script is configured to use GPT-3.5-turbo by default for cost efficiency.

## Tips

1. **Run overnight**: Due to length, let it run overnight
2. **Monitor progress**: Check the output file periodically
3. **Resume**: If interrupted, just run again - it will skip processed colleges
4. **Rate limits**: If you hit rate limits, increase `DELAY_BETWEEN_REQUESTS`

## Next Steps

After enrichment:
1. Review the enriched CSV
2. Import into your Path Pal app
3. Update `js/api.js` to use the new data format

