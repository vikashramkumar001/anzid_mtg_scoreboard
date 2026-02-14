import json
import os
import re
from pathlib import Path

# Get the directory where this script is located
script_dir = Path(__file__).parent
transformed_dir = script_dir / 'transformed'

# Create output directory if it doesn't exist
transformed_dir.mkdir(parents=True, exist_ok=True)

# Find all 3-letter code JSON files
json_files = [f for f in os.listdir(script_dir) if f.endswith('.json') and len(f) == 8]  # e.g., "IBH.json"

for json_file in json_files:
    file_path = script_dir / json_file
    set_code = json_file.replace('.json', '')
    
    print(f"Processing {json_file}...")
    
    try:
        # Read the original JSON file
        with open(file_path, 'r', encoding='utf-8') as f:
            cards_array = json.load(f)
        
        # Transform to new structure
        cards_object = {}
        for card in cards_array:
            card_name = card.get('name', '')
            # Convert to lowercase, remove spaces and all punctuation, keep only alphanumeric
            card_key = re.sub(r'[^a-z0-9]', '', card_name.lower())
            
            # Only add if we haven't seen this card before (avoid duplicates)
            if card_key not in cards_object:
                cards_object[card_key] = {
                    'image': card.get('image', ''),
                    'name': card_name,  # Keep original name for reference,
                    'type': card.get('type', ''),
                    'hp': card.get('hp', None),  # Include HP if available
                    'aspects': card.get('aspects', [])  # Include aspects if available
                }
        
        # Write the transformed JSON
        output_file = transformed_dir / f'{set_code}.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(cards_object, f, indent=2, ensure_ascii=False)
        
        print(f"✓ Saved {len(cards_object)} unique cards to {output_file}")
        
    except Exception as e:
        print(f"✗ Error processing {json_file}: {e}")

print("\nDone! All set files have been transformed and saved to python_scraper/transformed/")
