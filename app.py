import os
import sys
import eel
from ytmusicapi import YTMusic
import yt_dlp
from mutagen.easyid3 import EasyID3

ytm = YTMusic()

# Dynamically target the absolute cross-platform path to the native system Music directory
MUSIC_BASE_DIR = os.path.join(os.path.expanduser('~'), 'Music')

def download_song(video_id, song_title, artist_name, album_title, track_num, folder_path):
    video_url = f"https://music.youtube.com/watch?v={video_id}"
    file_prefix = f"{track_num} - " if track_num else ""
    
    # Sanitize characters to preserve clean file layouts across platforms
    clean_title = "".join([c for c in song_title if c.isalpha() or c.isdigit() or c in ' -_()']).strip()
    file_name = f"{file_prefix}{clean_title}"
    output_template = os.path.join(folder_path, f"{file_name}.%(ext)s")
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': output_template,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'quiet': True
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_url])
            
        mp3_path = os.path.join(folder_path, f"{file_name}.mp3")
        if os.path.exists(mp3_path):
            audio = EasyID3(mp3_path)
            audio['title'] = song_title
            audio['artist'] = artist_name
            audio['album'] = album_title
            if track_num:
                audio['tracknumber'] = str(track_num)
            audio.save()
    except Exception as e:
        print(f"Error processing {song_title}: {e}")

@eel.expose
def download_queue_from_ui(url_list):
    """Exposed function loop triggered directly by JavaScript front end text submission"""
    for url in url_list:
        url = url.strip()
        if not url or "list=" not in url:
            continue
            
        playlist_id = url.split("list=")[1].split("&")[0]
        try:
            album_data = ytm.get_album(playlist_id)
            artist = album_data['artists'][0]['name']
            album = album_data['title']
            
            # Formulates the native destination subfolder pathway: ~/Music/Artist - Album/
            clean_folder_name = "".join([c for c in f"{artist} - {album}" if c.isalpha() or c.isdigit() or c in ' -_()']).strip()
            folder_path = os.path.join(MUSIC_BASE_DIR, clean_folder_name)
            os.makedirs(folder_path, exist_ok=True)
            
            for track in album_data['tracks']:
                download_song(track['videoId'], track['title'], artist, album, track.get('index'), folder_path)
        except Exception as e:
            print(f"Failed block download execution hook: {e}")
            
    return "✨ Queue fully downloaded to your Music folder!"

# Handle path switching when running compiled binaries vs raw scripts
if getattr(sys, 'frozen', False):
    application_path = os.path.join(sys._MEIPASS, 'web')
    eel.init(application_path)
else:
    eel.init('web')

eel.start('index.html', size=(600, 700))
