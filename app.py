@eel.expose
def search_backend(query):
    """Searches YouTube music or safely accepts raw link formatting directly"""
    results_payload = []
    
    # CASE 1: Direct link processing bypass
    if "list=" in query:
        playlist_id = query.split("list=")[1].split("&")[0]
        if playlist_id.startswith("OLAK5uy_"):
            album_data = ytm.get_album(playlist_id)
            results_payload.append({
                "title": album_data['title'],
                "artist": album_data['artists'][0]['name'],
                "type": "ALBUM",
                "url": query,
                "thumbnail": album_data.get('thumbnails', [{}])[-1].get('url', '')
            })
        return results_payload

    # CASE 2: Text queries lookup
    search_results = ytm.search(query, filter="albums", limit=5)
    for entry in search_results:
        results_payload.append({
            "title": entry['title'],
            "artist": entry.get('artists', [{}])[0].get('name', 'Unknown'),
            "type": "ALBUM",
            "url": f"https://music.youtube.com/playlist?list={entry['browseId']}",
            "thumbnail": entry.get('thumbnails', [{}])[-1].get('url', '')
        })
        
    return results_payload
