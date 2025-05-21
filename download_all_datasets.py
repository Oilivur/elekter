import requests
import os
import json

# Create folders
os.makedirs('datasets', exist_ok=True)

# Step 1: Fetch dataset metadata
print("Fetching dataset metadata...")
api_url = "https://decision.cs.taltech.ee/electricity/api/"
response = requests.get(api_url)
metadata = response.json()

# Step 2: Save datasets.json locally
with open("datasets.json", "w", encoding="utf-8") as f:
    json.dump(metadata, f, ensure_ascii=False, indent=2)

# Step 3: Download each CSV
for entry in metadata:
    dataset_hash = entry['dataset']
    csv_url = f"https://decision.cs.taltech.ee/electricity/data/{dataset_hash}.csv"
    out_path = f"datasets/{dataset_hash}.csv"
    
    if os.path.exists(out_path):
        print(f"Already downloaded: {dataset_hash}")
        continue

    print(f"Downloading: {dataset_hash}...")
    r = requests.get(csv_url)
    if r.status_code == 200:
        with open(out_path, "wb") as f:
            f.write(r.content)
    else:
        print(f"Failed to download {dataset_hash}: {r.status_code}")

print("✅ Done. All files saved in 'datasets/' and metadata saved as 'datasets.json'.")
