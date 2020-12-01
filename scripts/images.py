#!/usr/bin/env python
"""
This script reads folders from a mounted drive, and tries to find the steam appids for the folders
Your python installation requires the packages defined in requirements-dev.txt

TODO: do something with found appids (rename folders if necessary)
"""

import os
import re
import sys
import time
import warnings
warnings.simplefilter('ignore')

import requests
from fuzzywuzzy import fuzz
from parsel import Selector


# default path to mounted drive if no arguments are used
DEFAULT_MOUNT_PATH = "/tmp/mnt/"
# non apk files to ignore
FOLDER_BLOCKLIST = [
    '.Trash-1000',
    'APK_packagenames.txt',
    'badgelist.txt',
    'GameList.txt',
]
# if the titles in the search results have a lower similarity (0-100) than this threshold ignore them
MIN_TITLE_THRESHOLD = 70

def parse_folder(folder):
    """Removes extra info from the folder name to make search more accurate"""
    replacement_patterns = [
        '-steam.*',
        '-oculus.*',
        '-versionCode.*',
        '-packageName.*',
        '-MP-.*',
        '-NA-.*',
        '-QuestUnderground.*',
        '-Q2.*',
        r'v(?:(\d+)\.?)?(?:(\d+)\.?)?(?:(\d+)\.?\d+)\S*', # version pattern
    ]

    for pattern in replacement_patterns:
        folder = re.sub(pattern,'',folder)
    return folder.strip()


def steam_search(search_term, sim_threshold=MIN_TITLE_THRESHOLD):
    """
    Finds the most similar steamp appid from a search term
    """
    resp = requests.get("https://store.steampowered.com/search/",
                        params={'term':search_term, 'vrsupport':1}
                       )
    sel = Selector(resp.text)
    results_titles = sel.xpath("//span[contains(@class, 'title')]/text()").extract()
    if not results_titles:
        print(f'NO SEARCH RESULTS FOR TERM {search_term}')
        return
    results_imgs = [img.extract() for img in sel.xpath("//div[contains(@class, 'search_capsule')]/img/@src")]
    results_titles_similarity = [fuzz.partial_ratio(search_term, title) for title in results_titles]
    most_similar_id = results_titles_similarity.index(max(results_titles_similarity))
    most_similar_title = results_titles[most_similar_id]
    most_similar_title_similarity = results_titles_similarity[most_similar_id]
    if most_similar_title_similarity < sim_threshold:
        print(f"NO VALID MATCH FOR TERM '{search_term}'")
        return
    most_similar_image = results_imgs[most_similar_id]
    appid = re.match(
        '.*/steam/\w+/(\d+)/.*jpg',
        most_similar_image).groups(0
    )[0]
    print(f"FOUND MATCH FOR TERM '{search_term}'->'{most_similar_title}', SIMILARITY:{most_similar_title_similarity} APPID:{appid}")
    return appid


def rename_folder(folder, mount_path, appid):
    renamed_folder = re.sub('-steam*','',folder) + f' -steam-{appid}'
    print(f'RENAMING {folder}-->{renamed_folder}')
    os.rename(f'{mount_path}{folder}', f'{mount_path}{renamed_folder}')


def main(mount_path):
    mount_folders = os.listdir(mount_path)

    for folder in mount_folders:
        time.sleep(1)
        if folder in FOLDER_BLOCKLIST:
            continue
        parsed_folder = parse_folder(folder)
        appid = steam_search(parsed_folder)
        if appid:
            rename_folder(folder, mount_path, appid)


if __name__=='__main__':
    import sys
    if len(sys.argv)>1:
        mount_path = sys.argv[1]
    else:
        mount_path = DEFAULT_MOUNT_PATH
    main(mount_path)
