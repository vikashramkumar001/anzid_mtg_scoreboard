#!/usr/bin/env python3
"""Download images from the `FrontArt` field of cards returned by the SWU DB API.

This script fetches card data from the SWU DB API, extracts the FrontArt image URLs,
downloads the images, and writes a manifest.json file containing the metadata.
"""

import re
import requests
import os
import json
from urllib.parse import urlparse

API_URL = "https://api.swu-db.com/cards/"
IMAGE_DIR = "images"
MANIFEST_FILE = "manifest.json"

def sanitize_filename(s: str) -> str:
	s = (s or "").strip()
	s = re.sub(r"\s+", "_", s)
	s = re.sub(r"[^A-Za-z0-9._-]", "", s)
	return s or "unnamed"


def unique_path(path: str) -> str:
	base, ext = os.path.splitext(path)
	candidate = path
	i = 1
	while os.path.exists(candidate):
		candidate = f"{base}-{i}{ext}"
		i += 1
	return candidate


def download_image(url: str, filename: str) -> bool:
	try:
		r = requests.get(url, timeout=20)
		r.raise_for_status()
	except Exception as e:
		print(f"Failed to download {url}: {e}")
		return False

	# Try to preserve extension from URL path
	parsed = urlparse(url)
	_, ext = os.path.splitext(parsed.path)
	if not ext:
		# fallback
		ext = ".jpg"

	if not filename.lower().endswith(ext.lower()):
		filename = filename + ext

	filename = unique_path(filename)
	with open(filename, "wb") as fh:
		fh.write(r.content)
	return True

def main():
	setname = input("Set acronym: ")
	response = requests.get(API_URL + setname)
	if response.status_code != 200:
		print("Failed to fetch data from API")
		return

	cards = response.json()['data']
	manifest = []
	IMAGE_DIR = setname
	MANIFEST_FILE = setname + '.json'

	if not os.path.exists(IMAGE_DIR):
		os.makedirs(IMAGE_DIR)

	for card in cards:
		front_art_url = card['FrontArt']
		raw_name = card['Name']

		base_name = sanitize_filename(str(raw_name))
		filename = os.path.join(IMAGE_DIR, base_name)

		ok = download_image(front_art_url, filename)
		manifest.append({
			'name': raw_name,
			'url': front_art_url,
			'type': card['Type'],
			'image': filename if ok else None,
			'success': bool(ok)
		})

	with open(MANIFEST_FILE, 'w') as f:
		json.dump(manifest, f, indent=4)

if __name__ == "__main__":
	main()
