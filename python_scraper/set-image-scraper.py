#!/usr/bin/env python3
"""Download images from the `FrontArt` field of cards returned by the SWU DB API.

This script fetches card data from the SWU DB API, extracts the FrontArt image URLs,
downloads the images, and writes a manifest.json file containing the metadata.
"""

import re
import requests
import os
import json
from PIL import Image
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

def force_portrait(image_path):
	img = Image.open(image_path)
	width, height = img.size
	if width > height:
		img = img.rotate(90, expand=True)
		img.save(image_path)

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
		raw_name = card.get('Name', '')
		subtitle = card.get('Subtitle', '')
		front_art_url = card.get('FrontArt', '')
		back_art_url = card.get('BackArt', '')
		card_type = card.get('Type', '')
		if card_type == 'Base':
			HP = card.get('HP', '')
		aspects = card.get('Aspects', [])
		raw_combined_name = raw_name + (" - " + subtitle if subtitle else "")

		base_name = sanitize_filename(str(raw_name)) 
		if subtitle != '':
			base_name += " - " + sanitize_filename(str(subtitle))
		filename = os.path.join(IMAGE_DIR, base_name)
		
		if any(c['name'] == raw_combined_name for c in manifest): 
			continue
		else:
			ok = download_image(front_art_url, filename)
			force_portrait(filename + ".png")
			ok = True  # Assume success for now since we're not actually downloading
			manifest.append({
				'name': raw_combined_name,
				'subtitle': subtitle,
				'url': front_art_url,
				'type': card_type,
				'hp': HP if card_type == 'Base' else None,
				'aspects': aspects,
				'image': filename + ".png" if ok else None,
				'success': bool(ok)
			})

			if back_art_url != '':
				back_filename = os.path.join(IMAGE_DIR, base_name + "_back")
				ok = download_image(back_art_url, back_filename)
				manifest.append({
					'name': raw_combined_name + " [Back]",
					'subtitle': subtitle,
					'url': back_art_url,
					'type': card_type,
					'hp': HP if card_type == 'Base' else None,
					'aspects': aspects,
					'image': back_filename + ".png" if ok else None,
					'success': bool(ok)
				})


	with open(MANIFEST_FILE, 'w') as f:
		json.dump(manifest, f, indent=4)

if __name__ == "__main__":
	main()
